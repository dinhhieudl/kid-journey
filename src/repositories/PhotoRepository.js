/**
 * Photo repository - CRUD + advanced operations for photos, albums, tags
 * @module repositories/PhotoRepository
 */
const { getDb } = require('../database/connection');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// ===================== PHOTOS =====================

/**
 * Get all photos for a kid (with tags)
 * @param {number} kidId
 * @returns {object[]}
 */
function findByKidId(kidId) {
  const db = getDb();
  const photos = db.prepare(`
    SELECT p.*,
      GROUP_CONCAT(DISTINCT pt.name) as tag_names,
      GROUP_CONCAT(DISTINCT pt.type) as tag_types,
      GROUP_CONCAT(DISTINCT pt.color) as tag_colors
    FROM photos p
    LEFT JOIN photo_tag_links ptl ON p.id = ptl.photo_id
    LEFT JOIN photo_tags pt ON ptl.tag_id = pt.id
    WHERE p.kid_id = ?
    GROUP BY p.id
    ORDER BY p.date DESC, p.created_at DESC
  `).all(kidId);

  return photos.map(p => ({
    ...p,
    tags: p.tag_names ? p.tag_names.split(',').map((name, i) => ({
      name,
      type: p.tag_types.split(',')[i],
      color: p.tag_colors.split(',')[i],
    })) : [],
    tag_names: undefined,
    tag_types: undefined,
    tag_colors: undefined,
  }));
}

/**
 * Find a photo by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(id) {
  return getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

/**
 * Create a new photo record
 * @param {object} params
 * @returns {object} { lastInsertRowid }
 */
function create({ kid_id, filename, original_name, caption, date, category, thumbnail_path, file_type, file_size, exif_date, camera_model, width, height, duration }) {
  return getDb().prepare(`
    INSERT INTO photos (kid_id, filename, original_name, caption, date, category, thumbnail_path, file_type, file_size, exif_date, camera_model, width, height, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(kid_id, filename, original_name, caption, date, category, thumbnail_path || null, file_type || 'image', file_size || 0, exif_date || null, camera_model || null, width || null, height || null, duration || null);
}

/**
 * Update photo metadata
 * @param {number} id
 * @param {object} fields
 */
function update(id, fields) {
  const allowed = ['caption', 'date', 'category'];
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * Delete a photo record, its file, and thumbnail
 * @param {number} id
 */
function remove(id) {
  const db = getDb();
  const photo = db.prepare('SELECT filename, thumbnail_path FROM photos WHERE id = ?').get(id);
  if (photo) {
    const fp = path.join(config.UPLOADS_DIR, photo.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    if (photo.thumbnail_path) {
      const tp = path.join(config.UPLOADS_DIR, photo.thumbnail_path);
      if (fs.existsSync(tp)) fs.unlinkSync(tp);
    }
  }
  db.prepare('DELETE FROM photo_tag_links WHERE photo_id = ?').run(id);
  db.prepare('DELETE FROM album_photos WHERE photo_id = ?').run(id);
  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
}

/**
 * Bulk delete photos
 * @param {number[]} ids
 * @returns {number} Count of deleted photos
 */
function bulkRemove(ids) {
  const db = getDb();
  let count = 0;
  const delTransaction = db.transaction((photoIds) => {
    for (const id of photoIds) {
      const photo = db.prepare('SELECT filename, thumbnail_path FROM photos WHERE id = ?').get(id);
      if (photo) {
        const fp = path.join(config.UPLOADS_DIR, photo.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
        if (photo.thumbnail_path) {
          const tp = path.join(config.UPLOADS_DIR, photo.thumbnail_path);
          if (fs.existsSync(tp)) fs.unlinkSync(tp);
        }
        db.prepare('DELETE FROM photo_tag_links WHERE photo_id = ?').run(id);
        db.prepare('DELETE FROM album_photos WHERE photo_id = ?').run(id);
        db.prepare('DELETE FROM photos WHERE id = ?').run(id);
        count++;
      }
    }
  });
  delTransaction(ids);
  return count;
}

/**
 * Get photos grouped by date for timeline view
 * @param {number} kidId
 * @returns {object[]} Array of { date, photos: [] }
 */
function findByKidIdGroupedByDate(kidId) {
  const photos = findByKidId(kidId);
  const groups = {};
  for (const p of photos) {
    const dateKey = p.date || 'unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(p);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, photos]) => ({ date, photos }));
}

// ===================== ALBUMS =====================

/**
 * Get all albums for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findAlbumsByKidId(kidId) {
  const db = getDb();
  return db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count,
      (SELECT p.thumbnail_path FROM photos p WHERE p.id = a.cover_photo_id) as cover_thumbnail,
      (SELECT p.filename FROM photos p WHERE p.id = a.cover_photo_id) as cover_filename
    FROM albums a
    WHERE a.kid_id = ?
    ORDER BY a.sort_order ASC, a.created_at DESC
  `).all(kidId);
}

/**
 * Find album by ID
 * @param {number} id
 * @returns {object|undefined}
 */
function findAlbumById(id) {
  return getDb().prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM album_photos WHERE album_id = a.id) as photo_count
    FROM albums a WHERE a.id = ?
  `).get(id);
}

/**
 * Get photos in an album
 * @param {number} albumId
 * @returns {object[]}
 */
function findAlbumPhotos(albumId) {
  return getDb().prepare(`
    SELECT p.*, ap.sort_order, ap.added_at
    FROM album_photos ap
    JOIN photos p ON ap.photo_id = p.id
    WHERE ap.album_id = ?
    ORDER BY ap.sort_order ASC, p.date DESC
  `).all(albumId);
}

/**
 * Create a new album
 * @param {object} params
 * @returns {object}
 */
function createAlbum({ kid_id, name, description, color, icon }) {
  return getDb().prepare(`
    INSERT INTO albums (kid_id, name, description, color, icon)
    VALUES (?, ?, ?, ?, ?)
  `).run(kid_id, name, description || null, color || '#6366f1', icon || '📁');
}

/**
 * Update an album
 * @param {number} id
 * @param {object} fields
 */
function updateAlbum(id, fields) {
  const allowed = ['name', 'description', 'cover_photo_id', 'color', 'icon', 'sort_order'];
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now','localtime')");
  values.push(id);
  getDb().prepare(`UPDATE albums SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * Delete an album (not the photos — virtual album)
 * @param {number} id
 */
function deleteAlbum(id) {
  getDb().prepare('DELETE FROM album_photos WHERE album_id = ?').run(id);
  getDb().prepare('DELETE FROM albums WHERE id = ?').run(id);
}

/**
 * Add photos to an album
 * @param {number} albumId
 * @param {number[]} photoIds
 */
function addPhotosToAlbum(albumId, photoIds) {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO album_photos (album_id, photo_id) VALUES (?, ?)');
  const addMany = db.transaction((ids) => {
    for (const photoId of ids) {
      insert.run(albumId, photoId);
    }
  });
  addMany(photoIds);
}

/**
 * Remove photos from an album
 * @param {number} albumId
 * @param {number[]} photoIds
 */
function removePhotosFromAlbum(albumId, photoIds) {
  const db = getDb();
  const del = db.prepare('DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?');
  const removeMany = db.transaction((ids) => {
    for (const photoId of ids) {
      del.run(albumId, photoId);
    }
  });
  removeMany(photoIds);
}

// ===================== TAGS =====================

/**
 * Get all tags for a kid
 * @param {number} kidId
 * @returns {object[]}
 */
function findTagsByKidId(kidId) {
  return getDb().prepare(`
    SELECT pt.*,
      (SELECT COUNT(*) FROM photo_tag_links WHERE tag_id = pt.id) as usage_count
    FROM photo_tags pt
    WHERE pt.kid_id = ?
    ORDER BY usage_count DESC, pt.name ASC
  `).all(kidId);
}

/**
 * Create a tag
 * @param {object} params
 * @returns {object}
 */
function createTag({ kid_id, name, type, color, icon }) {
  return getDb().prepare(`
    INSERT INTO photo_tags (kid_id, name, type, color, icon)
    VALUES (?, ?, ?, ?, ?)
  `).run(kid_id, name, type || 'event', color || '#8b5cf6', icon || '🏷️');
}

/**
 * Delete a tag
 * @param {number} id
 */
function deleteTag(id) {
  getDb().prepare('DELETE FROM photo_tag_links WHERE tag_id = ?').run(id);
  getDb().prepare('DELETE FROM photo_tags WHERE id = ?').run(id);
}

/**
 * Add tags to photos
 * @param {number[]} photoIds
 * @param {number[]} tagIds
 */
function addTagsToPhotos(photoIds, tagIds) {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO photo_tag_links (photo_id, tag_id) VALUES (?, ?)');
  const addMany = db.transaction((pids, tids) => {
    for (const pid of pids) {
      for (const tid of tids) {
        insert.run(pid, tid);
      }
    }
  });
  addMany(photoIds, tagIds);
}

/**
 * Remove tags from photos
 * @param {number[]} photoIds
 * @param {number[]} tagIds
 */
function removeTagsFromPhotos(photoIds, tagIds) {
  const db = getDb();
  const del = db.prepare('DELETE FROM photo_tag_links WHERE photo_id = ? AND tag_id = ?');
  const removeMany = db.transaction((pids, tids) => {
    for (const pid of pids) {
      for (const tid of tids) {
        del.run(pid, tid);
      }
    }
  });
  removeMany(photoIds, tagIds);
}

// ===================== STATS =====================

/**
 * Get photo stats for a kid
 * @param {number} kidId
 * @returns {object}
 */
function getStats(kidId) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM photos WHERE kid_id = ?').get(kidId).c;
  const images = db.prepare("SELECT COUNT(*) as c FROM photos WHERE kid_id = ? AND file_type = 'image'").get(kidId).c;
  const videos = db.prepare("SELECT COUNT(*) as c FROM photos WHERE kid_id = ? AND file_type = 'video'").get(kidId).c;
  const totalSize = db.prepare('SELECT COALESCE(SUM(file_size), 0) as s FROM photos WHERE kid_id = ?').get(kidId).s;
  const albumCount = db.prepare('SELECT COUNT(*) as c FROM albums WHERE kid_id = ?').get(kidId).c;
  const tagCount = db.prepare('SELECT COUNT(*) as c FROM photo_tags WHERE kid_id = ?').get(kidId).c;

  return { total, images, videos, totalSize, albumCount, tagCount };
}

module.exports = {
  // Photos
  findByKidId,
  findById,
  create,
  update,
  remove,
  bulkRemove,
  findByKidIdGroupedByDate,
  // Albums
  findAlbumsByKidId,
  findAlbumById,
  findAlbumPhotos,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addPhotosToAlbum,
  removePhotosFromAlbum,
  // Tags
  findTagsByKidId,
  createTag,
  deleteTag,
  addTagsToPhotos,
  removeTagsFromPhotos,
  // Stats
  getStats,
};
