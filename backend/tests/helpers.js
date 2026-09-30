const { createApp } = require('../src/app');
const { createLogger } = require('../src/logger');

const silentLogger = createLogger({ stream: { write() {} } });

const testConfig = {
  PORT: 3000,
  LOG_LEVEL: 'error',
  APP_VERSION: 'test-sha',
  DB_HOST: 'unused',
  DB_PORT: 3306,
  DB_USER: 'unused',
  DB_PASSWORD: 'unused',
  DB_NAME: 'unused',
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters',
  JWT_EXPIRES_IN: '1h',
  AUTH_RATE_LIMIT_MAX: 3,
};

// mysql2's pool.query resolves to [rows, fields]; tests queue results with
// pool.query.mockResolvedValueOnce([rows]).
function buildApp(configOverrides = {}) {
  const pool = { query: jest.fn() };
  const config = { ...testConfig, ...configOverrides };
  const app = createApp({ pool, config, logger: silentLogger });
  return { app, pool, config };
}

module.exports = { buildApp, testConfig };
