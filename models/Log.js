const db = require("../config/db");

const Log = {
  async write({ user_id, action, target_table, target_id, message }) {
    await db.query(
      `INSERT INTO logs (user_id, action, target_table, target_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, action, target_table, target_id, message]
    );
  },

  async all() {
    const [rows] = await db.query(`
      SELECT logs.*, users.username 
      FROM logs 
      LEFT JOIN users ON users.id = logs.user_id
      ORDER BY logs.id DESC
    `);
    return rows;
  }
};

module.exports = Log;
