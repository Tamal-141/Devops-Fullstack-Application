const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildApp, testConfig } = require('./helpers');

const product = { id: 3, name: 'Aluminium Laptop Stand', price_cents: 2900 };
const tokenFor = (secret = testConfig.JWT_SECRET, options = {}) =>
  jwt.sign({ email: 'demo@shoplite.local', name: 'Demo User' }, secret, { subject: '7', expiresIn: '1h', ...options });

describe('POST /api/orders', () => {
  test('401 without a token', async () => {
    const { app, pool } = buildApp();
    const res = await request(app).post('/api/orders').send({ productId: 3, quantity: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('401 for a token signed with a different secret', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor('some-other-secret-that-is-32-characters!!')}`)
      .send({ productId: 3, quantity: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('401 with a clear message for an expired token', async () => {
    const { app } = buildApp();
    const expired = tokenFor(testConfig.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${expired}`).send({ productId: 3, quantity: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/);
  });

  test('400 for a quantity out of range', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${tokenFor()}`).send({ productId: 3, quantity: 11 });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('quantity');
  });

  test('404 for a product that does not exist', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${tokenFor()}`).send({ productId: 99, quantity: 1 });
    expect(res.status).toBe(404);
  });

  test('201 and the price comes from the database, not the request', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[product]]).mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ productId: 3, quantity: 2, priceCents: 1, totalCents: 1 });

    expect(res.status).toBe(201);
    expect(res.body.order).toEqual({
      id: 42,
      productId: 3,
      productName: 'Aluminium Laptop Stand',
      quantity: 2,
      unitPriceCents: 2900,
      totalCents: 5800,
    });
    const [, insertParams] = pool.query.mock.calls[1];
    expect(insertParams).toEqual([7, 3, 2, 2900, 5800]);
  });
});
