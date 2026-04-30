/**
 * Diary routes
 * CRUD /api/kids/:kidId/diary
 * @module routes/diary
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const DiaryRepository = require('../repositories/DiaryRepository');

/**
 * GET /api/kids/:kidId/diary
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const rows = DiaryRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * POST /api/kids/:kidId/diary
 */
router.post('/', authorizeKid, asyncHandler(async (req, res) => {
  const { date, title, content, mood, tags, photos } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  const result = DiaryRepository.create({
    kid_id: req.params.kidId,
    date: date || new Date().toISOString().slice(0, 10),
    title,
    content,
    mood: mood || 'happy',
    tags,
    photos,
  });
  res.json({ id: result.lastInsertRowid });
}));

/**
 * PUT /api/diary/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { date, title, content, mood, tags, photos } = req.body;
  DiaryRepository.update(req.params.id, { date, title, content, mood, tags, photos });
  res.json({ ok: true });
}));

/**
 * DELETE /api/diary/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  DiaryRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
