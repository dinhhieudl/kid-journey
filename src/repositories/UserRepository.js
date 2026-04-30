/**
 * User repository - CRUD operations for users and user_kids
 * @module repositories/UserRepository
 */
const { getDb } = require('../database/connection');

/**
 * Find a user by username
 * @param {string} username
 * @returns {object|undefined}
 */
function findByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

/**
 * Find a user by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT id, username, display_name, role, avatar, is_active, last_login_at, created_at FROM users WHERE id = ?').get(id);
}

/**
 * Get all active users
 * @returns {object[]}
 */
function findAll() {
  return getDb().prepare('SELECT id, username, display_name, role, avatar, is_active, created_at FROM users WHERE is_active = 1 ORDER BY created_at ASC').all();
}

/**
 * Create a new user
 * @param {object} params
 * @param {string} params.username
 * @param {string} params.display_name
 * @param {string} params.pin_hash
 * @param {string} [params.role='parent']
 * @param {string} [params.avatar='👤']
 * @returns {object} { lastInsertRowid }
 */
function create({ username, display_name, pin_hash, role = 'parent', avatar = '👤' }) {
  return getDb().prepare(
    'INSERT INTO users (username, display_name, pin_hash, role, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(username, display_name, pin_hash, role, avatar);
}

/**
 * Update last login timestamp
 * @param {number} userId
 */
function updateLastLogin(userId) {
  getDb().prepare("UPDATE users SET last_login_at = datetime('now','localtime') WHERE id = ?").run(userId);
}

/**
 * Get kid IDs that a user has access to
 * @param {number} userId
 * @returns {number[]}
 */
function getAllowedKidIds(userId) {
  return getDb().prepare('SELECT kid_id FROM user_kids WHERE user_id = ?').all(userId).map(r => r.kid_id);
}

/**
 * Associate a user with a kid
 * @param {number} userId
 * @param {number} kidId
 * @param {string} [relation='parent']
 */
function addKid(userId, kidId, relation = 'parent') {
  getDb().prepare(
    'INSERT OR IGNORE INTO user_kids (user_id, kid_id, relation) VALUES (?, ?, ?)'
  ).run(userId, kidId, relation);
}

/**
 * Remove user-kid association
 * @param {number} userId
 * @param {number} kidId
 */
function removeKid(userId, kidId) {
  getDb().prepare('DELETE FROM user_kids WHERE user_id = ? AND kid_id = ?').run(userId, kidId);
}

/**
 * Get all users with access to a specific kid
 * @param {number} kidId
 * @returns {object[]}
 */
function getUsersByKidId(kidId) {
  return getDb().prepare(`
    SELECT u.id, u.username, u.display_name, u.role, u.avatar, uk.relation
    FROM users u
    JOIN user_kids uk ON u.id = uk.user_id
    WHERE uk.kid_id = ?
  `).all(kidId);
}

/**
 * Check if any users exist (for setup flow)
 * @returns {boolean}
 */
function hasUsers() {
  return getDb().prepare('SELECT COUNT(*) as c FROM users').get().c > 0;
}

module.exports = {
  findByUsername, findById, findAll, create,
  updateLastLogin, getAllowedKidIds, addKid, removeKid,
  getUsersByKidId, hasUsers,
};
