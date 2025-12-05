const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authenticate = require("../middleware/auth");

// Semua route butuh login
router.use(authenticate);

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);
router.put("/change-password", profileController.changePassword);

module.exports = router;
