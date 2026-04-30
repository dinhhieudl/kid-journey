/**
 * Milestone repository - CRUD operations for milestones
 * @module repositories/MilestoneRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all milestones for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  return getDb().prepare('SELECT * FROM milestones WHERE kid_id = ? ORDER BY date DESC').all(kidId);
}

/**
 * Find a milestone by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(id);
}

/**
 * Create a new milestone
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, title, description, date, category, icon }) {
  return getDb().prepare(
    'INSERT INTO milestones (kid_id, title, description, date, category, icon) VALUES (?,?,?,?,?,?)'
  ).run(kid_id, title, description, date, category, icon);
}

/**
 * Delete a milestone
 * @param {number} id
 */
function remove(id) {
  getDb().prepare('DELETE FROM milestones WHERE id = ?').run(id);
}

module.exports = { findByKidId, findById, create, remove };
