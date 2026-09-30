const mysql = require('mysql2/promise');

// Retrying these can't help — the credentials or database name are simply wrong.
const FATAL_CODES = new Set(['ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR']);

const HINTS = {
  ECONNREFUSED: 'DB_HOST resolved but nothing listens on DB_PORT yet — is MySQL still starting?',
  ENOTFOUND: 'DB_HOST does not resolve — wrong service name, or not on the same Docker network',
  EAI_AGAIN: 'DNS lookup for DB_HOST timed out — is Docker DNS reachable?',
  ETIMEDOUT: 'no reply from DB_HOST — firewall, or wrong host/port',
  ER_ACCESS_DENIED_ERROR:
    'wrong DB_USER/DB_PASSWORD (MySQL 1045). Note: MYSQL_* env vars only take effect ' +
    'when the data volume is first created; changing them later does not change the password',
  ER_BAD_DB_ERROR: 'DB_NAME does not exist (MySQL 1049)',
};

function dbHint(err) {
  return HINTS[err?.code];
}

function createPool(config) {
  return mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    // MySQL is tuned to max_connections=50; one backend takes at most 10 of them.
    connectionLimit: 10,
    waitForConnections: true,
    connectTimeout: 5000,
    enableKeepAlive: true,
  });
}

// depends_on + healthcheck covers a normal start; this covers MySQL restarting under us.
async function waitForDb(pool, logger, { attempts = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      logger.info('database reachable', { attempt });
      return;
    } catch (err) {
      if (FATAL_CODES.has(err.code) || attempt === attempts) throw err;
      logger.warn('database not reachable yet, retrying', {
        attempt,
        attempts,
        code: err.code,
        hint: dbHint(err),
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { createPool, waitForDb, dbHint };
