const request = require('supertest');
const { buildApp } = require('./helpers');

describe('GET /api/health', () => {
  test('200 when the database answers', async () => {
    const { app, pool } = buildApp();
    pool.query.mockResolvedValueOnce([[{ 1: 1 }]]);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up', version: 'test-sha' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('503 when the database is down — the process being up is not enough', async () => {
    const { app, pool } = buildApp();
    pool.query.mockRejectedValueOnce(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'down', version: 'test-sha', error: 'ECONNREFUSED' });
  });
});

describe('unknown routes', () => {
  test('return a JSON 404', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
