const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { AppError } = require('./errors');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { healthRouter } = require('./routes/health');
const { productsRouter } = require('./routes/products');
const { authRouter } = require('./routes/auth');
const { ordersRouter } = require('./routes/orders');

// Builds the app from injected dependencies and never touches process.env or a real
// database itself — which is what lets the Jest tests pass in a fake pool.
function createApp({ pool, config, logger }) {
  const app = express();

  // Exactly one proxy (nginx) sits in front. Trust its X-Forwarded-For for one hop so
  // req.ip is the real client — needed by the login rate limiter and the request logs.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',').map((o) => o.trim()) : false }));
  app.use(express.json({ limit: '10kb' }));
  app.use(requestLogger(logger));

  app.use('/api/health', healthRouter({ pool, config }));
  app.use('/api/products', productsRouter({ pool }));
  app.use('/api/auth', authRouter({ pool, config }));
  app.use('/api/orders', ordersRouter({ pool, config }));

  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`)));
  app.use(errorHandler(logger));

  return app;
}

module.exports = { createApp };
