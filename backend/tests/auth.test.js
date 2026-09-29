const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { buildApp } = require('./helpers');

// Cost 4 keeps the test fast; bcrypt.compare works with any cost.
const user = { id: 7, email: 'demo@shoplite.local', name: 'Demo User', password_hash: bcrypt.hashSync('correct-horse', 4) };

describe('POST /api/auth/login', () => {
  test('returns a signed JWT for the right password', async () => {
    const { app, pool, config } = buildApp();
    pool.query.mockResolvedValueOnce([[user]]);

    const res = await request(app).post('/api/auth/login').send({ email: 'Demo@ShopLite.local', password: 'correct-horse' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 7, email: 'demo@shoplite.local', name: 'Demo User' });
    expect(res.body.user).not.toHaveProperty('password_hash');
    const payload = jwt.verify(res.body.token, config.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload.sub).toBe('7');
    // The email is lower-cased before it reaches the query.
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['demo@shoplite.local']);
  });

  test('401 for a wrong password', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[user]]);

    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  test('401 with the same message for an unknown email', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@shoplite.local', password: 'x' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('400 for a malformed email', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('email');
  });

  test('400 for a body that is not valid JSON', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('429 once the per-IP limit is used up', async () => {
    const { app, pool, config } = buildApp();
    pool.query.mockResolvedValue([[]]);
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'x@shoplite.local', password: 'x' });

    for (let i = 0; i < config.AUTH_RATE_LIMIT_MAX; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
