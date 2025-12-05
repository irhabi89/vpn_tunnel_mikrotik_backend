module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tunnels (
        id INT(11) NOT NULL AUTO_INCREMENT,
        user_id INT(11) DEFAULT NULL,
        username VARCHAR(255) DEFAULT NULL,
        password VARCHAR(255) DEFAULT NULL,
        public_port INT(11) DEFAULT NULL,
        private_port INT(11) DEFAULT NULL,
        vpn_ip VARCHAR(50) DEFAULT NULL,
        status ENUM('waiting','active','disabled') DEFAULT 'waiting',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY username (username),
        UNIQUE KEY public_port (public_port),
        KEY user_id (user_id),
        CONSTRAINT tunnels_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  },

  down: async (db) => {
    await db.query("DROP TABLE IF EXISTS tunnels");
  }
};
