const { z } = require('zod');

const required = () => z.string({ error: 'is required' }).min(1, 'is required');

// Every setting comes from the environment. Nothing secret has a default: a missing
// DB_PASSWORD or JWT_SECRET must stop the process at startup, not fall back silently.
const schema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // Baked into the image at build time (git SHA) so /api/health shows what is deployed.
    APP_VERSION: z.string().default('dev'),

    DB_HOST: required(),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: required(),
    DB_PASSWORD: required(),
    DB_NAME: required(),

    JWT_SECRET: required().min(32, 'must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('1h'),

    // Browser traffic is same-origin through nginx, so CORS stays off unless set.
    CORS_ORIGIN: z.string().optional(),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    // There is no signup; the one login user is created from these at startup.
    SEED_USER_EMAIL: z.string().trim().toLowerCase().pipe(z.email('must be an email')).optional(),
    SEED_USER_PASSWORD: z.string().min(8, 'must be at least 8 characters').optional(),
    SEED_USER_NAME: z.string().default('Demo User'),
  })
  .refine((c) => Boolean(c.SEED_USER_EMAIL) === Boolean(c.SEED_USER_PASSWORD), {
    message: 'set both SEED_USER_EMAIL and SEED_USER_PASSWORD, or neither',
    path: ['SEED_USER_PASSWORD'],
  });

class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration: ${problems.join('; ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

function loadConfig(env = process.env) {
  // Compose turns `${VAR:-}` into an empty string; treat that the same as "not set".
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = schema.safeParse(present);
  if (!result.success) {
    // Report variable names and rules only — never values, they may be secrets.
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
    throw new ConfigError(problems);
  }
  return result.data;
}

module.exports = { loadConfig, ConfigError };
