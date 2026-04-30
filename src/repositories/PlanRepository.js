/**
 * Plan repository - CRUD operations for plans
 * @module repositories/PlanRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all plans for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  return getDb().prepare('SELECT * FROM plans WHERE kid_id = ? ORDER BY target_date ASC').all(kidId);
}

/**
 * Find a plan by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM plans WHERE id = ?').get(id);
}

/**
 * Create a new plan
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, title, description, category, target_date, status, priority }) {
  return getDb().prepare(
    'INSERT INTO plans (kid_id, title, description, category, target_date, status, priority) VALUES (?,?,?,?,?,?,?)'
  ).run(kid_id, title, description, category, target_date, status, priority);
}

/**
 * Update a plan
 * @param {number} id
 * @param {object} params
 */
function update(id, { title, description, category, target_date, status, priority }) {
  getDb().prepare(
    "UPDATE plans SET title=?, description=?, category=?, target_date=?, status=?, priority=?, updated_at=datetime('now','localtime') WHERE id=?"
  ).run(title, description, category, target_date, status, priority, id);
}

/**
 * Delete a plan
 * @param {number} id
 */
function remove(id) {
  getDb().prepare('DELETE FROM plans WHERE id = ?').run(id);
}

module.exports = { findByKidId, findById, create, update, remove };
