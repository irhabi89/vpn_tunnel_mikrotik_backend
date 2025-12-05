const db = require("../config/db");

const Activity = {
  async write({ user_id, ip_address, controller, method, endpoint, description }) {
    await db.query(
      `INSERT INTO activities (user_id, ip_address, controller, method, endpoint, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        ip_address || null,
        controller,
        method,
        endpoint,
        description
      ]
    );
  },

  async all() {
    const [rows] = await db.query(`
      SELECT activities.*, users.username 
      FROM activities
      LEFT JOIN users ON users.id = activities.user_id
      ORDER BY activities.id DESC
    `);
    return rows;
  }
};

module.exports = Activity;
