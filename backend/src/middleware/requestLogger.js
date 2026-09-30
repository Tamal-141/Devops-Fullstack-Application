const { randomUUID } = require('node:crypto');

function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    // nginx sets X-Request-Id; reuse it so one request can be traced across both logs.
    req.id = req.get('x-request-id') || randomUUID();
    res.set('x-request-id', req.id);

    res.on('finish', () => {
      const fields = {
        reqId: req.id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
        ip: req.ip,
      };
      // Docker hits /api/health every few seconds; a passing check is noise at info level.
      if (req.originalUrl === '/api/health' && res.statusCode === 200) logger.debug('request', fields);
      else if (res.statusCode >= 500) logger.error('request', fields);
      else logger.info('request', fields);
    });

    next();
  };
}

module.exports = { requestLogger };
