// An error the client is allowed to see: HTTP status + stable machine-readable code.
// Anything thrown that is NOT an AppError becomes a generic 500 (see errorHandler).
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppError };
