/**
 * Growth repository - CRUD operations for growth records + WHO reference data
 * @module repositories/GrowthRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all growth records for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  return getDb().prepare('SELECT * FROM growth WHERE kid_id = ? ORDER BY date ASC').all(kidId);
}

/**
 * Find a growth record by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM growth WHERE id = ?').get(id);
}

/**
 * Create a new growth record
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, date, height, weight, head_circumference, notes }) {
  return getDb().prepare(
    'INSERT INTO growth (kid_id, date, height, weight, head_circumference, notes) VALUES (?,?,?,?,?,?)'
  ).run(kid_id, date, height, weight, head_circumference, notes);
}

/**
 * Update a growth record
 * @param {number} id
 * @param {object} params
 */
function update(id, { date, height, weight, head_circumference, notes }) {
  getDb().prepare(
    'UPDATE growth SET date=?, height=?, weight=?, head_circumference=?, notes=? WHERE id=?'
  ).run(date, height, weight, head_circumference, notes, id);
}

/**
 * Delete a growth record
 * @param {number} id
 */
function remove(id) {
  getDb().prepare('DELETE FROM growth WHERE id = ?').run(id);
}

/**
 * Get WHO LMS reference data for interpolation
 * Returns the two nearest data points for the given indicator, sex, and age
 * @param {string} indicator - 'wfa' | 'lhfa' | 'hcfa'
 * @param {number} sex - 1=male, 2=female
 * @param {number} ageMonths
 * @returns {{ lower: object|undefined, upper: object|undefined }}
 */
function getWhoReferenceRange(indicator, sex, ageMonths) {
  const db = getDb();
  const lower = db.prepare(`
    SELECT * FROM growth_who_reference
    WHERE indicator = ? AND sex = ? AND age_months <= ?
    ORDER BY age_months DESC LIMIT 1
  `).get(indicator, sex, ageMonths);

  const upper = db.prepare(`
    SELECT * FROM growth_who_reference
    WHERE indicator = ? AND sex = ? AND age_months > ?
    ORDER BY age_months ASC LIMIT 1
  `).get(indicator, sex, ageMonths);

  return { lower, upper };
}

/**
 * Get all WHO reference data for a given indicator and sex (for curve generation)
 * @param {string} indicator
 * @param {number} sex
 * @returns {object[]}
 */
function getAllWhoReference(indicator, sex) {
  return getDb().prepare(`
    SELECT * FROM growth_who_reference
    WHERE indicator = ? AND sex = ?
    ORDER BY age_months ASC
  `).all(indicator, sex);
}

module.exports = {
  findByKidId, findById, create, update, remove,
  getWhoReferenceRange, getAllWhoReference,
};
