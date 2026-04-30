/**
 * Backup & Restore routes
 * GET /api/backup/export — Export all data as JSON
 * POST /api/backup/import — Import data from JSON
 * @module routes/backup
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getDb } = require('../database/connection');

/**
 * GET /api/backup/export
 * Export all database tables as JSON
 */
router.get('/export', asyncHandler(async (req, res) => {
  const db = getDb();
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    kids: db.prepare('SELECT * FROM kids ORDER BY id').all(),
    diary: db.prepare('SELECT * FROM diary ORDER BY id').all(),
    plans: db.prepare('SELECT * FROM plans ORDER BY id').all(),
    milestones: db.prepare('SELECT * FROM milestones ORDER BY id').all(),
    growth: db.prepare('SELECT * FROM growth ORDER BY id').all(),
    photos: db.prepare('SELECT * FROM photos ORDER BY id').all(),
    users: db.prepare('SELECT id, username, display_name, role, avatar, is_active, created_at FROM users ORDER BY id').all(),
    user_kids: db.prepare('SELECT * FROM user_kids ORDER BY user_id, kid_id').all(),
    montessori_progress: db.prepare('SELECT * FROM montessori_progress ORDER BY id').all(),
    montessori_weekly_plan: db.prepare('SELECT * FROM montessori_weekly_plan ORDER BY id').all(),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="kid-journey-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(data);
}));

/**
 * POST /api/backup/import
 * Import data from JSON backup (merges, does not delete existing)
 */
router.post('/import', asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data || !data.version || !data.kids) {
    return res.status(400).json({ error: 'File backup không hợp lệ' });
  }

  const db = getDb();
  const results = { imported: {}, skipped: {} };

  const tables = [
    { name: 'kids', data: data.kids, cols: ['id','name','nickname','birthday','gender','avatar','blood_type','allergies','notes','created_at','updated_at'] },
    { name: 'diary', data: data.diary, cols: ['id','kid_id','date','title','content','mood','tags','photos','created_at'] },
    { name: 'plans', data: data.plans, cols: ['id','kid_id','title','description','category','target_date','status','priority','created_at','updated_at'] },
    { name: 'milestones', data: data.milestones, cols: ['id','kid_id','title','description','date','category','icon','created_at'] },
    { name: 'growth', data: data.growth, cols: ['id','kid_id','date','height','weight','head_circumference','notes','created_at'] },
    { name: 'photos', data: data.photos, cols: ['id','kid_id','filename','original_name','caption','date','category','created_at'] },
    { name: 'montessori_progress', data: data.montessori_progress, cols: ['id','kid_id','activity_key','status','completed_at','notes','evidence_photo','created_at','updated_at'] },
    { name: 'montessori_weekly_plan', data: data.montessori_weekly_plan, cols: ['id','kid_id','week_start','activity_key','planned_day','status','created_at'] },
  ];

  const importTx = db.transaction(() => {
    for (const table of tables) {
      if (!table.data || !table.data.length) {
        results.imported[table.name] = 0;
        continue;
      }
      const cols = table.cols;
      const placeholders = cols.map(() => '?').join(',');
      const updateSet = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',');
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${table.name} (${cols.join(',')}) VALUES (${placeholders})`);
      let count = 0;
      for (const row of table.data) {
        const vals = cols.map(c => row[c] !== undefined ? row[c] : null);
        stmt.run(...vals);
        count++;
      }
      results.imported[table.name] = count;
    }
  });

  importTx();
  res.json({ ok: true, ...results });
}));

module.exports = router;
