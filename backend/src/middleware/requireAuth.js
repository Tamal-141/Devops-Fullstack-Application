const jwt = require('jsonwebtoken');
const { AppError } = require('../errors');

function requireAuth(config) {
  return (req, res, next) => {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Login required'));
    }
    try {
      // Pin the algorithm: never let the token's own header choose how it is verified.
      const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = { id: Number(payload.sub), email: payload.email, name: payload.name };
      return next();
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
      return next(new AppError(401, 'INVALID_TOKEN', message));
    }
  };
}

module.exports = { requireAuth };
