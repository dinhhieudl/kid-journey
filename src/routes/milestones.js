/**
 * Milestones routes
 * CRUD /api/kids/:kidId/milestones
 * @module routes/milestones
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const MilestoneRepository = require('../repositories/MilestoneRepository');

/**
 * GET /api/kids/:kidId/milestones
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const rows = MilestoneRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * POST /api/kids/:kidId/milestones
 */
router.post('/', authorizeKid, asyncHandler(async (req, res) => {
  const { title, description, date, category, icon } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
  const result = MilestoneRepository.create({
    kid_id: req.params.kidId,
    title,
    description,
    date,
    category: category || 'general',
    icon: icon || '⭐',
  });
  res.json({ id: result.lastInsertRowid });
}));

/**
 * DELETE /api/milestones/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  MilestoneRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
