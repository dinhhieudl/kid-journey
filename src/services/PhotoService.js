/**
 * Photo processing service
 * Handles thumbnail generation, EXIF extraction, and file management
 * @module services/PhotoService
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const THUMBNAIL_MAX_WIDTH = 400;
const THUMBNAIL_MAX_HEIGHT = 400;
const THUMBNAIL_QUALITY = 80;

/**
 * Extract EXIF date from image buffer
 * Returns ISO date string (YYYY-MM-DD) or null
 * @param {Buffer} buffer
 * @returns {Promise<string|null>}
 */
async function extractExifDate(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    // sharp exposes exif as a Buffer; look for DateTimeOriginal
    if (metadata.exif) {
      const exifStr = metadata.exif.toString('latin1');
      // Search for DateTimeOriginal (tag 0x9003) or DateTime (tag 0x0132)
      const dateMatch = exifStr.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${year}-${month}-${day}`;
      }
    }
  } catch (e) {
    // Not a valid image or no EXIF — that's fine
  }
  return null;
}

/**
 * Get image dimensions
 * @param {Buffer} buffer
 * @returns {Promise<{width: number, height: number}|null>}
 */
async function getImageDimensions(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (e) {
    return null;
  }
}

/**
 * Generate thumbnail for an image file
 * Returns the thumbnail filename
 * @param {string} sourceFilename - Original filename in uploads dir
 * @param {Buffer} [buffer] - Optional pre-read buffer (saves a disk read)
 * @returns {Promise<string|null>} Thumbnail filename or null
 */
async function generateThumbnail(sourceFilename, buffer) {
  try {
    const sourcePath = path.join(config.UPLOADS_DIR, sourceFilename);
    if (!buffer && fs.existsSync(sourcePath)) {
      buffer = fs.readFileSync(sourcePath);
    }
    if (!buffer) return null;

    const ext = path.extname(sourceFilename);
    const baseName = path.basename(sourceFilename, ext);
    const thumbFilename = `${baseName}_thumb${ext}`;
    const thumbPath = path.join(config.UPLOADS_DIR, thumbFilename);

    await sharp(buffer)
      .resize(THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbPath.replace(ext, '.jpg'));

    // Return the actual filename with .jpg extension
    const finalThumbName = `${baseName}_thumb.jpg`;
    return finalThumbName;
  } catch (e) {
    console.error('Thumbnail generation failed:', e.message);
    return null;
  }
}

/**
 * Process uploaded photo: extract EXIF, generate thumbnail, get dimensions
 * @param {object} file - multer file object
 * @returns {Promise<object>} Processing results
 */
async function processUpload(file) {
  const buffer = fs.readFileSync(file.path);
  const isVideo = /\.(mp4|mov|avi)$/i.test(file.originalname);

  const result = {
    fileType: isVideo ? 'video' : 'image',
    fileSize: file.size,
    exifDate: null,
    thumbnailPath: null,
    width: null,
    height: null,
    duration: null,
  };

  if (!isVideo) {
    // Extract EXIF date
    result.exifDate = await extractExifDate(buffer);

    // Get dimensions
    const dims = await getImageDimensions(buffer);
    if (dims) {
      result.width = dims.width;
      result.height = dims.height;
    }

    // Generate thumbnail
    result.thumbnailPath = await generateThumbnail(file.filename, buffer);
  }

  return result;
}

/**
 * Delete photo file and its thumbnail
 * @param {string} filename
 * @param {string} [thumbnailPath]
 */
function deleteFiles(filename, thumbnailPath) {
  const filePath = path.join(config.UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  if (thumbnailPath) {
    const thumbPath = path.join(config.UPLOADS_DIR, thumbnailPath);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  }
}

/**
 * Get MIME type for a file
 * @param {string} filename
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

module.exports = {
  processUpload,
  generateThumbnail,
  extractExifDate,
  getImageDimensions,
  deleteFiles,
  getMimeType,
};
