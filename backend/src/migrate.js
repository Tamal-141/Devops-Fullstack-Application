const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const LOCK_NAME = 'shoplite_migrations';

// Only NNN_name.sql counts as a migration. Anything else that lands in the folder —
// editor backups, macOS `._` metadata files — is skipped, not executed as SQL.
// Sorted as text, so keep the numbers zero-padded (009 before 010).
const MIGRATION_FILE = /^\d+_[\w-]+\.sql$/;

async function listMigrations(dir = MIGRATIONS_DIR) {
  return (await fs.readdir(dir)).filter((file) => MIGRATION_FILE.test(file)).sort();
}

// Applies migrations/*.sql in filename order, once each. Applied filenames are recorded
// in schema_migrations, so running this on every startup is safe (idempotent).
async function runMigrations(config, logger, dir = MIGRATIONS_DIR) {
  // A dedicated connection with multipleStatements, so one .sql file can hold several
  // statements. Kept off the shared pool: multipleStatements makes SQL injection worse.
  const conn = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Two backends starting together must not both run the same migration.
    const [[{ locked }]] = await conn.query('SELECT GET_LOCK(?, 30) AS locked', [LOCK_NAME]);
    if (locked !== 1) throw new Error('could not acquire the migration lock within 30s');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

    const [rows] = await conn.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));
    const files = await listMigrations(dir);

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      logger.info('applying migration', { file });
      // MySQL DDL auto-commits, so a file that fails halfway is NOT rolled back.
      // Keep each file small and use IF NOT EXISTS / INSERT IGNORE so a rerun is safe.
      await conn.query(await fs.readFile(path.join(dir, file), 'utf8'));
      await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      count += 1;
    }
    logger.info('migrations up to date', { newlyApplied: count, total: files.length });
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {});
    await conn.end();
  }
}

module.exports = { runMigrations, listMigrations };
