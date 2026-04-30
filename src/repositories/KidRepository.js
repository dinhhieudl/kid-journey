/**
 * Kid repository - CRUD operations for kids
 * @module repositories/KidRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all kids
 * @returns {object[]}
 */
function findAll() {
  return getDb().prepare('SELECT * FROM kids ORDER BY created_at DESC').all();
}

/**
 * Find a kid by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM kids WHERE id = ?').get(id);
}

/**
 * Create a new kid
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ name, nickname, birthday, gender, avatar, blood_type, allergies, notes }) {
  return getDb().prepare(
    'INSERT INTO kids (name, nickname, birthday, gender, avatar, blood_type, allergies, notes) VALUES (?,?,?,?,?,?,?,?)'
  ).run(name, nickname, birthday, gender, avatar, blood_type, allergies, notes);
}

/**
 * Update a kid
 * @param {number} id
 * @param {object} params
 */
function update(id, { name, nickname, birthday, gender, avatar, blood_type, allergies, notes }) {
  getDb().prepare(
    "UPDATE kids SET name=?, nickname=?, birthday=?, gender=?, avatar=?, blood_type=?, allergies=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?"
  ).run(name, nickname, birthday, gender, avatar, blood_type, allergies, notes, id);
}

/**
 * Delete a kid
 * @param {number} id
 */
function remove(id) {
  getDb().prepare('DELETE FROM kids WHERE id = ?').run(id);
}

module.exports = { findAll, findById, create, update, remove };
