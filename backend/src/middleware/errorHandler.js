const ApiError = require("../utils/ApiError");

/**
 * Centralized error handler. Normalizes Mongoose/JWT/multer errors into
 * ApiError shape and never leaks stack traces to the client in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong";

    if (error.name === "CastError") {
      statusCode = 400;
      message = `Invalid value for ${error.path}`;
    }
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0];
      message = field ? `${field} already exists` : "Duplicate value";
    }
    if (error.name === "ValidationError") {
      statusCode = 400;
      message = Object.values(error.errors)
        .map((e) => e.message)
        .join(", ");
    }
    if (error.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid authentication token";
    }
    if (error.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Session expired — please log in again";
    }

    error = new ApiError(statusCode, message);
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error("[Server Error]", {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      message: error.message,
    });
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[Client Error]", {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      message: error.message,
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    errors: error.errors || [],
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
