const request = require('supertest');
const { buildApp } = require('./helpers');

const row = { id: 1, slug: 'rubber-duck', name: 'Rubber Debugging Duck', description: 'Quack.', price_cents: 500 };

describe('GET /api/products', () => {
  test('lists products in camelCase', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[row]]);

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([
      { id: 1, slug: 'rubber-duck', name: 'Rubber Debugging Duck', description: 'Quack.', priceCents: 500 },
    ]);
  });

  test('a database failure becomes a generic 500 with no internals', async () => {
    const { app, pool } = buildApp();
    pool.query.mockRejectedValueOnce(new Error("Table 'shoplite.products' doesn't exist"));

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
});

describe('GET /api/products/:id', () => {
  test('returns one product', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[row]]);

    const res = await request(app).get('/api/products/1');

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe('Rubber Debugging Duck');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [1]);
  });

  test('404 for an id that does not exist', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/products/999');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test.each(['abc', '0', '-1', '1.5'])('400 for invalid id %p without querying the DB', async (id) => {
    const { app, pool } = buildApp();

    const res = await request(app).get(`/api/products/${id}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
