/**
 * Authentication middleware
 * JWT verification and kid authorization
 * @module middleware/auth
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT authentication guard middleware
 * Verifies Bearer token from Authorization header
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authGuard(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
  }
}

/**
 * Authorization middleware: check if user has access to the specified kid
 * Must be used after authGuard
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authorizeKid(req, res, next) {
  const kidId = Number(req.params.kidId || req.params.id);
  if (!req.user) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  // Check JWT first, fallback to DB lookup (kid may have been created after token was issued)
  const allowed = req.user.allowedKidIds || [];
  if (allowed.includes(kidId)) {
    return next();
  }
  // DB fallback
  const UserRepository = require('../repositories/UserRepository');
  const dbAllowed = UserRepository.getAllowedKidIds(req.user.userId);
  if (dbAllowed.includes(kidId)) {
    return next();
  }
  return res.status(403).json({ error: 'Không có quyền truy cập bé này' });
}

module.exports = { authGuard, authorizeKid };
