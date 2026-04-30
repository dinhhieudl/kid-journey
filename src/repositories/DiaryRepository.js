/**
 * Diary repository - CRUD operations for diary entries
 * @module repositories/DiaryRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all diary entries for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  return getDb().prepare('SELECT * FROM diary WHERE kid_id = ? ORDER BY date DESC, created_at DESC').all(kidId);
}

/**
 * Find a diary entry by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM diary WHERE id = ?').get(id);
}

/**
 * Create a new diary entry
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, date, title, content, mood, tags, photos }) {
  return getDb().prepare(
    'INSERT INTO diary (kid_id, date, title, content, mood, tags, photos) VALUES (?,?,?,?,?,?,?)'
  ).run(kid_id, date, title, content, mood, tags, photos);
}

/**
 * Update a diary entry
 * @param {number} id
 * @param {object} params
 */
function update(id, { date, title, content, mood, tags, photos }) {
  getDb().prepare('UPDATE diary SET date=?, title=?, content=?, mood=?, tags=?, photos=? WHERE id=?')
    .run(date, title, content, mood, tags, photos, id);
}

/**
 * Delete a diary entry
 * @param {number} id
 */
function remove(id) {
  getDb().prepare('DELETE FROM diary WHERE id = ?').run(id);
}

module.exports = { findByKidId, findById, create, update, remove };
