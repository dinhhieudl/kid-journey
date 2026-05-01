/**
 * Photos routes - Enhanced Photo Album System
 * CRUD + Albums + Tags + Bulk operations + Share
 * @module routes/photos
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router({ mergeParams: true });
const { asyncHandler } = require('../middleware/errorHandler');
const { authorizeKid } = require('../middleware/auth');
const PhotoRepository = require('../repositories/PhotoRepository');
const PhotoService = require('../services/PhotoService');
const config = require('../config');

// Multer config — supports images + videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|avi)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// ===================== PHOTOS CRUD =====================

/**
 * GET /api/kids/:kidId/photos
 * List all photos with tags, optionally grouped by date
 * Query: ?groupedByDate=true
 */
router.get('/', authorizeKid, asyncHandler(async (req, res) => {
  const grouped = req.query.groupedByDate === 'true';
  if (grouped) {
    const groups = PhotoRepository.findByKidIdGroupedByDate(req.params.kidId);
    return res.json(groups);
  }
  const rows = PhotoRepository.findByKidId(req.params.kidId);
  res.json(rows);
}));

/**
 * GET /api/kids/:kidId/photos/stats
 * Photo statistics
 */
router.get('/stats', authorizeKid, asyncHandler(async (req, res) => {
  const stats = PhotoRepository.getStats(req.params.kidId);
  res.json(stats);
}));

/**
 * POST /api/kids/:kidId/photos
 * Upload one or more photos/videos
 * Supports multipart with multiple files
 */
router.post('/', authorizeKid, upload.array('photo', 50), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { caption, date, category, album_id, tag_ids } = req.body;
  const results = [];

  for (const file of req.files) {
    // Process: EXIF, thumbnail, dimensions
    const processed = await PhotoService.processUpload(file);

    const result = PhotoRepository.create({
      kid_id: req.params.kidId,
      filename: file.filename,
      original_name: file.originalname,
      caption: caption || '',
      date: date || processed.exifDate || new Date().toISOString().slice(0, 10),
      category: category || 'general',
      thumbnail_path: processed.thumbnailPath,
      file_type: processed.fileType,
      file_size: processed.fileSize,
      exif_date: processed.exifDate,
      width: processed.width,
      height: processed.height,
      duration: processed.duration,
    });

    const photoId = result.lastInsertRowid;

    // Add to album if specified
    if (album_id) {
      PhotoRepository.addPhotosToAlbum(Number(album_id), [photoId]);
    }

    // Add tags if specified
    if (tag_ids) {
      const tids = Array.isArray(tag_ids) ? tag_ids.map(Number) : [Number(tag_ids)];
      PhotoRepository.addTagsToPhotos([photoId], tids);
    }

    results.push({
      id: photoId,
      filename: file.filename,
      thumbnail: processed.thumbnailPath,
      fileType: processed.fileType,
      exifDate: processed.exifDate,
    });
  }

  res.json({
    ok: true,
    count: results.length,
    photos: results,
    suggestedDate: results[0]?.exifDate || null,
  });
}));

/**
 * PUT /api/kids/:kidId/photos/:photoId
 * Update photo metadata
 */
router.put('/:photoId', authorizeKid, asyncHandler(async (req, res) => {
  const { caption, date, category } = req.body;
  PhotoRepository.update(req.params.photoId, { caption, date, category });
  res.json({ ok: true });
}));

/**
 * DELETE /api/kids/:kidId/photos/:photoId
 * Delete a single photo
 */
router.delete('/:photoId', authorizeKid, asyncHandler(async (req, res) => {
  PhotoRepository.remove(req.params.photoId);
  res.json({ ok: true });
}));

// ===================== BULK OPERATIONS =====================

/**
 * POST /api/kids/:kidId/photos/bulk/delete
 * Delete multiple photos
 * Body: { ids: [1, 2, 3] }
 */
router.post('/bulk/delete', authorizeKid, asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No photo IDs provided' });
  }
  const count = PhotoRepository.bulkRemove(ids);
  res.json({ ok: true, deleted: count });
}));

/**
 * POST /api/kids/:kidId/photos/bulk/tag
 * Add/remove tags from multiple photos
 * Body: { photo_ids: [1,2], tag_ids: [3,4], action: 'add'|'remove' }
 */
router.post('/bulk/tag', authorizeKid, asyncHandler(async (req, res) => {
  const { photo_ids, tag_ids, action } = req.body;
  if (!photo_ids?.length || !tag_ids?.length) {
    return res.status(400).json({ error: 'Missing photo_ids or tag_ids' });
  }
  if (action === 'remove') {
    PhotoRepository.removeTagsFromPhotos(photo_ids, tag_ids);
  } else {
    PhotoRepository.addTagsToPhotos(photo_ids, tag_ids);
  }
  res.json({ ok: true });
}));

/**
 * POST /api/kids/:kidId/photos/bulk/album
 * Add/remove photos from an album
 * Body: { photo_ids: [1,2], album_id: 3, action: 'add'|'remove' }
 */
router.post('/bulk/album', authorizeKid, asyncHandler(async (req, res) => {
  const { photo_ids, album_id, action } = req.body;
  if (!photo_ids?.length || !album_id) {
    return res.status(400).json({ error: 'Missing photo_ids or album_id' });
  }
  if (action === 'remove') {
    PhotoRepository.removePhotosFromAlbum(album_id, photo_ids);
  } else {
    PhotoRepository.addPhotosToAlbum(album_id, photo_ids);
  }
  res.json({ ok: true });
}));

// ===================== ALBUMS =====================

/**
 * GET /api/kids/:kidId/photos/albums
 * List all albums
 */
router.get('/albums', authorizeKid, asyncHandler(async (req, res) => {
  const albums = PhotoRepository.findAlbumsByKidId(req.params.kidId);
  res.json(albums);
}));

/**
 * POST /api/kids/:kidId/photos/albums
 * Create a new album
 */
router.post('/albums', authorizeKid, asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Album name is required' });
  const result = PhotoRepository.createAlbum({
    kid_id: req.params.kidId, name, description, color, icon,
  });
  res.json({ id: result.lastInsertRowid, ok: true });
}));

/**
 * GET /api/kids/:kidId/photos/albums/:albumId
 * Get album details with photos
 */
router.get('/albums/:albumId', authorizeKid, asyncHandler(async (req, res) => {
  const album = PhotoRepository.findAlbumById(req.params.albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const photos = PhotoRepository.findAlbumPhotos(req.params.albumId);
  res.json({ ...album, photos });
}));

/**
 * PUT /api/kids/:kidId/photos/albums/:albumId
 * Update album
 */
router.put('/albums/:albumId', authorizeKid, asyncHandler(async (req, res) => {
  const { name, description, cover_photo_id, color, icon } = req.body;
  PhotoRepository.updateAlbum(req.params.albumId, { name, description, cover_photo_id, color, icon });
  res.json({ ok: true });
}));

/**
 * DELETE /api/kids/:kidId/photos/albums/:albumId
 * Delete album (photos are kept — virtual album)
 */
router.delete('/albums/:albumId', authorizeKid, asyncHandler(async (req, res) => {
  PhotoRepository.deleteAlbum(req.params.albumId);
  res.json({ ok: true });
}));

// ===================== TAGS =====================

/**
 * GET /api/kids/:kidId/photos/tags
 * List all tags
 */
router.get('/tags', authorizeKid, asyncHandler(async (req, res) => {
  const tags = PhotoRepository.findTagsByKidId(req.params.kidId);
  res.json(tags);
}));

/**
 * POST /api/kids/:kidId/photos/tags
 * Create a new tag
 */
router.post('/tags', authorizeKid, asyncHandler(async (req, res) => {
  const { name, type, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Tag name is required' });
  const result = PhotoRepository.createTag({
    kid_id: req.params.kidId, name, type, color, icon,
  });
  res.json({ id: result.lastInsertRowid, ok: true });
}));

/**
 * DELETE /api/kids/:kidId/photos/tags/:tagId
 * Delete a tag
 */
router.delete('/tags/:tagId', authorizeKid, asyncHandler(async (req, res) => {
  PhotoRepository.deleteTag(req.params.tagId);
  res.json({ ok: true });
}));

// ===================== SHARE =====================

/**
 * GET /api/kids/:kidId/photos/:photoId/share
 * Get shareable link/info for a photo
 */
router.get('/:photoId/share', authorizeKid, asyncHandler(async (req, res) => {
  const photo = PhotoRepository.findById(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const shareUrl = `${baseUrl}/uploads/${photo.filename}`;
  const thumbnailUrl = photo.thumbnail_path
    ? `${baseUrl}/uploads/${photo.thumbnail_path}`
    : shareUrl;
  res.json({
    shareUrl,
    thumbnailUrl,
    filename: photo.filename,
    caption: photo.caption,
    date: photo.date,
    fileType: photo.file_type,
  });
}));

/**
 * GET /api/kids/:kidId/photos/albums/:albumId/share
 * Get share info for an entire album
 */
router.get('/albums/:albumId/share', authorizeKid, asyncHandler(async (req, res) => {
  const album = PhotoRepository.findAlbumById(req.params.albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const photos = PhotoRepository.findAlbumPhotos(req.params.albumId);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    albumName: album.name,
    photoCount: photos.length,
    photos: photos.map(p => ({
      shareUrl: `${baseUrl}/uploads/${p.filename}`,
      thumbnailUrl: p.thumbnail_path ? `${baseUrl}/uploads/${p.thumbnail_path}` : null,
      caption: p.caption,
      date: p.date,
    })),
  });
}));

module.exports = router;
