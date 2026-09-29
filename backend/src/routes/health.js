const express = require('express');

// "Up" is not "working": the process answering proves nothing, so this runs a real
// query. 503 makes Docker's healthcheck and the deploy stage's curl both fail loudly.
function healthRouter({ pool, config }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await pool.query({ sql: 'SELECT 1', timeout: 2000 });
      res.json({
        status: 'ok',
        db: 'up',
        version: config.APP_VERSION,
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (err) {
      // The error code (e.g. ECONNREFUSED) helps debugging and leaks nothing secret.
      res.status(503).json({ status: 'error', db: 'down', version: config.APP_VERSION, error: err.code || 'DB_ERROR' });
    }
  });

  return router;
}

module.exports = { healthRouter };
