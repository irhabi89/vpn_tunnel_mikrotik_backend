const bcrypt = require("bcryptjs");
const User = require("../models/User"); // model kamu

module.exports = {

  // ============================================================
  // 1. GET ALL USERS (Admin Only)
  // ============================================================
  async getUsers(req, res) {
    try {
      const users = await User.getAllUsers();

      return res.json({
        status: true,
        data: users
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to get users",
        error: err.message
      });
    }
  },

  // ============================================================
  // 2. ADD USER (Admin Only)
  // ============================================================
  async addUser(req, res) {
    try {
      const { username, password } = req.body;

      // Simple validation
      if (!username || !password) {
        return res.status(400).json({
          status: false,
          message: "Username and password are required"
        });
      }

      // Cek apakah username sudah ada
      const exists = await User.findByUsername(username);
      if (exists) {
        return res.status(400).json({
          status: false,
          message: "Username already exists"
        });
      }

      const hashed = await bcrypt.hash(password, 10);

      const newId = await User.createUser({
        username,
        password: hashed,
        role: "user"
      });

      return res.json({
        status: true,
        message: "User added successfully",
        user_id: newId
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to add user",
        error: err.message
      });
    }
  },

  // ============================================================
  // 3. DELETE USER (Admin Only)
  // ============================================================
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const deleted = await User.deleteUser(id);

      if (!deleted) {
        return res.status(404).json({
          status: false,
          message: "User not found or could not be deleted"
        });
      }

      return res.json({
        status: true,
        message: "User deleted successfully"
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to delete user",
        error: err.message
      });
    }
  }

};
