/**
 * Global error handling middleware
 * @module middleware/errorHandler
 */

/**
 * Wraps an async route handler to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`Error in ${req.method} ${req.path}:`, err);
      res.status(500).json({ error: 'Lỗi server nội bộ' });
    });
  };
}

/**
 * Global error handler middleware
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Lỗi server nội bộ',
  });
}

module.exports = { asyncHandler, errorHandler };
