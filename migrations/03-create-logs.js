module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        action ENUM('create','update','delete') NOT NULL,
        target_table VARCHAR(50) NOT NULL,
        target_id INT NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  down: async (db) => {
    await db.query("DROP TABLE IF EXISTS logs");
  }
};
