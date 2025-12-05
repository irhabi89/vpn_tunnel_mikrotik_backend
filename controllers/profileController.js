const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = {
  // ============================================================
  // 1. GET PROFILE
  // ============================================================
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hilangkan password
      delete user.password;

      return res.json({
        status: true,
        message: "Profile loaded",
        data: user,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to load profile",
        error: err.message,
      });
    }
  },

  // ============================================================
  // 2. UPDATE PROFILE
  // ============================================================
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          status: false,
          message: "Username is required",
        });
      }
      
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
          return res.status(400).json({ message: "Invalid username format" });
        }

      const updated = await User.updateProfile(userId, { username });

      if (!updated) {
        return res.status(400).json({
          status: false,
          message: "Failed to update profile",
        });
      }

      const newData = await User.findById(userId);
      delete newData.password;

      return res.json({
        status: true,
        message: "Profile updated successfully",
        data: newData,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to update profile",
        error: err.message,
      });
    }
  },

  // ============================================================
  // 3. CHANGE PASSWORD
  // ============================================================
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({
          status: false,
          message: "Old password & new password are required",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cek password lama
      const match = await bcrypt.compare(old_password, user.password);
      if (!match) {
        return res.status(400).json({
          status: false,
          message: "Old password is incorrect",
        });
      }

      // Hash password baru
      const hashed = await bcrypt.hash(new_password, 10);

      const updated = await User.updatePassword(userId, hashed);

      if (!updated) {
        return res.status(400).json({
          status: false,
          message: "Failed to update password",
        });
      }

      return res.json({
        status: true,
        message: "Password updated successfully",
        force_logout: true
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Failed to change password",
        error: err.message,
      });
    }
  },
};
