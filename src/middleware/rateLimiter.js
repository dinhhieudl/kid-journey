/**
 * Rate limiting middleware for login endpoint
 * @module middleware/rateLimiter
 */
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * Limits to 10 attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { error: 'Thử quá nhiều lần. Đợi 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
