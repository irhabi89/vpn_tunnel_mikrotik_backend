const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [
      username
    ]);
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Buat token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login };
