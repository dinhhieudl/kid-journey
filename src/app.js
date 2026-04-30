/**
 * Express application setup
 * Exported for testing
 * @module app
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { authGuard } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const kidsRoutes = require('./routes/kids');
const diaryRoutes = require('./routes/diary');
const plansRoutes = require('./routes/plans');
const milestonesRoutes = require('./routes/milestones');
const growthRoutes = require('./routes/growth');
const photosRoutes = require('./routes/photos');
const montessoriRoutes = require('./routes/montessori');
const statsRoutes = require('./routes/stats');
const backupRoutes = require('./routes/backup');
const reportRoutes = require('./routes/report');

const app = express();

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(config.PUBLIC_DIR));
app.use('/uploads', express.static(config.UPLOADS_DIR));

// Public auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Auth guard for all other API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  authGuard(req, res, next);
});

// Protected API routes
app.use('/api/kids', kidsRoutes);
app.use('/api/kids/:kidId/diary', diaryRoutes);
app.use('/api/kids/:kidId/plans', plansRoutes);
app.use('/api/kids/:kidId/milestones', milestonesRoutes);
app.use('/api/kids/:kidId/growth', growthRoutes);
app.use('/api/kids/:kidId/photos', photosRoutes);
app.use('/api/kids/:kidId/montessori', montessoriRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/kids/:kidId/report', reportRoutes);

// Backward-compatible routes for diary/plans/milestones/growth/photos delete/update
// These use flat paths like /api/diary/:id
const diaryRepo = require('./repositories/DiaryRepository');
const planRepo = require('./repositories/PlanRepository');
const milestoneRepo = require('./repositories/MilestoneRepository');
const growthRepo = require('./repositories/GrowthRepository');
const photoRepo = require('./repositories/PhotoRepository');
const { asyncHandler } = require('./middleware/errorHandler');

app.put('/api/diary/:id', asyncHandler(async (req, res) => {
  const { date, title, content, mood, tags, photos } = req.body;
  diaryRepo.update(req.params.id, { date, title, content, mood, tags, photos });
  res.json({ ok: true });
}));

app.delete('/api/diary/:id', asyncHandler(async (req, res) => {
  diaryRepo.remove(req.params.id);
  res.json({ ok: true });
}));

app.put('/api/plans/:id', asyncHandler(async (req, res) => {
  const { title, description, category, target_date, status, priority } = req.body;
  planRepo.update(req.params.id, { title, description, category, target_date, status, priority });
  res.json({ ok: true });
}));

app.delete('/api/plans/:id', asyncHandler(async (req, res) => {
  planRepo.remove(req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/milestones/:id', asyncHandler(async (req, res) => {
  milestoneRepo.remove(req.params.id);
  res.json({ ok: true });
}));

app.put('/api/growth/:id', asyncHandler(async (req, res) => {
  const { date, height, weight, head_circumference, notes } = req.body;
  growthRepo.update(req.params.id, { date, height, weight, head_circumference, notes });
  res.json({ ok: true });
}));

app.delete('/api/growth/:id', asyncHandler(async (req, res) => {
  growthRepo.remove(req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/photos/:id', asyncHandler(async (req, res) => {
  photoRepo.remove(req.params.id);
  res.json({ ok: true });
}));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
