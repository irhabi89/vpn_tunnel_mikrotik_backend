module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT(11) NOT NULL AUTO_INCREMENT,
        username VARCHAR(255) DEFAULT NULL,
        password VARCHAR(255) DEFAULT NULL,
        role ENUM('admin','user') DEFAULT 'user',
        active TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  down: async (db) => {
    await db.query("DROP TABLE IF EXISTS users");
  }
};
