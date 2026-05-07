/**
 * Photo processing service
 * Handles thumbnail generation, EXIF extraction, and file management
 * @module services/PhotoService
 */
const sharp = require('sharp');
const exifReader = require('exif-reader');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const THUMBNAIL_MAX_WIDTH = 400;
const THUMBNAIL_MAX_HEIGHT = 400;
const THUMBNAIL_QUALITY = 80;

/**
 * Extract EXIF data from image buffer
 * Returns object with exifDate (YYYY-MM-DD HH:mm) and cameraModel
 * @param {Buffer} buffer
 * @returns {Promise<{exifDate: string|null, cameraModel: string|null}>}
 */
async function extractExifData(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.exif) {
      const exif = exifReader(metadata.exif);
      let date = null;
      let model = null;

      if (exif.Photo && exif.Photo.DateTimeOriginal) {
        const d = new Date(exif.Photo.DateTimeOriginal);
        if (!isNaN(d.getTime())) {
          date = d.getFullYear() + '-' + 
                 String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(d.getDate()).padStart(2, '0') + ' ' + 
                 String(d.getHours()).padStart(2, '0') + ':' + 
                 String(d.getMinutes()).padStart(2, '0');
        }
      }

      if (exif.Image) {
        const make = exif.Image.Make ? exif.Image.Make.replace(/\0/g, '').trim() : '';
        const mod = exif.Image.Model ? exif.Image.Model.replace(/\0/g, '').trim() : '';
        if (make && mod) {
          model = mod.toLowerCase().startsWith(make.toLowerCase()) ? mod : `${make} ${mod}`;
        } else {
          model = make || mod || null;
        }
      }

      return { exifDate: date, cameraModel: model };
    }
  } catch (e) {
    // Not a valid image or no EXIF — that's fine
  }
  return { exifDate: null, cameraModel: null };
}

/**
 * Get image dimensions
 * @param {Buffer} buffer
 * @returns {Promise<{width: number, height: number}|null>}
 */
async function getImageDimensions(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    const isRotated = [5, 6, 7, 8].includes(metadata.orientation);
    return { 
      width: isRotated ? metadata.height : metadata.width, 
      height: isRotated ? metadata.width : metadata.height 
    };
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
      .rotate()
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
    // Extract EXIF data
    const exifData = await extractExifData(buffer);
    result.exifDate = exifData.exifDate;
    result.cameraModel = exifData.cameraModel;

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
  extractExifData,
  getImageDimensions,
  deleteFiles,
  getMimeType,
};
