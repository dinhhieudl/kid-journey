/**
 * Montessori routes
 * /api/kids/:kidId/montessori + progress + weekly-plan
 * @module routes/montessori
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const KidRepository = require('../repositories/KidRepository');
const MontessoriService = require('../services/MontessoriService');
const montessori = require('../../montessori');
const config = require('../config');

// Multer config for evidence photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `montessori-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

/**
 * GET /api/kids/:kidId/montessori
 * Get Montessori overview for a kid
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const ageMonths = montessori.getAgeInMonths(kid.birthday);
  const currentStage = montessori.getCurrentStage(kid.birthday);
  const upcomingStages = montessori.getUpcomingStages(kid.birthday);
  const dailyActivities = montessori.getDailyActivities(kid.birthday, 6);
  const allActivities = montessori.getAllActivities(kid.birthday);
  const parentTips = montessori.getParentTips(kid.birthday);

  res.json({
    ageMonths,
    currentStage,
    upcomingStages,
    dailyActivities,
    allActivities,
    parentTips,
  });
}));

/**
 * GET /api/kids/:kidId/montessori/progress
 * Get all activities with progress tracking
 */
router.get('/progress', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const result = MontessoriService.getProgress(req.params.kidId, kid.birthday);
  res.json(result);
}));

/**
 * POST /api/kids/:kidId/montessori/progress
 * Update progress for an activity
 */
router.post('/progress', authorizeKid, upload.single('evidence'), asyncHandler(async (req, res) => {
  const { activity_key, status, notes } = req.body;
  if (!activity_key || !status) {
    return res.status(400).json({ error: 'Thiếu activity_key hoặc status' });
  }
  const evidence_photo = req.file ? req.file.filename : undefined;
  MontessoriService.updateProgress({
    kid_id: Number(req.params.kidId),
    activity_key,
    status,
    notes,
    evidence_photo,
  });
  res.json({ ok: true });
}));

/**
 * GET /api/kids/:kidId/montessori/weekly-plan
 * Get the current weekly plan
 */
router.get('/weekly-plan', authorizeKid, asyncHandler(async (req, res) => {
  const result = MontessoriService.getWeeklyPlan(req.params.kidId, req.query.week_start);
  res.json(result);
}));

/**
 * POST /api/kids/:kidId/montessori/weekly-plan
 * Auto-generate a weekly plan
 */
router.post('/weekly-plan', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const result = MontessoriService.generateWeeklyPlan(req.params.kidId, kid.birthday, req.body.count || 6);
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/kids/:kidId/montessori/stage-progress
 * Get progress by stage
 */
router.get('/stage-progress', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const result = MontessoriService.getStageProgress(req.params.kidId, kid.birthday);
  res.json(result);
}));

module.exports = router;
