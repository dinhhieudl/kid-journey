/**
 * Kids routes
 * CRUD /api/kids
 * @module routes/kids
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const KidRepository = require('../repositories/KidRepository');
const UserRepository = require('../repositories/UserRepository');
const config = require('../config');
const jwt = require('jsonwebtoken');

/**
 * GET /api/kids
 * Get all kids accessible to the current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const allKids = KidRepository.findAll();
  // Filter by user's allowed kids (check JWT first, fallback to DB)
  const allowed = req.user.allowedKidIds && req.user.allowedKidIds.length > 0
    ? req.user.allowedKidIds
    : UserRepository.getAllowedKidIds(req.user.userId);
  const kids = allKids.filter(k => allowed.includes(k.id));
  res.json(kids);
}));

/**
 * GET /api/kids/:id
 * Get a specific kid
 */
router.get('/:id', authorizeKid, asyncHandler(async (req, res) => {
  const kid = KidRepository.findById(req.params.id);
  if (!kid) return res.status(404).json({ error: 'Not found' });
  res.json(kid);
}));

/**
 * POST /api/kids
 * Create a new kid and link to current user
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, nickname, birthday, gender, avatar, blood_type, allergies, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = KidRepository.create({ name, nickname, birthday, gender, avatar, blood_type, allergies, notes });
  const kidId = result.lastInsertRowid;
  // Auto-link to current user
  UserRepository.addKid(req.user.userId, kidId, 'parent');
  // Return new token with updated allowedKidIds
  const allowedKidIds = UserRepository.getAllowedKidIds(req.user.userId);
  const newToken = jwt.sign({
    userId: req.user.userId,
    username: req.user.username,
    display_name: req.user.display_name,
    role: req.user.role,
    allowedKidIds,
  }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  res.json({ id: kidId, ...req.body, token: newToken });
}));

/**
 * PUT /api/kids/:id
 * Update a kid
 */
router.put('/:id', authorizeKid, asyncHandler(async (req, res) => {
  const { name, nickname, birthday, gender, avatar, blood_type, allergies, notes } = req.body;
  KidRepository.update(req.params.id, { name, nickname, birthday, gender, avatar, blood_type, allergies, notes });
  res.json({ id: Number(req.params.id), ...req.body });
}));

/**
 * DELETE /api/kids/:id
 * Delete a kid
 */
router.delete('/:id', authorizeKid, asyncHandler(async (req, res) => {
  KidRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
