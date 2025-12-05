const express = require("express");
const router = express.Router();
const {
  getUsers,
  addUser,
  deleteUser
} = require("../controllers/userController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

// Semua route di bawah ini butuh token
router.use(authenticate);

// Hanya admin yang bisa akses route ini

router.use(authorize("admin"));

router.get("/", getUsers);
router.post("/add", addUser);
router.delete("/:id", deleteUser);

module.exports = router;
