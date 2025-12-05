const express = require("express");
const router = express.Router();
const vpnController = require("../controllers/vpnController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

// Semua route di bawah ini butuh token
router.use(authenticate);

router.get("/", vpnController.getVPNs);
router.post("/", vpnController.addVPN);
router.put("/:id", vpnController.updateVPN);
router.delete("/:id", vpnController.deleteVPN);
router.get("/server-status", vpnController.getVPNServerStatus);

// Hanya route ini yang butuh admin
router.get("/clients", authorize("admin"),vpnController.listActiveVPNClients);

module.exports = router;
