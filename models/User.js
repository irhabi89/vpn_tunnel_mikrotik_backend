const db = require("../config/db");

const UserModel = {
  // Ambil user berdasarkan username
  async findByUsername(username) {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0];
  },

  // Ambil user berdasarkan ID
  async findById(id) {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      id
    ]);
    return rows[0];
  },

  // Update data profile
  async updateProfile(id, { username }) {
    const [result] = await db.query(
      "UPDATE users SET username = ? WHERE id = ?",
      [username, id]
    );
    return result.affectedRows > 0;
  },

  // Update password
  async updatePassword(id, hashedPassword) {
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  },

  // Buat user baru (opsional)
  async createUser({ username, password, role = "user" }) {
    const [result] = await db.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, password, role]
    );
    return result.insertId;
  },

  // Ambil semua user (opsional untuk admin)
  async getAllUsers() {
    const [rows] = await db.query(
      "SELECT id, username, role, created_at FROM users"
    );
    return rows;
  },

  // Delete user by ID
  async deleteUser(id) {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
};

module.exports = UserModel;
