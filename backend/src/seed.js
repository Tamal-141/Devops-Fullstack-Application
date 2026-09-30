const bcrypt = require('bcryptjs');

// Creates (or updates) the login user from SEED_USER_* env vars. The password lives only
// in the environment; the database stores a bcrypt hash. Changing SEED_USER_PASSWORD and
// restarting the backend rotates the password.
async function seedUser(pool, config, logger) {
  if (!config.SEED_USER_EMAIL) {
    logger.info('no SEED_USER_EMAIL set, skipping seed user');
    return;
  }
  const hash = await bcrypt.hash(config.SEED_USER_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) AS new
     ON DUPLICATE KEY UPDATE name = new.name, password_hash = new.password_hash`,
    [config.SEED_USER_EMAIL, config.SEED_USER_NAME, hash],
  );
  logger.info('seed user ready', { email: config.SEED_USER_EMAIL });
}

module.exports = { seedUser };
