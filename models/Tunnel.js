const db = require("../config/db");

const Tunnel = {
  // =====================================================
  // Get all tunnels
  // =====================================================
  async all() {
    const [rows] = await db.query("SELECT * FROM tunnels ORDER BY id DESC");
    return rows;
  },

  // =====================================================
  // Find tunnel
  // =====================================================
  async findById(id) {
    const [rows] = await db.query(
      "SELECT * FROM tunnels WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0];
  },

  async findByUsername(username) {
    const [rows] = await db.query(
      "SELECT * FROM tunnels WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0];
  },

  async findByPublicPort(port) {
    const [rows] = await db.query(
      "SELECT * FROM tunnels WHERE public_port = ? LIMIT 1",
      [port]
    );
    return rows[0];
  },

  // =====================================================
  // Create tunnel
  // =====================================================
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => "?");

    const [result] = await db.query(
      `INSERT INTO tunnels (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})`,
      values
    );

    return result.insertId;
  },

  // =====================================================
  // Update tunnel
  // =====================================================
  async update(id, data) {
    const fields = [];
    const values = [];

    for (let k in data) {
      fields.push(`${k} = ?`);
      values.push(data[k]);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const [result] = await db.query(
      `UPDATE tunnels SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  },

  // =====================================================
  // Delete tunnel
  // =====================================================
  async delete(id) {
    const [result] = await db.query(
      "DELETE FROM tunnels WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  },
};

module.exports = Tunnel;
