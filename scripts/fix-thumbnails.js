const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Database = require('better-sqlite3');
const config = require('../src/config');
const PhotoService = require('../src/services/PhotoService');

async function fixThumbnails() {
  const db = new Database(config.DB_PATH);
  
  // Get all images (not videos)
  const photos = db.prepare(`SELECT id, filename, thumbnail_path, width, height FROM photos WHERE file_type = 'image'`).all();
  
  console.log(`Found ${photos.length} images to check.`);
  let updatedCount = 0;
  
  for (const photo of photos) {
    try {
      const filePath = path.join(config.UPLOADS_DIR, photo.filename);
      if (!fs.existsSync(filePath)) {
        console.log(`File missing: ${photo.filename}`);
        continue;
      }
      
      const buffer = fs.readFileSync(filePath);
      const metadata = await sharp(buffer).metadata();
      
      const isRotated = [5, 6, 7, 8].includes(metadata.orientation);
      
      const correctWidth = isRotated ? metadata.height : metadata.width;
      const correctHeight = isRotated ? metadata.width : metadata.height;
      
      let needsUpdate = false;
      
      if (photo.width !== correctWidth || photo.height !== correctHeight) {
        db.prepare('UPDATE photos SET width = ?, height = ? WHERE id = ?').run(correctWidth, correctHeight, photo.id);
        needsUpdate = true;
      }
      
      // Always regenerate thumbnail with .rotate() applied to fix the orientation issue in existing thumbnails
      await PhotoService.generateThumbnail(photo.filename, buffer);
      
      if (needsUpdate) {
        updatedCount++;
        console.log(`Updated photo ${photo.id}: ${photo.width}x${photo.height} -> ${correctWidth}x${correctHeight}`);
      }
    } catch (e) {
      console.error(`Error processing photo ${photo.id}: ${e.message}`);
    }
  }
  
  console.log(`Done. Updated ${updatedCount} photos and regenerated all image thumbnails.`);
  db.close();
}

fixThumbnails();
