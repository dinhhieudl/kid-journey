/**
 * SQLite database singleton connection
 * @module database/connection
 */
const Database = require('better-sqlite3');
const config = require('../config');
const fs = require('fs');

// Ensure data directory exists
fs.mkdirSync(config.DATA_DIR, { recursive: true });
fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });

/** @type {import('better-sqlite3').Database} */
let db = null;

/**
 * Get the database singleton instance
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  if (!db) {
    db = new Database(config.DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
