const db = require("./config/db");
const fs = require("fs");

(async () => {
  const files = fs.readdirSync("./migrations").sort();

  for (const file of files) {
    console.log("Running:", file);
    const migration = require("./migrations/" + file);

    if (migration.up) {
      await migration.up(db);
      console.log("DONE:", file);
    }
  }

  process.exit();
})();



// CARA MENJALANKAN migration
// node migrationRunner.js