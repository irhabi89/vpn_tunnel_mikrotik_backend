const express = require("express");
const router = express.Router();
const vpnController = require("../controllers/vpnController");
const authenticate = require("../middleware/auth");

// Semua route di bawah ini butuh token
router.use(authenticate);

router.get("/", vpnController.getVPNs);
router.post("/", vpnController.addVPN);
router.put("/:id", vpnController.updateVPN);
router.delete("/:id", vpnController.deleteVPN);
router.get("/server-status", vpnController.getVPNServerStatus);

module.exports = router;
