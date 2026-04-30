/**
 * Auth routes
 * POST /api/auth/setup, /login, /refresh, /me
 * @module routes/auth
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authGuard } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const AuthService = require('../services/AuthService');

/**
 * POST /api/auth/setup
 * Create the first admin account (only works when no users exist)
 */
router.post('/setup', asyncHandler(async (req, res) => {
  const result = AuthService.setup(req.body);
  res.json(result);
}));

/**
 * POST /api/auth/login
 * Login with username + PIN
 */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const result = AuthService.login(req.body);
  res.json(result);
}));

/**
 * POST /api/auth/refresh
 * Refresh an existing JWT token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Thiếu token' });
  }
  const result = AuthService.refresh(token);
  res.json(result);
}));

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', authGuard, asyncHandler(async (req, res) => {
  const result = AuthService.getMe(req.user.userId);
  res.json(result);
}));

/**
 * GET /api/auth/status
 * Check if setup is needed (public, no auth required)
 */
router.get('/status', asyncHandler(async (req, res) => {
  res.json({ needsSetup: AuthService.needsSetup() });
}));

module.exports = router;
