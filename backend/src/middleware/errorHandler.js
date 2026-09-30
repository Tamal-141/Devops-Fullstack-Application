const { ZodError } = require('zod');
const { AppError } = require('../errors');

function send(res, status, code, message, details) {
  return res.status(status).json({ error: { code, message, ...(details && { details }) } });
}

// Express recognises error middleware by its four parameters — keep all four.
function errorHandler(logger) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof ZodError) {
      const details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      return send(res, 400, 'VALIDATION_ERROR', 'Invalid request', details);
    }
    // These two are thrown by express.json() before any route runs.
    if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
    if (err.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body too large');

    if (err instanceof AppError) return send(res, err.status, err.code, err.message);

    // Anything else is a bug or an infrastructure failure: log everything, tell the client nothing.
    logger.error('unhandled error', { reqId: req.id, method: req.method, path: req.originalUrl, err });
    return send(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  };
}

module.exports = { errorHandler };
