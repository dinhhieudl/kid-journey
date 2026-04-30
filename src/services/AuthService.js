/**
 * Authentication service
 * Handles user setup, login, token refresh, and verification
 * @module services/AuthService
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const UserRepository = require('../repositories/UserRepository');

/**
 * Check if setup is needed (no users exist)
 * @returns {boolean}
 */
function needsSetup() {
  return !UserRepository.hasUsers();
}

/**
 * Create the first admin user (setup flow)
 * @param {object} params
 * @param {string} params.username
 * @param {string} params.display_name
 * @param {string} params.pin - 4-6 digit PIN
 * @returns {{ token: string, user: object }}
 * @throws {Error} If users already exist or validation fails
 */
function setup({ username, display_name, pin }) {
  if (UserRepository.hasUsers()) {
    const err = new Error('Tài khoản đã tồn tại. Vui lòng đăng nhập.');
    err.statusCode = 400;
    throw err;
  }

  if (!username || !display_name || !pin) {
    const err = new Error('Thiếu thông tin: username, display_name, pin');
    err.statusCode = 400;
    throw err;
  }

  if (!/^\d{4,6}$/.test(pin)) {
    const err = new Error('PIN phải là 4-6 chữ số');
    err.statusCode = 400;
    throw err;
  }

  const pin_hash = bcrypt.hashSync(pin, config.BCRYPT_ROUNDS);
  const result = UserRepository.create({ username, display_name, pin_hash, role: 'admin' });
  const userId = result.lastInsertRowid;

  // Auto-link to all existing kids
  const { getDb } = require('../database/connection');
  const kids = getDb().prepare('SELECT id FROM kids').all();
  for (const kid of kids) {
    UserRepository.addKid(userId, kid.id, 'parent');
  }

  const allowedKidIds = kids.map(k => k.id);
  const token = generateToken({ userId, username, display_name, role: 'admin', allowedKidIds });

  return {
    token,
    user: { id: userId, username, display_name, role: 'admin', avatar: '👤' },
  };
}

/**
 * Login with username and PIN
 * @param {object} params
 * @param {string} params.username
 * @param {string} params.pin
 * @returns {{ token: string, user: object }}
 * @throws {Error} If credentials are invalid
 */
function login({ username, pin }) {
  if (!username || !pin) {
    const err = new Error('Thiếu username hoặc PIN');
    err.statusCode = 400;
    throw err;
  }

  const user = UserRepository.findByUsername(username);
  if (!user || !user.is_active) {
    const err = new Error('Sai tên đăng nhập hoặc PIN');
    err.statusCode = 401;
    throw err;
  }

  if (!bcrypt.compareSync(pin, user.pin_hash)) {
    const err = new Error('Sai tên đăng nhập hoặc PIN');
    err.statusCode = 401;
    throw err;
  }

  const allowedKidIds = UserRepository.getAllowedKidIds(user.id);
  const token = generateToken({
    userId: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    allowedKidIds,
  });

  UserRepository.updateLastLogin(user.id);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar: user.avatar,
    },
  };
}

/**
 * Refresh an existing token (extend expiry)
 * @param {string} token - Current JWT token
 * @returns {{ token: string, user: object }}
 * @throws {Error} If token is invalid
 */
function refresh(token) {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { ignoreExpiration: true });

    // Re-fetch user to ensure still active
    const user = UserRepository.findById(decoded.userId);
    if (!user || !user.is_active) {
      const err = new Error('Tài khoản không tồn tại hoặc đã bị khóa');
      err.statusCode = 401;
      throw err;
    }

    const allowedKidIds = UserRepository.getAllowedKidIds(decoded.userId);
    const newToken = generateToken({
      userId: decoded.userId,
      username: decoded.username,
      display_name: decoded.display_name,
      role: decoded.role,
      allowedKidIds,
    });

    return {
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  } catch (err) {
    if (err.statusCode) throw err;
    const e = new Error('Token không hợp lệ');
    e.statusCode = 401;
    throw e;
  }
}

/**
 * Get current user info from token
 * @param {number} userId
 * @returns {object}
 */
function getMe(userId) {
  const user = UserRepository.findById(userId);
  if (!user) {
    const err = new Error('Không tìm thấy người dùng');
    err.statusCode = 404;
    throw err;
  }
  const allowedKidIds = UserRepository.getAllowedKidIds(userId);
  return { ...user, allowedKidIds };
}

/**
 * Generate a JWT token
 * @param {object} payload
 * @returns {string}
 */
function generateToken(payload) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

module.exports = { needsSetup, setup, login, refresh, getMe };
