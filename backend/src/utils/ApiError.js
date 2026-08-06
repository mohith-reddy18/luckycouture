/**
 * A structured application error. Thrown from anywhere in the request
 * lifecycle and caught by the centralized error handler, which uses
 * `statusCode` and `message` to build a consistent JSON error response.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
