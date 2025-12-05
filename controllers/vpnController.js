const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { exec, execSync } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const getActiveVPNClients = require("../fungtion/getActiveVPNClients");
const Log = require("../models/Log");

const net = require("net");

// Cek apakah port sedang digunakan
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") resolve(false); // port dipakai
        else resolve(false); // error lain, dianggap tidak tersedia
      })
      .once("listening", () => {
        tester.close();
        resolve(true); // port tersedia
      })
      .listen(port, "0.0.0.0");
  });
};

// Generate public port unik
const generatePublicPort = async () => {
  const min = 15000;
  const max = 16000;

  const [rows] = await pool.query("SELECT public_port FROM tunnels");
  const usedPorts = rows.map((r) => r.public_port);

  const availablePorts = [];
  for (let i = min; i <= max; i++) {
    if (!usedPorts.includes(i)) {
      const available = await isPortAvailable(i);
      if (available) availablePorts.push(i);
    }
  }

  if (availablePorts.length === 0) throw new Error("No available ports");

  const randomIndex = Math.floor(Math.random() * availablePorts.length);
  return availablePorts[randomIndex];
};

// CCD helper
const createCCDFile = (username, vpn_ip) => {
  const ccdDir = "/etc/openvpn/ccd";
  if (!fs.existsSync(ccdDir)) fs.mkdirSync(ccdDir);

  const filePath = path.join(ccdDir, username);
  const content = `ifconfig-push ${vpn_ip} ${getPeerIP(vpn_ip)}`;
  fs.writeFileSync(filePath, content);
};

const removeCCDFile = (username) => {
  const filePath = path.join("/etc/openvpn/ccd", username);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const getPeerIP = (vpn_ip) => {
  const parts = vpn_ip.split(".");
  parts[3] = (parseInt(parts[3]) - 1).toString();
  return parts.join(".");
};

const getVPNs = async (req, res) => {
  try {
    const { role, id: userId } = req.user; // id = user_id, role = admin/user
    let sql = "SELECT * FROM tunnels";
    const params = [];

    // Jika bukan admin, filter berdasarkan user_id
    if (role !== "admin") {
      sql += " WHERE user_id = ?";
      params.push(userId);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);

    // Ambil daftar active VPN
    const activeVPNs = await getActiveVPNs();

    const data = rows.map((vpn) => {
      return {
        ...vpn
      };
    });

    res.json(data);
  } catch (err) {
    console.error("[GET VPNs] Error:", err); // Tambahkan log untuk melihat errornya
    res.status(500).json({ error: err.message });
  }
};

// ===== VPN SERVER STATUS (VERSI DITINGKATKAN) =====
const getVPNServerStatus = async (req, res) => {
  // === BOM DEBUG ===
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("!!! getVPNServerStatus FUNCTION CALLED !!!");
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  // ===================

  try {
    console.log("[VPN STATUS] Checking OpenVPN server status via systemctl...");

    const { stdout } = await execPromise(
      "systemctl is-active openvpn@server.service"
    );

    const status = stdout.trim();

    // === BOM DEBUG ===
    console.log("--- About to call getActiveVPNs ---");
    // ===================
    // res.json({ status, clients });
    res.json({ status });
  } catch (err) {
    console.error("[VPN STATUS] Error checking OpenVPN status:", err.message);
    res.json({ status: "inactive", clients: 0 });
  }
};

// Generate VPN IP dari subnet 10.30.0.0/24 yang belum dipakai
const generateVPNIP = async () => {
  const subnet = "10.30.0.";
  const [rows] = await pool.query("SELECT vpn_ip FROM tunnels");
  const usedIPs = new Set(rows.map((r) => r.vpn_ip));

  for (let i = 2; i < 255; i++) {
    const ip = subnet + i;
    if (!usedIPs.has(ip)) return ip;
  }

  throw new Error("No available VPN IPs");
};

const runScript = (command, description) => {
  exec(command, (err, stdout, stderr) => {
    console.log(`[SCRIPT] ${description}`);
    console.log(`[SCRIPT] Command: ${command}`);

    if (err) {
      console.error(`[SCRIPT] ERROR:`, err);
    }
    if (stdout) console.log(`[SCRIPT] STDOUT:\n${stdout}`);
    if (stderr) console.error(`[SCRIPT] STDERR:\n${stderr}`);
  });
};

// ===== ADD VPN =====
const addVPN = async (req, res) => {
  try {
    console.log("[ADD VPN] Request body:", req.body);
    // Ambil user_id dari token
    const user_id = req.user.id;
    console.log("[ADD VPN] user_id from token:", user_id);

    const { username, password, private_port } = req.body;

    // Generate public port otomatis yang unik dan tersedia
    const public_port = await generatePublicPort();
    console.log("[ADD VPN] Generated public_port:", public_port);

    // Generate VPN IP otomatis yang tersedia
    const vpn_ip = await generateVPNIP();
    console.log("[ADD VPN] Generated VPN IP:", vpn_ip);

    // Insert ke database
    const sql = `
      INSERT INTO tunnels
      (user_id, username, password, public_port, private_port, vpn_ip, status)
      VALUES ( ?, ?, ?, ?, ?, ?, 'active')
    `;
    const [result] = await pool.query(sql, [
      user_id,
      username,
      password,
      public_port,
      private_port,
      vpn_ip
    ]);
    console.log("[ADD VPN] Database insert result:", result);

    // Buat CCD file
    createCCDFile(username, vpn_ip);
    console.log("[ADD VPN] CCD file created for:", username);

    // Forward port otomatis
    console.log("[🚀] runScript");
    runScript(
      `sudo /www/wwwroot/docker/vpnremot/backend/service/add_vpn_forward.sh ${public_port} ${vpn_ip} ${private_port}`,
      `Add VPN forward for ${username}`
    );

    // -------------- LOG --------------
    await Log.write({
      user_id,
      action: "create",
      target_table: "tunnels",
      target_id: result.insertId,
      message: `Created VPN: ${username}, IP: ${vpn_ip}, public port: ${public_port}`
    });

    res.json({ message: "VPN remote added", id: result.insertId, public_port });
  } catch (err) {
    console.error("[ADD VPN] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===== UPDATE VPN =====
const updateVPN = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[UPDATE VPN] VPN ID:", id);
    const { username, password, public_port, private_port, vpn_ip, status } =
      req.body;

    const [rows] = await pool.query("SELECT * FROM tunnels WHERE id=?", [id]);
    if (!rows.length) {
      console.log("[UPDATE VPN] VPN not found");
      return res.status(404).json({ error: "VPN not found" });
    }
    const oldVPN = rows[0];
    console.log("[UPDATE VPN] Old VPN data:", oldVPN);

    const params = [];
    let sql = "UPDATE tunnels SET ";

    if (username) {
      sql += "username=?, ";
      params.push(username);
    }
    if (password) {
      sql += "password=?, ";
      params.push(password);
    }
    if (public_port) {
      sql += "public_port=?, ";
      params.push(public_port);
    }
    if (private_port) {
      sql += "private_port=?, ";
      params.push(private_port);
    }
    if (vpn_ip) {
      sql += "vpn_ip=?, ";
      params.push(vpn_ip);
    }
    if (status) {
      sql += "status=?, ";
      params.push(status);
    }

    sql = sql.slice(0, -2) + " WHERE id=?";
    params.push(id);

    await pool.query(sql, params);
    console.log("[UPDATE VPN] VPN updated successfully");

    // Jika ada perubahan username atau vpn_ip, update CCD
    if (username || vpn_ip) {
      removeCCDFile(oldVPN.username);
      createCCDFile(username || oldVPN.username, vpn_ip || oldVPN.vpn_ip);
      console.log("[UPDATE VPN] CCD file updated");
    }

    // Update forward port jika ada perubahan
    if (public_port || private_port || vpn_ip) {
      runScript(
        `sudo /www/wwwroot/docker/vpnremot/backend/service/remove_vpn_forward.sh ${oldVPN.public_port} ${oldVPN.vpn_ip} ${oldVPN.private_port}`,
        `Remove old VPN forward for ${oldVPN.username}`
      );

      runScript(
        `sudo /www/wwwroot/docker/vpnremot/backend/service/add_vpn_forward.sh ${
          public_port || oldVPN.public_port
        } ${vpn_ip || oldVPN.vpn_ip} ${private_port || oldVPN.private_port}`,
        `Add new VPN forward for ${username || oldVPN.username}`
      );
    }

    await Log.write({
      user_id: req.user.id,
      action: "update",
      target_table: "tunnels",
      target_id: id,
      message: `Updated VPN ${oldVPN.username}. Changed fields: ${Object.keys(
        req.body
      ).join(", ")}`
    });

    res.json({ message: "VPN remote updated" });
  } catch (err) {
    console.error("[UPDATE VPN] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===== DELETE VPN =====
const deleteVPN = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: tokenUserId, role } = req.user; // dari token
    console.log(
      "[DELETE VPN] VPN ID:",
      id,
      "User:",
      tokenUserId,
      "Role:",
      role
    );

    const [rows] = await pool.query("SELECT * FROM tunnels WHERE id=?", [id]);
    if (!rows.length) {
      console.log("[DELETE VPN] VPN not found");
      return res.status(404).json({ error: "VPN not found" });
    }
    const vpn = rows[0];

    // Validasi user
    if (vpn.user_id !== tokenUserId && role !== "admin") {
      console.log(
        "[DELETE VPN] Unauthorized delete attempt by user:",
        tokenUserId
      );
      return res.status(403).json({ error: "Unauthorized to delete this VPN" });
    }

    console.log("[DELETE VPN] VPN data:", vpn);

    // 1️⃣ Hapus CCD file
    removeCCDFile(vpn.username);
    console.log("[DELETE VPN] CCD file removed");

    // 2️⃣ Hapus port forwarding
    runScript(
      `sudo /www/wwwroot/docker/vpnremot/backend/service/remove_vpn_forward.sh ${vpn.public_port} ${vpn.vpn_ip} ${vpn.private_port}`,
      `Remove VPN forward for ${vpn.username}`
    );

    // 3️⃣ Putus koneksi OpenVPN client jika masih aktif
    try {
      const clientList = execSync(
        "cat /run/openvpn/server.status | grep CLIENT_LIST"
      )
        .toString()
        .split("\n");
      clientList.forEach((line) => {
        if (!line) return;
        const parts = line.split("\t");
        const username = parts[1];
        if (username === vpn.username) {
          console.log(`[DELETE VPN] Disconnecting client: ${username}`);
          execSync(
            `sudo /www/wwwroot/docker/vpnremot/backend/service/disconnect_client.sh ${username}`
          );
        }
      });
    } catch (err) {
      console.log(
        "[DELETE VPN] No active client to disconnect or error:",
        err.message
      );
    }

    // 4️⃣ Hapus record dari database
    await pool.query("DELETE FROM tunnels WHERE id=?", [id]);
    console.log("[DELETE VPN] VPN deleted from database");

    await Log.write({
      user_id: tokenUserId,
      action: "delete",
      target_table: "tunnels",
      target_id: id,
      message: `Deleted VPN ${vpn.username}, IP: ${vpn.vpn_ip}, public_port: ${vpn.public_port}`
    });

    res.json({ message: "VPN remote deleted cleanly" });
  } catch (err) {
    console.error("[DELETE VPN] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const listActiveVPNClients = async (req, res) => {
  try {
    const clients = await getActiveVPNClients();
    res.json({ clients: clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getVPNs,
  addVPN,
  updateVPN,
  deleteVPN,
  getVPNServerStatus,
  listActiveVPNClients
};
