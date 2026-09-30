const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { createPool, waitForDb, dbHint } = require('./db');
const { runMigrations } = require('./migrate');
const { seedUser } = require('./seed');
const { createApp } = require('./app');

async function main() {
  const config = loadConfig();
  const logger = createLogger({ level: config.LOG_LEVEL, base: { service: 'backend', version: config.APP_VERSION } });
  const pool = createPool(config);
  let server;

  // `docker stop` sends SIGTERM, waits 10s, then SIGKILL (exit 137). Node as PID 1 gets
  // no default signal handling, so without this handler every stop would be a kill.
  // Registered before startup so a stop during the DB retry loop is also clean.
  const shutdown = (signal) => {
    logger.info('shutting down', { signal });
    if (!server) process.exit(0); // still starting up — nothing to drain
    setTimeout(() => {
      logger.error('connections did not drain in 8s, forcing exit');
      process.exit(1);
    }, 8000).unref();
    // Stop accepting connections, let in-flight requests finish, then release the DB.
    server.close(async () => {
      await pool.end().catch(() => {});
      logger.info('shutdown complete');
      process.exit(0);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  // Order matters: DB reachable → schema up to date → login user exists → only then
  // accept traffic. A failure at any step exits non-zero instead of serving errors.
  await waitForDb(pool, logger);
  await runMigrations(config, logger);
  await seedUser(pool, config, logger);

  const app = createApp({ pool, config, logger });
  server = app.listen(config.PORT, () => logger.info('listening', { port: config.PORT }));
  server.on('error', (err) => {
    logger.error('HTTP server failed', { err });
    process.exit(1);
  });
}

main().catch((err) => {
  const logger = createLogger({ base: { service: 'backend' } });
  if (err.name === 'ConfigError') logger.error('invalid configuration', { problems: err.problems });
  else logger.error('startup failed', { err, hint: dbHint(err) });
  process.exit(1);
});
