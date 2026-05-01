# 📷 Photo Album Enhancement — Hướng dẫn kiểm thử

## 1. Cài đặt & khởi động

```bash
# Cài dependencies mới (sharp cho thumbnail generation)
npm install

# Chạy migration (tạo bảng mới + mở rộng bảng photos)
npm run migrate

# Khởi động server
npm run dev
```

## 2. Kiểm tra Database Schema

```bash
# Kiểm tra bảng mới đã tạo
sqlite3 data/kidjourney.db ".tables"
# Mong đợi: albums, album_photos, photo_tags, photo_tag_links, photos, ...

# Kiểm tra cấu trúc bảng photos (có thêm columns mới)
sqlite3 data/kidjourney.db "PRAGMA table_info(photos);"
# Mong đợi: thumbnail_path, file_type, file_size, exif_date, width, height, duration

# Kiểm tra bảng albums
sqlite3 data/kidjourney.db "PRAGMA table_info(albums);"

# Kiểm tra bảng photo_tags
sqlite3 data/kidjourney.db "PRAGMA table_info(photo_tags);"
```

## 3. Kiểm thử API

### 3.1 Upload ảnh (với thumbnail generation)

```bash
# Upload 1 ảnh
curl -X POST http://localhost:3107/api/kids/1/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@test-image.jpg" \
  -F "caption=Kỷ niệm đáng nhớ" \
  -F "date=2026-05-01"

# Mong đợi response:
# {
#   "ok": true,
#   "count": 1,
#   "photos": [{
#     "id": 1,
#     "filename": "1714567890-abc123.jpg",
#     "thumbnail": "1714567890-abc123_thumb.jpg",
#     "fileType": "image",
#     "exifDate": "2026-05-01"  // nếu ảnh có EXIF
#   }],
#   "suggestedDate": "2026-05-01"
# }
```

**Kiểm tra thumbnail đã tạo:**
```bash
ls -la data/uploads/*_thumb.jpg
# Mong thấy file thumbnail tồn tại
```

### 3.2 Upload nhiều ảnh (bulk upload)

```bash
curl -X POST http://localhost:3107/api/kids/1/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@image1.jpg" \
  -F "photo=@image2.jpg" \
  -F "photo=@image3.jpg" \
  -F "caption=Album du lịch"

# Mong đợi: "count": 3
```

### 3.3 Upload video

```bash
curl -X POST http://localhost:3107/api/kids/1/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@video.mp4" \
  -F "caption=Bé tập đi"

# Mong đợi: fileType = "video", thumbnail = null
```

### 3.4 Albums CRUD

```bash
# Tạo album
curl -X POST http://localhost:3107/api/kids/1/photos/albums \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sinh nhật 2026","description":"Tiệc sinh nhật 2 tuổi","color":"#ec4899"}'

# Liệt kê albums
curl http://localhost:3107/api/kids/1/photos/albums \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Xem album + photos
curl http://localhost:3107/api/kids/1/photos/albums/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Thêm ảnh vào album
curl -X POST http://localhost:3107/api/kids/1/photos/bulk/album \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_ids":[1,2,3],"album_id":1,"action":"add"}'

# Xóa album (không xóa ảnh)
curl -X DELETE http://localhost:3107/api/kids/1/photos/albums/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3.5 Tags CRUD

```bash
# Tạo tag
curl -X POST http://localhost:3107/api/kids/1/photos/tags \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sinh nhật","type":"event","color":"#ec4899"}'

# Liệt kê tags
curl http://localhost:3107/api/kids/1/photos/tags \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Gắn tag cho nhiều ảnh
curl -X POST http://localhost:3107/api/kids/1/photos/bulk/tag \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_ids":[1,2],"tag_ids":[1],"action":"add"}'

# Gỡ tag
curl -X POST http://localhost:3107/api/kids/1/photos/bulk/tag \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_ids":[1],"tag_ids":[1],"action":"remove"}'
```

### 3.6 Bulk Delete

```bash
curl -X POST http://localhost:3107/api/kids/1/photos/bulk/delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":[4,5,6]}'

# Mong đợi: {"ok":true,"deleted":3}
# Kiểm tra file đã xóa: data/uploads/ không còn file tương ứng
```

### 3.7 Photo Stats

```bash
curl http://localhost:3107/api/kids/1/photos/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Mong đợi:
# {"total":10,"images":8,"videos":2,"totalSize":5242880,"albumCount":2,"tagCount":3}
```

### 3.8 Share

```bash
# Share 1 ảnh
curl http://localhost:3107/api/kids/1/photos/1/share \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Share album
curl http://localhost:3107/api/kids/1/photos/albums/1/share \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3.9 Timeline view (grouped by date)

```bash
curl "http://localhost:3107/api/kids/1/photos?groupedByDate=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Mong đợi: Array of { date, photos: [...] }
```

## 4. Kiểm thử Frontend

### 4.1 Truy cập Album ảnh

1. Mở trình duyệt → `http://localhost:3107`
2. Đăng nhập
3. Click **📷 Album ảnh** trong sidebar

### 4.2 Kiểm tra giao diện Timeline

- [ ] Hiển thị ảnh nhóm theo ngày (Masonry layout)
- [] Mỗi nhóm có header: ngày, số lượng, thời gian tương đối
- [] Ảnh có aspect ratio tự nhiên (không crop méo)
- [] Video có badge 🎮 và thời lượng
- [] Tags hiển thị trên ảnh (nếu có)
- [] Stats bar hiển thị đúng: ảnh, video, album, thẻ, dung lượng

### 4.3 Kiểm tra Lightbox

- [] Click 1 ảnh → mở lightbox fullscreen
- [] Vuốt trái/phải (swipe) để chuyển ảnh (trên mobile)
- [] Click nút ‹/› để chuyển ảnh (trên desktop)
- [] Pinch-to-zoom trên mobile
- [] Phím ←/→ trên keyboard
- [] Phím Esc để đóng
- [] Hiển thị caption, ngày, tên file
- [] Thumbnail strip bên dưới
- [] Nút 🗑️ xóa ảnh từ lightbox
- [] Nút ℹ️ xem thông tin chi tiết
- [] Nút 🔗 chia sẻ

### 4.4 Kiểm tra Bulk Operations

- [] Click nút "☑️ Chọn" → hiển thị checkbox trên mỗi ảnh
- [] Click checkbox để chọn/bỏ chọn
- [] Toolbar hiện ở dưới cùng: số ảnh đã chọn + các nút action
- [] Nút "📁 Thêm vào album" → modal chọn album
- [] Nút "🏷️ Gắn thẻ" → modal chọn thẻ (multi-select)
- [] Nút "🗑️ Xóa" → confirm dialog → xóa nhiều ảnh
- [] Nút "✕ Hủy" → thoát selection mode

### 4.5 Kiểm tra Upload (Drag & Drop)

- [] Click "📷 Tải ảnh lên" → modal với dropzone
- [] Kéo thả file vào dropzone (border highlight)
- [] Click dropzone để chọn file
- [] Chọn nhiều file → hiển thị danh sách file
- [] Click "📤 Tải lên" → progress bar chạy
- [] Mỗi file hiện trạng thái: ⏳ → ⬆️ → ✅ hoặc ❌
- [] Tự động đóng modal sau khi upload xong
- [] EXIF date được extract và gợi ý ngày

### 4.6 Kiểm tra Albums

- [] Tab "📁 Album" → hiển thị grid album cards
- [] Click "➕ Tạo album mới" → modal tạo album
- [] Chọn tên, mô tả, màu sắc
- [] Click album → xem ảnh trong album
- [] Quay lại danh sách album
- [] Sửa/xóa album

### 4.7 Kiểm tra Tags

- [] Tab "🏷️ Thẻ" → hiển thị tag chips
- [] Click "➕ Thêm thẻ" → modal tạo thẻ
- [] Chọn tên, loại (event/milestone/location/person), màu
- [] Click tag → filter ảnh theo tag
- [] Click "Tất cả" → hiển thị tất cả ảnh
- [] Xóa tag

### 4.8 Kiểm tra Share

- [] Click nút 🔗 trong lightbox → modal share
- [] Copy link → clipboard
- [] Share Zalo → mở zalo.me
- [] Share Messenger → mở facebook.com
- [] Native share (trên mobile) → hệ thống share sheet

## 5. Kiểm thử Docker

```bash
# Build lại image (có sharp + libvips)
docker-compose build

# Chạy
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f

# Test upload trong Docker
curl -X POST http://localhost:3107/api/kids/1/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@test.jpg"
```

## 6. Kiểm thử Security

```bash
# Không có token → 401
curl http://localhost:3107/api/kids/1/photos
# Mong đợi: {"error":"Vui lòng đăng nhập"}

# Token sai → 401
curl http://localhost:3107/api/kids/1/photos \
  -H "Authorization: Bearer invalid-token"
# Mong đợi: {"error":"Token hết hạn hoặc không hợp lệ"}

# Truy cập kid không có quyền → 403
curl http://localhost:3107/api/kids/999/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Mong đợi: {"error":"Không có quyền truy cập bé này"}
```

## 7. Kiểm thử Performance

```bash
# Upload 20 ảnh cùng lúc → kiểm tra thời gian
time for i in $(seq 1 20); do
  curl -s -X POST http://localhost:3107/api/kids/1/photos \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -F "photo=@test-image.jpg" &
done
wait

# Kiểm tra thumbnails đã tạo cho tất cả
ls data/uploads/*_thumb.jpg | wc -l
# Mong đợi: = số ảnh đã upload

# Kiểm tra lazy loading trong browser:
# - Mở DevTools → Network tab
# - Scroll xuống → ảnh chỉ load khi visible
```

## 8. Known Limitations

- EXIF extraction chỉ hoạt động với JPEG/PNG (không hỗ trợ HEIC)
- Video thumbnails chưa được tạo tự động (cần ffmpeg)
- Pinch-to-zoom chỉ hoạt động trên touch devices
- Share Zalo/Messenger cần URL public (không hoạt động với localhost)
