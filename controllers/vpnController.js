const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { exec, execSync } = require("child_process");

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

// Utility: baca active VPN dari OpenVPN status
const getActiveVPNs = () => {
  const statusPath = "/run/openvpn/server.status";
  if (!fs.existsSync(statusPath)) return [];
  const lines = fs.readFileSync(statusPath, "utf8").split("\n");
  const active = [];
  lines.forEach((line) => {
    if (line.startsWith("CLIENT_LIST")) {
      const parts = line.split("\t");
      active.push({
        username: parts[1],
        vpn_ip: parts[2],
        real_ip: parts[3],
        connected_since: parts[7]
      });
    }
  });
  return active;
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
    const activeVPNs = getActiveVPNs();

    const data = rows.map((vpn) => {
      const active = activeVPNs.find((a) => a.username === vpn.username);
      return {
        ...vpn,
        active: !!active,
        real_ip: active?.real_ip || null
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== ADD VPN =====
const addVPN = async (req, res) => {
  try {
    const {
      user_id,
      name,
      username,
      password,
      subdomain,
      public_port,
      private_port,
      vpn_ip
    } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO tunnels
      (user_id, name, username, password, subdomain, public_port, private_port, vpn_ip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    const [result] = await pool.query(sql, [
      user_id,
      name,
      username,
      hash,
      subdomain,
      public_port,
      private_port,
      vpn_ip
    ]);

    // Buat CCD file
    createCCDFile(username, vpn_ip);

    // Forward port otomatis
    exec(
      `/etc/openvpn/scripts/add_vpn_forward.sh ${public_port} ${vpn_ip} ${private_port}`,
      (err) => {
        if (err) console.error("Forward port error:", err);
      }
    );

    res.json({ message: "VPN remote added", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== UPDATE VPN =====
const updateVPN = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      password,
      subdomain,
      public_port,
      private_port,
      vpn_ip,
      status
    } = req.body;

    const [rows] = await pool.query("SELECT * FROM tunnels WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ error: "VPN not found" });
    const oldVPN = rows[0];

    const params = [];
    let sql = "UPDATE tunnels SET ";

    if (name) {
      sql += "name=?, ";
      params.push(name);
    }
    if (username) {
      sql += "username=?, ";
      params.push(username);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sql += "password=?, ";
      params.push(hash);
    }
    if (subdomain) {
      sql += "subdomain=?, ";
      params.push(subdomain);
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

    sql = sql.slice(0, -2);
    sql += " WHERE id=?";
    params.push(id);

    await pool.query(sql, params);

    // Jika ada perubahan username atau vpn_ip, update CCD
    if (username || vpn_ip) {
      removeCCDFile(oldVPN.username);
      createCCDFile(username || oldVPN.username, vpn_ip || oldVPN.vpn_ip);
    }

    // Update forward port jika ada perubahan
    if (public_port || private_port || vpn_ip) {
      exec(
        `/etc/openvpn/scripts/remove_vpn_forward.sh ${oldVPN.public_port} ${oldVPN.vpn_ip} ${oldVPN.private_port}`,
        (err) => {
          if (err) console.error("Remove forward error:", err);
        }
      );
      exec(
        `/etc/openvpn/scripts/add_vpn_forward.sh ${
          public_port || oldVPN.public_port
        } ${vpn_ip || oldVPN.vpn_ip} ${private_port || oldVPN.private_port}`,
        (err) => {
          if (err) console.error("Add forward error:", err);
        }
      );
    }

    res.json({ message: "VPN remote updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== DELETE VPN =====
const deleteVPN = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM tunnels WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ error: "VPN not found" });
    const vpn = rows[0];

    // Hapus CCD file
    removeCCDFile(vpn.username);

    // Hapus forward port
    exec(
      `/etc/openvpn/scripts/remove_vpn_forward.sh ${vpn.public_port} ${vpn.vpn_ip} ${vpn.private_port}`,
      (err) => {
        if (err) console.error("Remove forward port error:", err);
      }
    );

    await pool.query("DELETE FROM tunnels WHERE id=?", [id]);
    res.json({ message: "VPN remote deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== VPN SERVER STATUS =====
const getVPNServerStatus = (req, res) => {
  try {
    const status = execSync("systemctl is-active openvpn@server")
      .toString()
      .trim();
    const clients = getActiveVPNs().length;
    res.json({ status, clients });
  } catch (err) {
    res.json({ status: "inactive", clients: 0 });
  }
};

module.exports = { getVPNs, addVPN, updateVPN, deleteVPN, getVPNServerStatus };
