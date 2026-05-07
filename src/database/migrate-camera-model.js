const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const PhotoService = require('../services/PhotoService');

async function migrateCameraModel() {
  console.log('Starting camera_model migration...');
  const db = new Database(config.DB_PATH);
  
  // 1. Check if column exists, if not add it
  const photoCols = db.pragma('table_info(photos)').map(c => c.name);
  if (!photoCols.includes('camera_model')) {
    db.exec("ALTER TABLE photos ADD COLUMN camera_model TEXT");
    console.log('Added column camera_model to photos table.');
  } else {
    console.log('Column camera_model already exists.');
  }

  // 2. Process all images
  const photos = db.prepare("SELECT id, filename FROM photos WHERE file_type = 'image'").all();
  console.log(`Found ${photos.length} image photos to update.`);

  let updatedCount = 0;
  for (const photo of photos) {
    try {
      const filePath = path.join(config.UPLOADS_DIR, photo.filename);
      if (!fs.existsSync(filePath)) {
        console.log(`File missing: ${photo.filename}`);
        continue;
      }
      
      const buffer = fs.readFileSync(filePath);
      const exifData = await PhotoService.extractExifData(buffer);
      
      db.prepare('UPDATE photos SET camera_model = ?, exif_date = ? WHERE id = ?').run(exifData.cameraModel, exifData.exifDate, photo.id);
      
      updatedCount++;
      if (updatedCount % 10 === 0) console.log(`Processed ${updatedCount}/${photos.length}...`);
    } catch (e) {
      console.error(`Error processing photo ${photo.id}: ${e.message}`);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} photos.`);
  db.close();
}

migrateCameraModel();
