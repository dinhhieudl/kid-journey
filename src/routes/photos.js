/**
 * Photos routes
 * CRUD /api/kids/:kidId/photos
 * @module routes/photos
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const PhotoRepository = require('../repositories/PhotoRepository');
const config = require('../config');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|avi)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

/**
 * GET /api/kids/:kidId/photos
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const rows = PhotoRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * POST /api/kids/:kidId/photos
 */
router.post('/', authorizeKid, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { caption, date, category } = req.body;
  const result = PhotoRepository.create({
    kid_id: req.params.kidId,
    filename: req.file.filename,
    original_name: req.file.originalname,
    caption,
    date: date || new Date().toISOString().slice(0, 10),
    category: category || 'general',
  });
  res.json({ id: result.lastInsertRowid, filename: req.file.filename });
}));

/**
 * DELETE /api/photos/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  PhotoRepository.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
