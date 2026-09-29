const { loadConfig } = require('../src/config');

const validEnv = {
  DB_HOST: 'mysql',
  DB_USER: 'shoplite',
  DB_PASSWORD: 'super-secret-db-password',
  DB_NAME: 'shoplite',
  JWT_SECRET: 'a'.repeat(32),
};

describe('loadConfig', () => {
  test('applies defaults and coerces numbers', () => {
    const config = loadConfig({ ...validEnv, PORT: '4000' });
    expect(config.PORT).toBe(4000);
    expect(config.DB_PORT).toBe(3306);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.APP_VERSION).toBe('dev');
  });

  test('names every missing variable', () => {
    expect.assertions(3);
    try {
      loadConfig({ DB_HOST: 'mysql' });
    } catch (err) {
      expect(err.name).toBe('ConfigError');
      expect(err.problems).toEqual(expect.arrayContaining(['DB_PASSWORD is required', 'JWT_SECRET is required']));
      expect(err.problems.some((problem) => problem.startsWith('DB_HOST'))).toBe(false);
    }
  });

  test('treats an empty string as missing (compose ${VAR:-})', () => {
    expect(() => loadConfig({ ...validEnv, DB_PASSWORD: '' })).toThrow(/DB_PASSWORD is required/);
  });

  test('rejects a short JWT secret without echoing it', () => {
    expect.assertions(2);
    try {
      loadConfig({ ...validEnv, JWT_SECRET: 'tooshort' });
    } catch (err) {
      expect(err.message).toMatch(/JWT_SECRET must be at least 32 characters/);
      expect(err.message).not.toContain('tooshort');
    }
  });

  test('requires seed email and password together', () => {
    expect(() => loadConfig({ ...validEnv, SEED_USER_EMAIL: 'demo@shoplite.local' })).toThrow(/set both/);
  });

  test('lower-cases the seed email', () => {
    const config = loadConfig({ ...validEnv, SEED_USER_EMAIL: 'Demo@ShopLite.local', SEED_USER_PASSWORD: 'password123' });
    expect(config.SEED_USER_EMAIL).toBe('demo@shoplite.local');
  });
});
