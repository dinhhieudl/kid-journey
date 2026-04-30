/**
 * Stats routes
 * GET /api/stats
 * @module routes/stats
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getDb } = require('../database/connection');

/**
 * GET /api/stats
 * Get dashboard statistics
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const allowed = req.user.allowedKidIds || [];

  if (allowed.length === 0) {
    return res.json({
      kidCount: 0, diaryCount: 0, planCount: 0, milestoneCount: 0,
      recentDiary: [], upcomingPlans: [],
    });
  }

  const placeholders = allowed.map(() => '?').join(',');

  const kidCount = db.prepare(`SELECT COUNT(*) as c FROM kids WHERE id IN (${placeholders})`).get(...allowed).c;
  const diaryCount = db.prepare(`SELECT COUNT(*) as c FROM diary WHERE kid_id IN (${placeholders})`).get(...allowed).c;
  const planCount = db.prepare(`SELECT COUNT(*) as c FROM plans WHERE kid_id IN (${placeholders})`).get(...allowed).c;
  const milestoneCount = db.prepare(`SELECT COUNT(*) as c FROM milestones WHERE kid_id IN (${placeholders})`).get(...allowed).c;

  const recentDiary = db.prepare(`
    SELECT d.*, k.name as kid_name FROM diary d
    JOIN kids k ON d.kid_id = k.id
    WHERE d.kid_id IN (${placeholders})
    ORDER BY d.date DESC, d.created_at DESC LIMIT 10
  `).all(...allowed);

  const upcomingPlans = db.prepare(`
    SELECT p.*, k.name as kid_name FROM plans p
    JOIN kids k ON p.kid_id = k.id
    WHERE p.kid_id IN (${placeholders}) AND p.status != 'done' AND p.target_date >= date('now','localtime')
    ORDER BY p.target_date ASC LIMIT 10
  `).all(...allowed);

  res.json({ kidCount, diaryCount, planCount, milestoneCount, recentDiary, upcomingPlans });
}));

module.exports = router;
