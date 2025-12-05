module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) DEFAULT NULL,
        ip_address VARCHAR(60),
        controller VARCHAR(150),
        method VARCHAR(20),
        endpoint VARCHAR(150),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  down: async (db) => {
    await db.query("DROP TABLE IF EXISTS activities");
  }
};
