/**
 * Photo repository - CRUD operations for photos
 * @module repositories/PhotoRepository
 */
const { getDb } = require('../database/connection');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Get all photos for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  return getDb().prepare('SELECT * FROM photos WHERE kid_id = ? ORDER BY date DESC').all(kidId);
}

/**
 * Find a photo by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

/**
 * Create a new photo record
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, filename, original_name, caption, date, category }) {
  return getDb().prepare(
    'INSERT INTO photos (kid_id, filename, original_name, caption, date, category) VALUES (?,?,?,?,?,?)'
  ).run(kid_id, filename, original_name, caption, date, category);
}

/**
 * Delete a photo record and its file
 * @param {number} id
 */
function remove(id) {
  const photo = getDb().prepare('SELECT filename FROM photos WHERE id = ?').get(id);
  if (photo) {
    const fp = path.join(config.UPLOADS_DIR, photo.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
}

module.exports = { findByKidId, findById, create, remove };
