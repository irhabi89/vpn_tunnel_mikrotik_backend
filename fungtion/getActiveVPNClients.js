const fs = require("fs");

// TAMBAHKAN `async` DI SINI
module.exports = async function getActiveVPNClients() {
  console.log("====================================================");
  console.log("[VPN ACTIVE 🚀] Starting parse /run/openvpn/server.status");
  console.log("====================================================");

  const filePath = "/run/openvpn/server.status";

  // Langkah 1: Cek keberadaan dan izin file
  try {
    console.log("[DEBUG] Checking access to:", filePath);
    fs.accessSync(filePath, fs.constants.R_OK);
    console.log("[DEBUG] Status file found and is readable.");
  } catch (accessErr) {
    console.error("[ERROR] Cannot access status file:", accessErr.code);
    switch (accessErr.code) {
      case 'ENOENT':
        console.error("[ERROR] Reason: File does not exist.");
        break;
      case 'EACCES':
        console.error("[ERROR] Reason: Permission denied. The process cannot read the file.");
        break;
      default:
        console.error("[ERROR] Reason: Unknown access error.");
    }
    return [];
  }

  // ... sisanya kode Anda tetap sama ...
  // Langkah 2: Baca file SEKALI saja
  let rawContent;
  try {
    rawContent = fs.readFileSync(filePath, 'utf8');
    console.log("[DEBUG] File read successfully. Size:", rawContent.length, "characters.");
  } catch (readErr) {
    console.error("[ERROR] FAILED TO READ FILE:", readErr);
    return [];
  }

  // Langkah 3: Tampilkan preview data mentah untuk debugging
  console.log("[DEBUG] RAW CONTENT PREVIEW (first 400 chars):");
  console.log(rawContent.substring(0, 400));
  console.log("----------------------------------------------------");

  // ... dan seterusnya hingga akhir ...
  const lines = rawContent.split('\n');
  console.log(`[DEBUG] Split into ${lines.length} lines.`);

  const clients = [];
  const routing = [];

  let inClientList = false;
  let inRoutingTable = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("Common Name")) {
      console.log("[DEBUG] -> Entering CLIENT LIST section.");
      inClientList = true;
      inRoutingTable = false;
      continue;
    }
    if (trimmedLine.startsWith("ROUTING TABLE")) {
      console.log("[DEBUG] -> Entering ROUTING TABLE section.");
      inClientList = false;
      inRoutingTable = true;
      continue;
    }
    if (trimmedLine.startsWith("GLOBAL STATS")) {
      console.log("[DEBUG] -> End of relevant data.");
      break;
    }

    if (inClientList && trimmedLine && !trimmedLine.startsWith("Common Name")) {
        const parts = trimmedLine.split(',');
    
        if (parts.length >= 5) {
            const username = parts[0];
    
            // ❗ LEWATI USERNAME UNDEF
            if (username === "UNDEF") {
                console.log("[DEBUG] Skipping UNDEF entry.");
                continue;
            }
    
            const client = {
                username,
                real_ip: parts[1],
                bytes_received: parts[2],
                bytes_sent: parts[3],
                connected_since: parts[4],
            };
            clients.push(client);
        }
    }


    if (inRoutingTable && trimmedLine && !trimmedLine.startsWith("Virtual Address")) {
      const parts = trimmedLine.split(',');
      if (parts.length >= 2) {
        const route = {
          virtual_ip: parts[0],
          username: parts[1],
        };
        routing.push(route);
        console.log(`[DEBUG]    Parsed Route: ${route.username} -> ${route.virtual_ip}`);
      }
    }
  }

  console.log(`[DEBUG] Parsing complete. Found ${clients.length} clients and ${routing.length} routes.`);

  const finalResult = clients.map(client => {
    const route = routing.find(r => r.username === client.username);
    return {
      ...client,
      virtual_ip: route ? route.virtual_ip : null,
    };
  });

  console.log("[DEBUG] FINAL MERGED RESULT:", finalResult);
  console.log("====================================================");

 return {
  active: finalResult.length,
  data: finalResult
};
};