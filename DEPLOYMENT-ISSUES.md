# 🚨 Phân tích vấn đề kỹ thuật — Deploy thực tế (Thị trường VN)

> Ngày: 2026-05-01
> Mục đích: List các vấn đề cần xử lý trước khi deploy production. Không sửa code ngay — sẽ review và ưu tiên sau.

---

## 🔴 Critical — Sẽ gây lỗi hoặc mất mát dữ liệu

### 1. Backup không export/import bảng mới
- `backup.js` export cứng columns của bảng `photos` cũ — không bao gồm `thumbnail_path`, `file_type`, `file_size`, `exif_date`, `width`, `height`, `duration`
- Bảng `albums`, `photo_tags`, `photo_tag_links`, `album_photos` **hoàn toàn không được backup**
- → Restore từ backup = mất toàn bộ album, tag, và metadata mới
- **Fix:** Cập nhật `backup.js` export/import tất cả bảng mới + columns mới

### 2. JWT_SECRET fallback insecure
- `config/index.js` có fallback `'kid-journey-secret-change-me-in-production'`
- Nếu quên set env var → mọi người dùng chung 1 secret, token có thể giả mạo
- **Fix:** Throw error nếu `JWT_SECRET` không được set khi production

### 3. CORS mở hoàn toàn
- `app.js`: `app.use(cors())` — bất kỳ domain nào cũng gọi được API
- Trên mạng LAN thì ít rủi ro, nhưng nếu expose ra internet (Cloudflare Tunnel, ngrok) → ai cũng gọi API được
- **Fix:** Restrict origin hoặc dùng whitelist

---

## 🟡 High — Sẽ gây khó chịu hoặc downtime

### 4. Không có graceful shutdown
- Server không bắt `SIGTERM`/`SIGINT`
- Khi Docker stop hoặc Ctrl+C → request đang upload bị cắt giữa chừng, file có thể corrupt (đã ghi DB nhưng chưa ghi xong thumbnail)
- **Fix:** Bắt SIGTERM, đợi request đang xử lý xong, đóng DB connection

### 5. Upload không giới hạn tổng dung lượng
- Giới hạn 50MB/file × 50 files = tối đa 2.5GB mỗi request
- Không có giới hạn tổng dung lượng ổ đĩa → có thể bị fill hết disk
- Không có rate limit riêng cho upload endpoint
- **Fix:** Thêm disk usage check, rate limit cho upload, configurable max storage

### 6. SQLite concurrency với upload hàng loạt
- better-sqlite3 là synchronous — khi 50 file upload cùng lúc, mỗi file ghi INSERT + thumbnail → DB bị lock liên tục
- WAL mode giúp đọc song song nhưng ghi vẫn serialize → bottleneck khi upload nhiều
- **Fix:** Batch INSERT trong 1 transaction, hoặc queue upload processing

### 7. CGNAT & IP động (đặc biệt VN)
- Hầu hết hộ gia đình VN dùng CGNAT — không thể expose port trực tiếp ra internet
- DEPLOY.md chỉ hướng dẫn mở port LAN — không có hướng dẫn Cloudflare Tunnel / ngrok / Tailscale
- IP động thay đổi mỗi khi restart router → cần dynamic DNS
- **Fix:** Bổ sung hướng dẫn deploy với Cloudflare Tunnel hoặc Tailscale

### 8. sharp trên Alpine — native dependency
- `sharp` cần `libvips` — Alpine image phải cài `apk add vips`
- Nếu build trên Mac M1/M2 (ARM) chạy, deploy lên server x86 → cross-compile issues
- Version mismatch giữa build stage và runtime có thể crash
- **Fix:** Test build trên cả ARM và x86, pin version libvips

---

## 🟠 Medium — Ảnh hưởng trải nghiệm người dùng

### 9. Frontend không xử lý upload lỗi tốt
- `startUpload()` catch error nhưng chỉ hiện ❌ — không có retry, không hiển lý do lỗi
- Mạng VN không ổn định → upload 50 file có thể fail 10-20% mà không biết lý do
- **Fix:** Thêm nút retry cho file failed, hiển lý do lỗi (timeout, network, size limit)

### 10. Không có progress tracking từ server
- Progress bar chỉ đếm client-side (file 1/50, file 2/50...) — không biết actual upload %
- Trên mạng chậm (3G/4G VN) → user thấy stuck ở mỗi file
- **Fix:** Dùng XMLHttpRequest với `upload.onprogress` để track actual bytes

### 11. Lightbox load ảnh gốc full-size
- Lightbox dùng `/uploads/${filename}` (ảnh gốc) — không dùng thumbnail
- Ảnh 4-5MB từ điện thoại → load chậm trên mạng VN, especially mobile 4G
- **Fix:** Lightbox dùng ảnh gốc nhưng preload thumbnail trước, progressive loading

### 12. Không có offline support cho upload
- PWA có service worker nhưng không cache upload requests
- Mất mạng giữa chừng → mất hết file đang upload, phải chọn lại từ đầu
- **Fix:** IndexedDB queue + background sync (hoặc ít nhất lưu state để resume)

### 13. EXIF extraction chỉ cho JPEG/PNG
- iPhone chụp HEIC → sharp đọc được nhưng không extract EXIF date
- → Không gợi ý ngày chụp → user phải nhập tay (phổ biến nhất VN dùng iPhone)
- **Fix:** Thêm HEIC EXIF parser hoặc dùng exif-reader package

### 14. Video không có thumbnail
- Upload video → `thumbnail_path = null`
- Grid view hiển thị video với poster trống → UX kém
- **Fix:** Dùng ffmpeg để extract frame đầu tiên làm thumbnail (cần thêm ffmpeg vào Docker)

---

## 🔵 Low — Cần cải thiện cho production

### 15. Không có log rotation
- `server.js` dùng `console.log` — Docker capture stdout nhưng không rotate
- Chạy lâu dài → log file phình to nếu redirect ra file
- **Fix:** Dùng Docker logging driver hoặc thêm winston/pino với rotation

### 16. Healthcheck quá đơn giản
- Chỉ test `/api/auth/status` — không verify DB connection, upload dir writable
- **Fix:** Thêm `/api/health` check DB + disk space + upload dir

### 17. Timezone consistency
- Docker set `TZ=Asia/Ho_Chi_Minh` nhưng SQLite `datetime('now','localtime')` depend on system TZ
- Nếu host machine khác timezone → dữ liệu ngày tháng sai
- **Fix:** Verify TZ trong container, hoặc dùng UTC xuyên suốt rồi format ở frontend

### 18. Không có input validation
- `caption`, `album name`, `tag name` không có max length → có thể inject dữ liệu lớn
- Không sanitize HTML trong caption → potential XSS nếu render trực tiếp
- **Fix:** Thêm max length validation + sanitize output (dùng `esc()` đã có nhưng cần kiểm tra coverage)

### 19. Service Worker cache outdated
- `sw.js` có thể cache version cũ của `index.html` → user thấy giao diện cũ sau khi update
- Không có cache-busting strategy cho CSS/JS mới
- **Fix:** Thêm version hash vào SW, hoặc dùng `network-first` strategy cho HTML

### 20. Không có migration version tracking
- Migration chạy lại mỗi lần start — safe nhưng không track version number
- Nếu 2 instance cùng start cùng lúc → potential race condition trên `ALTER TABLE`
- **Fix:** Thêm bảng `schema_version` để track migration đã chạy

---

## 📋 Ưu tiên đề xuất

| Ưu tiên | Vấn đề | Effort | Impact |
|---------|--------|--------|--------|
| P0 | #1 Backup missing tables | 1h | Mất dữ liệu |
| P0 | #2 JWT secret fallback | 10p | Bảo mật |
| P1 | #4 Graceful shutdown | 30p | Downtime |
| P1 | #6 SQLite concurrency | 2h | Upload fail |
| P1 | #7 CGNAT deploy guide | 1h | Không truy cập được |
| P1 | #8 sharp cross-arch | 30p | Build fail |
| P2 | #3 CORS restriction | 15p | Bảo mật |
| P2 | #5 Upload disk limit | 1h | Disk full |
| P2 | #11 Lightbox full-size | 2h | UX chậm |
| P2 | #13 HEIC EXIF | 30p | UX (iPhone users) |
| P2 | #14 Video thumbnail | 2h | UX |
| P3 | #9-10 Upload error/progress | 2h | UX |
| P3 | #12-20 Các mục còn lại | 4-6h | Nice-to-have |

**Tổng effort ước tính:** ~1-2 ngày cho P0+P1, thêm 1 ngày cho P2
