/**
 * Growth routes
 * CRUD + analysis /api/kids/:kidId/growth
 * @module routes/growth
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const GrowthRepository = require('../repositories/GrowthRepository');
const KidRepository = require('../repositories/KidRepository');
const GrowthService = require('../services/GrowthService');

/**
 * GET /api/kids/:kidId/growth
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const rows = GrowthRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * GET /api/kids/:kidId/growth/analysis
 * Get growth records with WHO Z-score comparison
 */
router.get('/analysis', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });
  const result = GrowthService.analyze(req.params.kidId, kid);
  res.json(result);
}));

/**
 * POST /api/kids/:kidId/growth
 */
router.post('/', authorizeKid, asyncHandler(async (req, res) => {
  const { date, height, weight, head_circumference, notes } = req.body;
  const result = GrowthRepository.create({
    kid_id: req.params.kidId,
    date: date || new Date().toISOString().slice(0, 10),
    height,
    weight,
    head_circumference,
    notes,
  });
  res.json({ id: result.lastInsertRowid });
}));

/**
 * PUT /api/growth/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { date, height, weight, head_circumference, notes } = req.body;
  GrowthRepository.update(req.params.id, { date, height, weight, head_circumference, notes });
  res.json({ ok: true });
}));

/**
 * DELETE /api/growth/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  GrowthRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
