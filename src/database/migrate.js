#!/usr/bin/env node
/**
 * Database Migration Script
 * Creates all tables for Phase 1 (Auth) and Phase 2 (Growth WHO, Montessori Tracking)
 * Safe: only creates new tables, does not delete/modify existing ones
 * @module database/migrate
 */
const { getDb, closeDb } = require('./connection');
const path = require('path');
const fs = require('fs');

function runMigration() {
  const db = getDb();

  console.log('🔄 Running migrations...\n');

  // ===== Existing tables (created by server.js) =====
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
  console.log('✅ Tables: kids, diary, plans, milestones, growth, photos');

  // ===== Phase 1: Users & Auth =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT DEFAULT 'parent',
      avatar TEXT DEFAULT '👤',
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
  console.log('✅ Table: users');

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_kids (
      user_id INTEGER NOT NULL,
      kid_id INTEGER NOT NULL,
      relation TEXT DEFAULT 'parent',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (user_id, kid_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Table: user_kids');

  // ===== Phase 2: WHO Growth Reference =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS growth_who_reference (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      indicator TEXT NOT NULL,
      sex INTEGER NOT NULL,
      age_months REAL NOT NULL,
      length_cm REAL,
      l REAL NOT NULL,
      m REAL NOT NULL,
      s REAL NOT NULL,
      UNIQUE(indicator, sex, age_months, length_cm)
    );
  `);
  console.log('✅ Table: growth_who_reference');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_who_lookup
    ON growth_who_reference(indicator, sex, age_months);
  `);
  console.log('✅ Index: idx_who_lookup');

  // ===== Phase 2: Montessori Tracking =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS montessori_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER NOT NULL,
      activity_key TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      completed_at TEXT,
      notes TEXT,
      evidence_photo TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
      UNIQUE(kid_id, activity_key)
    );
  `);
  console.log('✅ Table: montessori_progress');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_montessori_kid
    ON montessori_progress(kid_id, status);
  `);
  console.log('✅ Index: idx_montessori_kid');

  db.exec(`
    CREATE TABLE IF NOT EXISTS montessori_weekly_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      activity_key TEXT NOT NULL,
      planned_day TEXT,
      status TEXT DEFAULT 'planned',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Table: montessori_weekly_plan');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_weekly_plan
    ON montessori_weekly_plan(kid_id, week_start);
  `);
  console.log('✅ Index: idx_weekly_plan');

  // ===== Seed WHO data =====
  const whoDataPath = path.join(__dirname, '..', '..', 'data', 'who-lms-data.json');
  if (fs.existsSync(whoDataPath)) {
    const whoData = JSON.parse(fs.readFileSync(whoDataPath, 'utf8'));
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM growth_who_reference').get().c;

    if (existingCount === 0) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO growth_who_reference (indicator, sex, age_months, length_cm, l, m, s)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          insert.run(row.indicator, row.sex, row.age_months, row.length_cm, row.l, row.m, row.s);
        }
      });
      insertMany(whoData);
      console.log(`\n📊 Seeded ${whoData.length} WHO LMS reference rows`);
    } else {
      console.log(`\n📊 WHO data already exists (${existingCount} rows), skipping seed`);
    }
  } else {
    console.log('\n⚠️  who-lms-data.json not found.');
  }

  // ===== Add indexes to existing tables =====
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_diary_kid_date ON diary(kid_id, date);
    CREATE INDEX IF NOT EXISTS idx_growth_kid_date ON growth(kid_id, date);
    CREATE INDEX IF NOT EXISTS idx_plans_kid_status ON plans(kid_id, status);
    CREATE INDEX IF NOT EXISTS idx_milestones_kid ON milestones(kid_id);
    CREATE INDEX IF NOT EXISTS idx_photos_kid ON photos(kid_id);
  `);
  console.log('\n✅ Added indexes to existing tables');

  console.log('\n🎉 Migration complete!');
  closeDb();
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
