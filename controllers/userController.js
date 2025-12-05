const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Get all users
const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, username, role FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add user
const addUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password , role) VALUES (?, ?, 'user')",
      [username, hash]
    );
    res.json({ message: "User added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getUsers, addUser, deleteUser };
