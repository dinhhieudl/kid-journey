const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3107;

// Ensure data & uploads dirs exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// DB setup
const db = new Database(path.join(dataDir, 'kidjourney.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS kids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nickname TEXT,
    birthday TEXT,
    gender TEXT DEFAULT 'other',
    avatar TEXT,
    blood_type TEXT,
    allergies TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    mood TEXT DEFAULT 'happy',
    tags TEXT,
    photos TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    target_date TEXT,
    status TEXT DEFAULT 'planned',
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    icon TEXT DEFAULT '⭐',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS growth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    height REAL,
    weight REAL,
    head_circumference REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT,
    caption TEXT,
    date TEXT DEFAULT (date('now','localtime')),
    category TEXT DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );
`);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|avi)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  }
});

// ==================== KIDS API ====================
app.get('/api/kids', (req, res) => {
  const kids = db.prepare('SELECT * FROM kids ORDER BY created_at DESC').all();
  res.json(kids);
});

app.get('/api/kids/:id', (req, res) => {
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.id);
  if (!kid) return res.status(404).json({ error: 'Not found' });
  res.json(kid);
});

app.post('/api/kids', (req, res) => {
  const { name, nickname, birthday, gender, avatar, blood_type, allergies, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(
    'INSERT INTO kids (name, nickname, birthday, gender, avatar, blood_type, allergies, notes) VALUES (?,?,?,?,?,?,?,?)'
  ).run(name, nickname, birthday, gender, avatar, blood_type, allergies, notes);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/kids/:id', (req, res) => {
  const { name, nickname, birthday, gender, avatar, blood_type, allergies, notes } = req.body;
  db.prepare(
    `UPDATE kids SET name=?, nickname=?, birthday=?, gender=?, avatar=?, blood_type=?, allergies=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(name, nickname, birthday, gender, avatar, blood_type, allergies, notes, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});

app.delete('/api/kids/:id', (req, res) => {
  db.prepare('DELETE FROM kids WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== DIARY API ====================
app.get('/api/kids/:kidId/diary', (req, res) => {
  const rows = db.prepare('SELECT * FROM diary WHERE kid_id = ? ORDER BY date DESC, created_at DESC').all(req.params.kidId);
  res.json(rows);
});

app.post('/api/kids/:kidId/diary', (req, res) => {
  const { date, title, content, mood, tags, photos } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  const result = db.prepare(
    'INSERT INTO diary (kid_id, date, title, content, mood, tags, photos) VALUES (?,?,?,?,?,?,?)'
  ).run(req.params.kidId, date || new Date().toISOString().slice(0, 10), title, content, mood || 'happy', tags, photos);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/diary/:id', (req, res) => {
  const { date, title, content, mood, tags, photos } = req.body;
  db.prepare('UPDATE diary SET date=?, title=?, content=?, mood=?, tags=?, photos=? WHERE id=?')
    .run(date, title, content, mood, tags, photos, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/diary/:id', (req, res) => {
  db.prepare('DELETE FROM diary WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== PLANS API ====================
app.get('/api/kids/:kidId/plans', (req, res) => {
  const rows = db.prepare('SELECT * FROM plans WHERE kid_id = ? ORDER BY target_date ASC').all(req.params.kidId);
  res.json(rows);
});

app.post('/api/kids/:kidId/plans', (req, res) => {
  const { title, description, category, target_date, status, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = db.prepare(
    'INSERT INTO plans (kid_id, title, description, category, target_date, status, priority) VALUES (?,?,?,?,?,?,?)'
  ).run(req.params.kidId, title, description, category || 'general', target_date, status || 'planned', priority || 'medium');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/plans/:id', (req, res) => {
  const { title, description, category, target_date, status, priority } = req.body;
  db.prepare(`UPDATE plans SET title=?, description=?, category=?, target_date=?, status=?, priority=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(title, description, category, target_date, status, priority, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/plans/:id', (req, res) => {
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== MILESTONES API ====================
app.get('/api/kids/:kidId/milestones', (req, res) => {
  const rows = db.prepare('SELECT * FROM milestones WHERE kid_id = ? ORDER BY date DESC').all(req.params.kidId);
  res.json(rows);
});

app.post('/api/kids/:kidId/milestones', (req, res) => {
  const { title, description, date, category, icon } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
  const result = db.prepare(
    'INSERT INTO milestones (kid_id, title, description, date, category, icon) VALUES (?,?,?,?,?,?)'
  ).run(req.params.kidId, title, description, date, category || 'general', icon || '⭐');
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/milestones/:id', (req, res) => {
  db.prepare('DELETE FROM milestones WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== GROWTH API ====================
app.get('/api/kids/:kidId/growth', (req, res) => {
  const rows = db.prepare('SELECT * FROM growth WHERE kid_id = ? ORDER BY date ASC').all(req.params.kidId);
  res.json(rows);
});

app.post('/api/kids/:kidId/growth', (req, res) => {
  const { date, height, weight, head_circumference, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO growth (kid_id, date, height, weight, head_circumference, notes) VALUES (?,?,?,?,?,?)'
  ).run(req.params.kidId, date || new Date().toISOString().slice(0, 10), height, weight, head_circumference, notes);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/growth/:id', (req, res) => {
  db.prepare('DELETE FROM growth WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== PHOTOS API ====================
app.get('/api/kids/:kidId/photos', (req, res) => {
  const rows = db.prepare('SELECT * FROM photos WHERE kid_id = ? ORDER BY date DESC').all(req.params.kidId);
  res.json(rows);
});

app.post('/api/kids/:kidId/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { caption, date, category } = req.body;
  const result = db.prepare(
    'INSERT INTO photos (kid_id, filename, original_name, caption, date, category) VALUES (?,?,?,?,?,?)'
  ).run(req.params.kidId, req.file.filename, req.file.originalname, caption, date || new Date().toISOString().slice(0, 10), category || 'general');
  res.json({ id: result.lastInsertRowid, filename: req.file.filename });
});

app.delete('/api/photos/:id', (req, res) => {
  const photo = db.prepare('SELECT filename FROM photos WHERE id = ?').get(req.params.id);
  if (photo) {
    const fp = path.join(uploadsDir, photo.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================== STATS API ====================
app.get('/api/stats', (req, res) => {
  const kidCount = db.prepare('SELECT COUNT(*) as c FROM kids').get().c;
  const diaryCount = db.prepare('SELECT COUNT(*) as c FROM diary').get().c;
  const planCount = db.prepare('SELECT COUNT(*) as c FROM plans').get().c;
  const milestoneCount = db.prepare('SELECT COUNT(*) as c FROM milestones').get().c;
  const recentDiary = db.prepare(`
    SELECT d.*, k.name as kid_name FROM diary d
    JOIN kids k ON d.kid_id = k.id
    ORDER BY d.date DESC, d.created_at DESC LIMIT 10
  `).all();
  const upcomingPlans = db.prepare(`
    SELECT p.*, k.name as kid_name FROM plans p
    JOIN kids k ON p.kid_id = k.id
    WHERE p.status != 'done' AND p.target_date >= date('now','localtime')
    ORDER BY p.target_date ASC LIMIT 10
  `).all();
  res.json({ kidCount, diaryCount, planCount, milestoneCount, recentDiary, upcomingPlans });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧒 Kid Journey running at http://0.0.0.0:${PORT}`);
});
