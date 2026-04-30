/**
 * Plans routes
 * CRUD /api/kids/:kidId/plans
 * @module routes/plans
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const PlanRepository = require('../repositories/PlanRepository');

/**
 * GET /api/kids/:kidId/plans
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const rows = PlanRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * POST /api/kids/:kidId/plans
 */
router.post('/', authorizeKid, asyncHandler(async (req, res) => {
  const { title, description, category, target_date, status, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = PlanRepository.create({
    kid_id: req.params.kidId,
    title,
    description,
    category: category || 'general',
    target_date,
    status: status || 'planned',
    priority: priority || 'medium',
  });
  res.json({ id: result.lastInsertRowid });
}));

/**
 * PUT /api/plans/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { title, description, category, target_date, status, priority } = req.body;
  PlanRepository.update(req.params.id, { title, description, category, target_date, status, priority });
  res.json({ ok: true });
}));

/**
 * DELETE /api/plans/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  PlanRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
