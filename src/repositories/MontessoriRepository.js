/**
 * Montessori repository - CRUD operations for montessori_progress and montessori_weekly_plan
 * @module repositories/MontessoriRepository
 */
const { getDb } = require('../database/connection');

/**
 * Get all progress records for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function getProgressByKidId(kidId) {
  return getDb().prepare('SELECT * FROM montessori_progress WHERE kid_id = ?').all(kidId);
}

/**
 * Get progress for a specific activity
 * @param {number} kidId
 * @param {string} activityKey
 * @returns {object|undefined}
 */
function getProgress(kidId, activityKey) {
  return getDb().prepare('SELECT * FROM montessori_progress WHERE kid_id = ? AND activity_key = ?').get(kidId, activityKey);
}

/**
 * Upsert progress for an activity
 * @param {object} params
 */
function upsertProgress({ kid_id, activity_key, status, completed_at, notes, evidence_photo }) {
  getDb().prepare(`
    INSERT INTO montessori_progress (kid_id, activity_key, status, completed_at, notes, evidence_photo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(kid_id, activity_key) DO UPDATE SET
      status = excluded.status,
      completed_at = CASE WHEN excluded.status = 'completed' THEN datetime('now','localtime') ELSE completed_at END,
      notes = COALESCE(excluded.notes, notes),
      evidence_photo = COALESCE(excluded.evidence_photo, evidence_photo),
      updated_at = datetime('now','localtime')
  `).run(kid_id, activity_key, status, completed_at, notes, evidence_photo);
}

/**
 * Get completed activity keys for a kid
 * @param {number} kidId
 * @returns {string[]}
 */
function getCompletedKeys(kidId) {
  return getDb().prepare(
    "SELECT activity_key FROM montessori_progress WHERE kid_id = ? AND status = 'completed'"
  ).all(kidId).map(r => r.activity_key);
}

/**
 * Get weekly plan for a kid and week
 * @param {number} kidId
 * @param {string} weekStart - YYYY-MM-DD
 * @returns {object[]}
 */
function getWeeklyPlan(kidId, weekStart) {
  return getDb().prepare(
    'SELECT * FROM montessori_weekly_plan WHERE kid_id = ? AND week_start = ? ORDER BY planned_day'
  ).all(kidId, weekStart);
}

/**
 * Delete weekly plan for a kid and week
 * @param {number} kidId
 * @param {string} weekStart
 */
function deleteWeeklyPlan(kidId, weekStart) {
  getDb().prepare('DELETE FROM montessori_weekly_plan WHERE kid_id = ? AND week_start = ?').run(kidId, weekStart);
}

/**
 * Insert weekly plan entries
 * @param {number} kidId
 * @param {string} weekStart
 * @param {Array<{ activity_key: string, planned_day: string }>} entries
 */
function insertWeeklyPlan(kidId, weekStart, entries) {
  const insert = getDb().prepare(
    'INSERT INTO montessori_weekly_plan (kid_id, week_start, activity_key, planned_day) VALUES (?,?,?,?)'
  );
  const insertMany = getDb().transaction((items) => {
    for (const item of items) {
      insert.run(kidId, weekStart, item.activity_key, item.planned_day);
    }
  });
  insertMany(entries);
}

module.exports = {
  getProgressByKidId, getProgress, upsertProgress,
  getCompletedKeys, getWeeklyPlan, deleteWeeklyPlan, insertWeeklyPlan,
};
