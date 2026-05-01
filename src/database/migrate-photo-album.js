#!/usr/bin/env node
/**
 * Photo Album Enhancement Migration
 * Adds: albums, album_photos, photo_tags tables + extends photos table
 * Safe: ALTER TABLE with IF NOT EXISTS, only adds new columns/tables
 * @module database/migrate-photo-album
 */
const { getDb } = require('./connection');

function runPhotoAlbumMigration(existingDb) {
  const db = existingDb || getDb();
  console.log('🔄 Running Photo Album migration...\n');

  // ===== Extend photos table =====
  const photoCols = db.prepare("PRAGMA table_info(photos)").all().map(c => c.name);

  if (!photoCols.includes('thumbnail_path')) {
    db.exec("ALTER TABLE photos ADD COLUMN thumbnail_path TEXT");
    console.log('  + photos.thumbnail_path');
  }
  if (!photoCols.includes('file_type')) {
    db.exec("ALTER TABLE photos ADD COLUMN file_type TEXT DEFAULT 'image'");
    console.log('  + photos.file_type');
  }
  if (!photoCols.includes('file_size')) {
    db.exec("ALTER TABLE photos ADD COLUMN file_size INTEGER DEFAULT 0");
    console.log('  + photos.file_size');
  }
  if (!photoCols.includes('exif_date')) {
    db.exec("ALTER TABLE photos ADD COLUMN exif_date TEXT");
    console.log('  + photos.exif_date');
  }
  if (!photoCols.includes('width')) {
    db.exec("ALTER TABLE photos ADD COLUMN width INTEGER");
    console.log('  + photos.width');
  }
  if (!photoCols.includes('height')) {
    db.exec("ALTER TABLE photos ADD COLUMN height INTEGER");
    console.log('  + photos.height');
  }
  if (!photoCols.includes('duration')) {
    db.exec("ALTER TABLE photos ADD COLUMN duration REAL");
    console.log('  + photos.duration (video seconds)');
  }
  console.log('✅ photos table extended');

  // ===== Albums table (virtual albums) =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_photo_id INTEGER,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT '📁',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
      FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL
    );
  `);
  console.log('✅ Table: albums');

  // ===== Album-Photos junction table =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS album_photos (
      album_id INTEGER NOT NULL,
      photo_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (album_id, photo_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Table: album_photos');

  // ===== Photo tags table =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS photo_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'event',
      color TEXT DEFAULT '#8b5cf6',
      icon TEXT DEFAULT '🏷️',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
      UNIQUE(kid_id, name, type)
    );
  `);
  console.log('✅ Table: photo_tags');

  // ===== Photo-Tag junction table =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS photo_tag_links (
      photo_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (photo_id, tag_id),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES photo_tags(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Table: photo_tag_links');

  // ===== Indexes =====
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_albums_kid ON albums(kid_id);
    CREATE INDEX IF NOT EXISTS idx_album_photos_photo ON album_photos(photo_id);
    CREATE INDEX IF NOT EXISTS idx_photo_tags_kid ON photo_tags(kid_id);
    CREATE INDEX IF NOT EXISTS idx_photo_tag_links_tag ON photo_tag_links(tag_id);
    CREATE INDEX IF NOT EXISTS idx_photos_kid_date ON photos(kid_id, date);
    CREATE INDEX IF NOT EXISTS idx_photos_file_type ON photos(kid_id, file_type);
  `);
  console.log('✅ Indexes created');

  console.log('\n🎉 Photo Album migration complete!');
}

if (require.main === module) {
  runPhotoAlbumMigration();
  const { closeDb } = require('./connection');
  closeDb();
}

module.exports = { runPhotoAlbumMigration };
