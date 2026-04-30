# 🏗️ Kid Journey — Technical Specification

## Phase 1: Bảo mật & Phase 2: Trải nghiệm lõi

> **Phiên bản:** 1.0  
> **Ngày:** 2026-04-30  
> **Tác giả:** Senior Product Architect  

---

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Database Schema](#2-database-schema)
3. [Authentication System (Phase 1)](#3-authentication-system-phase-1)
4. [Growth Chart + WHO Z-Score (Phase 2)](#4-growth-chart--who-z-score-phase-2)
5. [Montessori Tracking (Phase 2)](#5-montessori-tracking-phase-2)
6. [User Flows](#6-user-flows)
7. [API Specification](#7-api-specification)
8. [Frontend Components](#8-frontend-components)

---

## 1. Tổng quan kiến trúc

### 1.1 Sơ đồ hệ thống hiện tại

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (SPA)                     │
│              public/index.html (vanilla JS)           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│  │Diary │ │Plans │ │Growth│ │Photos│ │Montessori│  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └────┬─────┘  │
└─────┼────────┼────────┼────────┼───────────┼─────────┘
      │        │        │        │           │
      ▼        ▼        ▼        ▼           ▼
┌─────────────────────────────────────────────────────┐
│              Express 5 API (server.js)                │
│         Port 3107 · No Auth · No Rate Limit          │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              SQLite (better-sqlite3)                  │
│           data/kidjourney.db (WAL mode)              │
│                                                      │
│  ┌──────┐ ┌───────┐ ┌───────┐ ┌──────────┐ ┌─────┐ │
│  │ kids │ │ diary │ │ plans │ │milestones│ │growth│ │
│  └──────┘ └───────┘ └───────┘ └──────────┘ └─────┘ │
│  ┌───────┐                                           │
│  │photos │                                           │
│  └───────┘                                           │
└─────────────────────────────────────────────────────┘
```

### 1.2 Sơ đồ kiến trúc mục tiêu (sau Phase 1+2)

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                        │
│  ┌────────┐  ┌──────────────────────────────────────┐   │
│  │  Login  │  │         App (Authenticated)          │   │
│  │  Screen │  │  ┌───────┐ ┌───────┐ ┌───────────┐  │   │
│  └────┬───┘  │  │Diary+ │ │Growth │ │ Montessori │  │   │
│       │      │  │Search │ │+WHO   │ │ +Tracking  │  │   │
│       │      │  └───────┘ └───────┘ └───────────┘  │   │
│       │      └──────────────────────────────────────┘   │
└───────┼─────────────────────────────────────────────────┘
        │  JWT Bearer Token
        ▼
┌─────────────────────────────────────────────────────────┐
│              Express 5 API (server.js)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │Auth Guard│  │Rate Limiter│  │   API Routes         │  │
│  │(JWT)     │  │(express-   │  │  /api/auth/*         │  │
│  │          │  │ rate-limit)│  │  /api/kids/*          │  │
│  └──────────┘  └───────────┘  │  /api/growth/*        │  │
│                               │  /api/montessori/*    │  │
│                               └──────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────────┐
│ SQLite (main)│ │WHO LMS Data │ │ Uploads         │
│ kidjourney.db│ │(JSON/static)│ │ data/uploads/   │
│ + users table│ │             │ │                 │
│ + indexes    │ │             │ │                 │
└──────────────┘ └─────────────┘ └─────────────────┘
```

---

## 2. Database Schema

### 2.1 Bảng hiện có (giữ nguyên)

```sql
-- Đã tồn tại trong server.js
kids(id, name, nickname, birthday, gender, avatar, blood_type, allergies, notes, created_at, updated_at)
diary(id, kid_id FK, date, title, content, mood, tags, photos, created_at)
plans(id, kid_id FK, title, description, category, target_date, status, priority, created_at, updated_at)
milestones(id, kid_id FK, title, description, date, category, icon, created_at)
growth(id, kid_id FK, date, height, weight, head_circumference, notes, created_at)
photos(id, kid_id FK, filename, original_name, caption, date, category, created_at)
```

### 2.2 Bảng mới: `users` (Phase 1 — Authentication)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,          -- Tên đăng nhập (vd: "ba", "me")
  display_name TEXT NOT NULL,             -- Tên hiển thị (vd: "Bố Đức")
  pin_hash TEXT NOT NULL,                 -- bcrypt hash của PIN 4-6 số
  role TEXT DEFAULT 'parent',             -- 'parent' | 'admin'
  avatar TEXT DEFAULT '👤',
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Liên kết user ↔ kid (nhiều-nhiều: 1 user quản lý nhiều kid)
CREATE TABLE IF NOT EXISTS user_kids (
  user_id INTEGER NOT NULL,
  kid_id INTEGER NOT NULL,
  relation TEXT DEFAULT 'parent',         -- 'father' | 'mother' | 'grandparent' | 'other'
  created_at TEXT DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (user_id, kid_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
);
```

**Lưu trữ PIN:**
```
PIN: "1234"
  → bcrypt(pin + salt, rounds=10)
  → "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

### 2.3 Bảng mới: `growth_who_reference` (Phase 2 — WHO LMS)

```sql
-- Dữ liệu tham chiếu WHO LMS (read-only, seed từ file JSON)
CREATE TABLE IF NOT EXISTS growth_who_reference (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator TEXT NOT NULL,                -- 'wfa' | 'lhfa' | 'hcfa' | 'wflh'
  sex INTEGER NOT NULL,                   -- 1=nam, 2=nữ
  age_months REAL NOT NULL,               -- 0, 0.5, 1, 1.5, ... 60
  length_cm REAL,                         -- Chỉ dùng cho wflh (weight-for-length)
  l REAL NOT NULL,                        -- Lambda (Box-Cox power)
  m REAL NOT NULL,                        -- Mu (median)
  s REAL NOT NULL,                        -- Sigma (coefficient of variation)
  UNIQUE(indicator, sex, age_months, length_cm)
);

CREATE INDEX idx_who_lookup ON growth_who_reference(indicator, sex, age_months);
```

**Giải thích các chỉ số:**

| Indicator | Tên đầy đủ | Ý nghĩa |
|-----------|-----------|---------|
| `wfa` | Weight-for-Age | Cân nặng theo tuổi |
| `lhfa` | Length/Height-for-Age | Chiều cao theo tuổi |
| `hcfa` | Head Circumference-for-Age | Vòng đầu theo tuổi |
| `wflh` | Weight-for-Length/Height | Cân nặng theo chiều cao |

### 2.4 Bảng mới: `montessori_progress` (Phase 2 — Montessori Tracking)

```sql
CREATE TABLE IF NOT EXISTS montessori_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kid_id INTEGER NOT NULL,
  activity_key TEXT NOT NULL,             -- Key định danh hoạt động (vd: "mobile-den-trang")
  status TEXT DEFAULT 'not_started',      -- 'not_started' | 'in_progress' | 'completed'
  completed_at TEXT,                      -- Thời điểm hoàn thành
  notes TEXT,                             -- Ghi chú của phụ huynh
  evidence_photo TEXT,                    -- Ảnh minh chứng (filename)
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
  UNIQUE(kid_id, activity_key)
);

CREATE INDEX idx_montessori_kid ON montessori_progress(kid_id, status);
```

### 2.5 Bảng mới: `montessori_weekly_plan` (Phase 2)

```sql
CREATE TABLE IF NOT EXISTS montessori_weekly_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kid_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,               -- Ngày đầu tuần (Monday, YYYY-MM-DD)
  activity_key TEXT NOT NULL,
  planned_day TEXT,                       -- 'mon' | 'tue' | ... | 'sun'
  status TEXT DEFAULT 'planned',          -- 'planned' | 'done' | 'skipped'
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
);

CREATE INDEX idx_weekly_plan ON montessori_weekly_plan(kid_id, week_start);
```

### 2.6 Sơ đồ quan hệ tổng thể

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│  users   │────▶│ user_kids │◀────│    kids       │
│          │     │           │     │              │
│ id (PK)  │     │ user_id   │     │ id (PK)      │
│ username │     │ kid_id    │     │ name         │
│ pin_hash │     │ relation  │     │ birthday     │
│ display_ │     └───────────┘     │ gender       │
│ name     │                       └──────┬───────┘
└──────────┘                              │
                     ┌────────────────────┼────────────────────┐
                     │                    │                    │
                     ▼                    ▼                    ▼
              ┌──────────┐        ┌──────────────┐    ┌───────────────────┐
              │  diary   │        │   growth     │    │montessori_progress│
              │          │        │              │    │                   │
              │ kid_id   │        │ kid_id       │    │ kid_id            │
              │ date     │        │ date         │    │ activity_key      │
              │ content  │        │ height       │    │ status            │
              │ mood     │        │ weight       │    │ completed_at      │
              │ tags     │        │ head_circ    │    │ evidence_photo    │
              └──────────┘        └──────────────┘    └───────────────────┘
                                          │
                                          ▼
                                  ┌───────────────────┐
                                  │growth_who_reference│
                                  │                   │
                                  │ indicator (wfa)   │
                                  │ sex (1/2)         │
                                  │ age_months        │
                                  │ l, m, s           │
                                  └───────────────────┘
```

---

## 3. Authentication System (Phase 1)

### 3.1 Quyết định: JWT vs Session

| Tiêu chí | JWT (Stateless) | Session (Stateful) | **Chọn** |
|----------|----------------|-------------------|----------|
| Phức tạp | Trung bình | Thấp | ✅ JWT |
| Self-hosted | Không cần Redis | Cần store | ✅ JWT |
| Multi-device | Dễ | Phức tạp | ✅ JWT |
| Revoke | Khó (cần blacklist) | Dễ (xóa session) | ⚠️ |
| Security | Token exposure | Cookie httpOnly | ⚠️ |

**→ Chọn JWT** với mitigation:
- Access token ngắn hạn (2 giờ)
- Refresh token lưu DB (có thể revoke)
- PIN-based login (đơn giản cho phụ huynh)

### 3.2 Flow Authentication

```
┌─────────────┐         ┌─────────────┐         ┌──────────┐
│   Client    │         │   Server    │         │   DB     │
│             │         │             │         │          │
│  Nhập PIN   │────────▶│ POST        │────────▶│ Verify   │
│  "1234"     │         │ /api/auth   │         │ bcrypt   │
│             │         │ /login      │         │          │
│             │◀────────│             │◀────────│          │
│  Lưu JWT    │         │ Return JWT  │         │          │
│  localStorage│        │ + refresh   │         │          │
└─────────────┘         └─────────────┘         └──────────┘
       │
       │ Mỗi API call
       ▼
┌─────────────┐         ┌─────────────┐
│  GET /api/* │────────▶│ Auth Guard  │
│  Header:    │         │             │
│  Bearer jwt │         │ Verify JWT  │
│             │◀────────│ → user_id   │
│  Response   │         │ → allowed   │
└─────────────┘         └─────────────┘
```

### 3.3 Implementation Details

**Package mới cần thêm:**
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",    // PIN hashing (pure JS, không cần build)
    "jsonwebtoken": "^9.0.0" // JWT sign/verify
  }
}
```

**Cấu trúc JWT Payload:**
```json
{
  "userId": 1,
  "username": "ba",
  "displayName": "Bố Đức",
  "role": "parent",
  "allowedKidIds": [1, 2],
  "iat": 1714492800,
  "exp": 1714500000  // +2 giờ
}
```

**Auth Middleware:**
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'kid-journey-secret-change-me';

function authGuard(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;  // { userId, username, role, allowedKidIds }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
  }
}

// Kiểm tra user có quyền truy cập kid không
function authorizeKid(req, res, next) {
  const kidId = Number(req.params.kidId || req.params.id);
  if (!req.user.allowedKidIds.includes(kidId)) {
    return res.status(403).json({ error: 'Không có quyền truy cập bé này' });
  }
  next();
}

module.exports = { authGuard, authorizeKid };
```

**API Routes mới:**
```javascript
// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, pin } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(pin, user.pin_hash)) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc PIN' });
  }
  // Lấy danh sách kid được phép
  const kids = db.prepare('SELECT kid_id FROM user_kids WHERE user_id = ?').all(user.id);
  const allowedKidIds = kids.map(k => k.kid_id);
  // Tạo JWT
  const token = jwt.sign({
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    allowedKidIds
  }, SECRET, { expiresIn: '2h' });
  // Tạo refresh token
  const refreshToken = crypto.randomUUID();
  db.prepare('UPDATE users SET last_login_at = datetime("now","localtime") WHERE id = ?').run(user.id);
  res.json({ token, refreshToken, user: { id: user.id, displayName: user.display_name, role: user.role } });
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  // Verify refresh token và cấp token mới
  // ...
});
```

### 3.4 Setup Flow (Lần đầu sử dụng)

```
┌──────────────────────────────────────────────────────┐
│                SETUP FLOW (First Run)                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. App khởi chạy → kiểm tra có user trong DB chưa? │
│     │                                                │
│     ├── Không → Hiển thị SETUP SCREEN                │
│     │   ├── Nhập tên hiển thị ("Bố Đức")            │
│     │   ├── Nhập username ("ba")                     │
│     │   ├── Đặt PIN 4-6 số                           │
│     │   └── POST /api/auth/setup                     │
│     │       → Tạo user đầu tiên (role: admin)        │
│     │       → Auto-login, trả JWT                    │
│     │                                                │
│     └── Có → Hiển thị LOGIN SCREEN                   │
│         ├── Chọn user (nếu nhiều)                    │
│         ├── Nhập PIN                                 │
│         └── POST /api/auth/login                     │
│             → Verify bcrypt → Trả JWT                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.5 Bảo mật bổ sung

```javascript
// server.js — Thêm vào đầu
const rateLimit = require('express-rate-limit');

// Rate limit cho login (chống brute-force PIN)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max: 10,                    // Tối đa 10 lần thử
  message: { error: 'Thử quá nhiều lần. Đợi 15 phút.' },
  standardHeaders: true,
});

app.use('/api/auth/login', loginLimiter);

// Bảo vệ tất cả API (trừ auth routes)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  authGuard(req, res, next);
});
```

---

## 4. Growth Chart + WHO Z-Score (Phase 2)

### 4.1 Nguyên lý tính Z-Score (LMS Method)

WHO sử dụng **phương pháp LMS** (Lambda-Mu-Sigma) để tính Z-score:

```
┌─────────────────────────────────────────────────────────┐
│                    LMS METHOD                             │
│                                                          │
│  L (Lambda) = Power trong Box-Cox transformation         │
│  M (Mu)     = Giá trị trung vị (median)                 │
│  S (Sigma)  = Hệ số biến thiên                          │
│                                                          │
│  ┌─────────────────────────────────────────────┐         │
│  │ Công thức tính Z-score:                      │         │
│  │                                              │         │
│  │ Nếu L ≠ 0:                                  │         │
│  │   Z = ((X/M)^L - 1) / (L × S)              │         │
│  │                                              │         │
│  │ Nếu L = 0:                                  │         │
│  │   Z = ln(X/M) / S                           │         │
│  │                                              │         │
│  │ Trong đó: X = giá trị đo thực tế            │         │
│  └─────────────────────────────────────────────┘         │
│                                                          │
│  ┌─────────────────────────────────────────────┐         │
│  │ Công thức tính giá trị từ Z-score:          │         │
│  │                                              │         │
│  │ Nếu L ≠ 0:                                  │         │
│  │   X = M × (1 + L×S×Z)^(1/L)                │         │
│  │                                              │         │
│  │ Nếu L = 0:                                  │         │
│  │   X = M × exp(S×Z)                          │         │
│  └─────────────────────────────────────────────┘         │
│                                                          │
│  Z-score → Percentile:                                   │
│    Z < -3     → Rất thấp (< 0.1 percentile)             │
│    -3 ≤ Z < -2 → Thấp (< 3 percentile)                  │
│    -2 ≤ Z < -1 → Dưới trung bình                        │
│    -1 ≤ Z ≤ 1  → BÌNH THƯỜNG                           │
│    1 < Z ≤ 2   → Trên trung bình                        │
│    2 < Z ≤ 3   → Cao (> 97 percentile)                  │
│    Z > 3       → Rất cao                                 │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Dữ liệu WHO LMS cần thiết

Cần seed vào bảng `growth_who_reference` cho **bé trai (sex=1)** và **bé gái (sex=2)**:

| Indicator | Phạm vi tuổi | Khoảng tuổi | Số rows (ước tính) |
|-----------|-------------|-------------|-------------------|
| `wfa` (Weight-for-Age) | 0-60 tháng | Mỗi 0.5 tháng | 121 × 2 = 242 |
| `lhfa` (Length-for-Age) | 0-60 tháng | Mỗi 0.5 tháng | 121 × 2 = 242 |
| `hcfa` (Head Circ-for-Age) | 0-60 tháng | Mỗi 0.5 tháng | 121 × 2 = 242 |
| `wflh` (Weight-for-Length) | 45-110 cm | Mỗi 0.5 cm | 131 × 2 = 262 |

**Tổng cộng: ~988 rows** (nhỏ, seed 1 lần)

### 4.3 Seed Data Script

```javascript
// scripts/seed-who-data.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'kidjourney.db'));

// Đọc file WHO LMS đã được parse từ Excel/CSV
// File format: { indicator, sex, age_months, length_cm, l, m, s }
const whoData = JSON.parse(fs.readFileSync(path.join(__dirname, 'who-lms-data.json'), 'utf8'));

const insert = db.prepare(`
  INSERT OR REPLACE INTO growth_who_reference (indicator, sex, age_months, length_cm, l, m, s)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(row.indicator, row.sex, row.age_months, row.length_cm, row.l, row.m, row.s);
  }
});

insertMany(whoData);
console.log(`✅ Seeded ${whoData.length} WHO LMS reference rows`);
```

### 4.4 API tính Z-Score

```javascript
// server.js — Growth Chart API

// Helper: Lấy LMS values
function getLMS(indicator, sex, ageMonths) {
  // Tìm 2 điểm gần nhất để nội suy
  const lower = db.prepare(`
    SELECT * FROM growth_who_reference
    WHERE indicator = ? AND sex = ? AND age_months <= ?
    ORDER BY age_months DESC LIMIT 1
  `).get(indicator, sex, ageMonths);

  const upper = db.prepare(`
    SELECT * FROM growth_who_reference
    WHERE indicator = ? AND sex = ? AND age_months > ?
    ORDER BY age_months ASC LIMIT 1
  `).get(indicator, sex, ageMonths);

  if (!lower) return upper;
  if (!upper) return lower;

  // Nội suy tuyến tính (linear interpolation)
  const ratio = (ageMonths - lower.age_months) / (upper.age_months - lower.age_months);
  return {
    l: lower.l + ratio * (upper.l - lower.l),
    m: lower.m + ratio * (upper.m - lower.m),
    s: lower.s + ratio * (upper.s - lower.s),
  };
}

// Helper: Tính Z-score
function calcZScore(x, l, m, s) {
  if (Math.abs(l) < 0.0001) {
    return Math.log(x / m) / s;  // L ≈ 0
  }
  return (Math.pow(x / m, l) - 1) / (l * s);
}

// Helper: Z-score → Percentile (dùng error function)
function zScoreToPercentile(z) {
  // Approximation của cumulative normal distribution
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return (0.5 * (1.0 + sign * y) * 100).toFixed(1);
}

// Helper: Đánh giá Z-score
function evaluateZScore(z) {
  if (z < -3) return { level: 'very_low', label: 'Rất thấp', color: '#e74c3c', icon: '🔴' };
  if (z < -2) return { level: 'low', label: 'Thấp', color: '#e67e22', icon: '🟠' };
  if (z < -1) return { level: 'below_avg', label: 'Dưới TB', color: '#f39c12', icon: '🟡' };
  if (z <= 1) return { level: 'normal', label: 'Bình thường', color: '#27ae60', icon: '🟢' };
  if (z <= 2) return { level: 'above_avg', label: 'Trên TB', color: '#f39c12', icon: '🟡' };
  if (z <= 3) return { level: 'high', label: 'Cao', color: '#e67e22', icon: '🟠' };
  return { level: 'very_high', label: 'Rất cao', color: '#e74c3c', icon: '🔴' };
}

// API: Lấy growth data + WHO comparison
app.get('/api/kids/:kidId/growth/analysis', authorizeKid, (req, res) => {
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const sex = kid.gender === 'boy' ? 1 : kid.gender === 'girl' ? 2 : null;
  const records = db.prepare('SELECT * FROM growth WHERE kid_id = ? ORDER BY date ASC').all(req.params.kidId);

  if (!sex || !kid.birthday) {
    return res.json({
      records,
      whoAvailable: false,
      message: 'Cập nhật ngày sinh và giới tính để so sánh với chuẩn WHO'
    });
  }

  const analysis = records.map(r => {
    const ageMonths = getAgeInMonths(kid.birthday, r.date);
    const result = { ...r, ageMonths, who: {} };

    if (r.height && ageMonths !== null) {
      const lms = getLMS('lhfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.height, lms.l, lms.m, lms.s);
        result.who.height = {
          zScore: +z.toFixed(2),
          percentile: +zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(1)
        };
      }
    }

    if (r.weight && ageMonths !== null) {
      const lms = getLMS('wfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.weight, lms.l, lms.m, lms.s);
        result.who.weight = {
          zScore: +z.toFixed(2),
          percentile: +zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(1)
        };
      }
    }

    if (r.head_circumference && ageMonths !== null) {
      const lms = getLMS('hcfa', sex, ageMonths);
      if (lms) {
        const z = calcZScore(r.head_circumference, lms.l, lms.m, lms.s);
        result.who.headCirc = {
          zScore: +z.toFixed(2),
          percentile: +zScoreToPercentile(z),
          evaluation: evaluateZScore(z),
          median: +lms.m.toFixed(1)
        };
      }
    }

    return result;
  });

  // Tính WHO percentile curves cho biểu đồ
  const ageRange = getAgeRange(kid.birthday);
  const whoCurves = generateWHOCurves(sex, ageRange);

  res.json({
    records: analysis,
    whoAvailable: true,
    whoCurves,
    summary: generateGrowthSummary(analysis, kid)
  });
});

// Helper: Tính tuổi tại thời điểm đo
function getAgeInMonths(birthday, measureDate) {
  const b = new Date(birthday);
  const d = new Date(measureDate);
  return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
}

// Tạo các đường cong WHO cho biểu đồ
function generateWHOCurves(sex, ageRange) {
  const zScores = [-3, -2, -1, 0, 1, 2, 3];
  const curves = {};

  for (const z of zScores) {
    curves[z] = [];
    for (let age = ageRange.min; age <= ageRange.max; age += 0.5) {
      const lms = getLMS('lhfa', sex, age);
      if (lms) {
        let value;
        if (Math.abs(lms.l) < 0.0001) {
          value = lms.m * Math.exp(lms.s * z);
        } else {
          value = lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
        }
        curves[z].push({ age, value: +value.toFixed(1) });
      }
    }
  }
  return curves;
}
```

### 4.5 Sơ đồ luồng tính Z-Score

```
┌──────────────────────────────────────────────────────────────┐
│                    FLOW: Tính Z-Score                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: height=85cm, kid_birthday="2024-06-15", gender="boy" │
│  Measure_date: "2026-04-30"                                   │
│                                                               │
│  ┌─────────────────────────────────────────┐                  │
│  │ Bước 1: Tính tuổi (months)              │                  │
│  │ age = (2026-2024)×12 + (4-6) = 22 tháng │                  │
│  └─────────────────┬───────────────────────┘                  │
│                    ▼                                          │
│  ┌─────────────────────────────────────────┐                  │
│  │ Bước 2: Lookup LMS từ bảng WHO          │                  │
│  │ indicator='lhfa', sex=1, age_months=22  │                  │
│  │ → L=1.0543, M=87.1, S=0.0387           │                  │
│  └─────────────────┬───────────────────────┘                  │
│                    ▼                                          │
│  ┌─────────────────────────────────────────┐                  │
│  │ Bước 3: Tính Z-score                    │                  │
│  │ Z = ((85/87.1)^1.0543 - 1) / (1.0543 × 0.0387)          │
│  │ Z = (0.9759^1.0543 - 1) / 0.0408                          │
│  │ Z = (0.9748 - 1) / 0.0408                                 │
│  │ Z = -0.0252 / 0.0408                                      │
│  │ Z = -0.62                                                 │
│  └─────────────────┬───────────────────────┘                  │
│                    ▼                                          │
│  ┌─────────────────────────────────────────┐                  │
│  │ Bước 4: Đánh giá                        │                  │
│  │ Z = -0.62 → nằm trong [-1, 1]          │                  │
│  │ → "Bình thường" 🟢                     │                  │
│  │ → Percentile: 26.8%                     │                  │
│  │ → "Con cao hơn 26.8% bé trai cùng tuổi"│                  │
│  └─────────────────────────────────────────┘                  │
│                                                               │
│  Output:                                                      │
│  {                                                            │
│    "height": 85,                                              │
│    "ageMonths": 22,                                           │
│    "who": {                                                   │
│      "zScore": -0.62,                                         │
│      "percentile": 26.8,                                      │
│      "evaluation": { "label": "Bình thường", "icon": "🟢" }, │
│      "median": 87.1                                           │
│    }                                                          │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 4.6 Biểu đồ Growth Chart (Frontend)

```
┌─────────────────────────────────────────────────────────────┐
│  📏 Chiều cao — Bé Bo (22 tháng)                            │
│                                                              │
│  cm                                                          │
│  95 ┤                                    ╭── +2SD (97.7%)   │
│     │                               ╭───╯                   │
│  90 ┤                          ╭────╯      ← Median (50%)   │
│     │                     ╭───╯                             │
│  87 ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ╭╯─ ─ ─ ─ ─ ─ ← WHO Median        │
│     │               ╭──╯                                    │
│  85 ┤─ ─ ─ ─ ─ ─ ─●─ ─ ─ ─ ─ ─ ─ ─ ─ ← Con: 85cm        │
│     │          ╭──╯                  ╰── -2SD (2.3%)        │
│  80 ┤     ╭───╯                                             │
│     │╭───╯                                                  │
│  75 ┤╯                                                      │
│     └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──▶                     │
│        0  3  6  9  12 15 18 21 24 27   tháng                │
│                                                              │
│  ┌─────────────────────────────────────────┐                │
│  │ 📊 Đánh giá:                            │                │
│  │ • Chiều cao: 85cm — Z-score: -0.62 🟢  │                │
│  │ • Cân nặng: 12.5kg — Z-score: +0.31 🟢 │                │
│  │ • Vòng đầu: 48cm — Z-score: -0.15 🟢   │                │
│  │ • Xu hướng: Tăng đều ✅                  │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Montessori Tracking (Phase 2)

### 5.1 Mở rộng dữ liệu Montessori

**Vấn đề hiện tại:** `montessori.js` dùng key tĩnh, không có `activity_key` unique.

**Giải pháp:** Thêm `key` field vào mỗi activity trong `montessori.js`:

```javascript
// montessori.js — Thêm key cho mỗi activity
const ACTIVITIES = [
  {
    key: 'mobile-den-trang',           // ← THÊM
    ageMin: 0, ageMax: 3,
    category: 'giác quan',
    title: 'Mobile đen trắng',
    desc: 'Treo mobile đen trắng cách mắt bé 20-30cm...',
    materials: 'Mobile đen trắng / thẻ flashcard',
    duration: '5-10 phút',
    icon: '👀'
  },
  {
    key: 'tummy-time',                 // ← THÊM
    ageMin: 0, ageMax: 3,
    category: 'vận động',
    title: 'Thời gian nằm sấp (Tummy time)',
    // ...
  },
  // ... tất cả activities đều có key unique
];
```

### 5.2 API Montessori Tracking

```javascript
// GET /api/kids/:kidId/montessori/progress
app.get('/api/kids/:kidId/montessori/progress', authorizeKid, (req, res) => {
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.kidId);
  if (!kid) return res.status(404).json({ error: 'Not found' });

  const allActivities = montessori.getAllActivities(kid.birthday);
  const progress = db.prepare(
    'SELECT * FROM montessori_progress WHERE kid_id = ?'
  ).all(req.params.kidId);

  const progressMap = {};
  progress.forEach(p => { progressMap[p.activity_key] = p; });

  const result = allActivities.map(act => ({
    ...act,
    progress: progressMap[act.key] || {
      status: 'not_started',
      completed_at: null,
      notes: null,
      evidence_photo: null
    }
  }));

  // Stats
  const total = result.length;
  const completed = result.filter(r => r.progress.status === 'completed').length;
  const inProgress = result.filter(r => r.progress.status === 'in_progress').length;

  res.json({
    activities: result,
    stats: { total, completed, inProgress, notStarted: total - completed - inProgress },
    percentage: total > 0 ? Math.round(completed / total * 100) : 0
  });
});

// POST /api/kids/:kidId/montessori/progress
app.post('/api/kids/:kidId/montessori/progress', authorizeKid, upload.single('evidence'), (req, res) => {
  const { activity_key, status, notes } = req.body;
  const evidence_photo = req.file ? req.file.filename : null;

  db.prepare(`
    INSERT INTO montessori_progress (kid_id, activity_key, status, completed_at, notes, evidence_photo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(kid_id, activity_key) DO UPDATE SET
      status = excluded.status,
      completed_at = CASE WHEN excluded.status = 'completed' THEN datetime('now','localtime') ELSE completed_at END,
      notes = COALESCE(excluded.notes, notes),
      evidence_photo = COALESCE(excluded.evidence_photo, evidence_photo),
      updated_at = datetime('now','localtime')
  `).run(req.params.kidId, activity_key, status, status === 'completed' ? new Date().toISOString() : null, notes, evidence_photo);

  res.json({ ok: true });
});

// GET /api/kids/:kidId/montessori/weekly-plan
app.get('/api/kids/:kidId/montessori/weekly-plan', authorizeKid, (req, res) => {
  const weekStart = getWeekStart(new Date()); // Monday
  const plans = db.prepare(`
    SELECT mwp.*, ma.title, ma.icon, ma.category, ma.duration
    FROM montessori_weekly_plan mwp
    LEFT JOIN montessori_activity_ref ma ON mwp.activity_key = ma.key
    WHERE mwp.kid_id = ? AND mwp.week_start = ?
    ORDER BY mwp.planned_day
  `).all(req.params.kidId, weekStart);

  res.json({ weekStart, plans });
});

// POST /api/kids/:kidId/montessori/weekly-plan (auto-generate)
app.post('/api/kids/:kidId/montessori/weekly-plan', authorizeKid, (req, res) => {
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.kidId);
  const weekStart = getWeekStart(new Date());

  // Lấy activities chưa hoàn thành
  const allActivities = montessori.getAllActivities(kid.birthday);
  const completed = db.prepare(
    "SELECT activity_key FROM montessori_progress WHERE kid_id = ? AND status = 'completed'"
  ).all(req.params.kidId).map(r => r.activity_key);

  const available = allActivities.filter(a => !completed.includes(a.key));

  // Chọn 5-7 activities cho tuần, phân bổ đều category
  const selected = selectBalancedActivities(available, 6);
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // Xóa plan cũ
  db.prepare('DELETE FROM montessori_weekly_plan WHERE kid_id = ? AND week_start = ?')
    .run(req.params.kidId, weekStart);

  // Tạo plan mới
  const insert = db.prepare(
    'INSERT INTO montessori_weekly_plan (kid_id, week_start, activity_key, planned_day) VALUES (?,?,?,?)'
  );

  selected.forEach((act, i) => {
    insert.run(req.params.kidId, weekStart, act.key, days[i % 7]);
  });

  res.json({ ok: true, count: selected.length });
});
```

### 5.3 Sơ flow Montessori Tracking

```
┌─────────────────────────────────────────────────────────────┐
│              MONTESSORI TRACKING FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MONTESSORI PAGE                                       │   │
│  │                                                       │   │
│  │ ┌─────────────────────────────────────────────┐       │   │
│  │ │ 🧬 Giai đoạn hiện tại: 18-24 tháng          │       │   │
│  │ │ ████████░░░░░░░░ 45% hoàn thành              │       │   │
│  │ │ 8/18 hoạt động đã xong                       │       │   │
│  │ └─────────────────────────────────────────────┘       │   │
│  │                                                       │   │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │   │
│  │ │📋 Tuần  │ │📊 Tiến  │ │📅 Lịch  │                  │   │
│  │ │  này    │ │  độ     │ │  trình  │                  │   │
│  │ └────────┘ └────────┘ └────────┘                  │   │
│  │                                                       │   │
│  │ ┌─────────────────────────────────────────────┐       │   │
│  │ │ HOẠT ĐỘNG HÔM NAY                           │       │   │
│  │ │                                               │       │   │
│  │ │ ┌─────────┐ ┌─────────┐ ┌─────────┐          │       │   │
│  │ │ │🧹 Lau   │ │🔴 Phân  │ │💬 Nói   │          │       │   │
│  │ │ │ bàn     │ │ loại    │ │ câu 2   │          │       │   │
│  │ │ │         │ │ màu     │ │ từ      │          │       │   │
│  │ │ │ [✅Xong]│ │ [🔄Làm]│ │ [▶️Bắt] │          │       │   │
│  │ │ └─────────┘ └─────────┘ └─────────┘          │       │   │
│  │ └─────────────────────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ACTIVITY DETAIL (Modal)                               │   │
│  │                                                       │   │
│  │ 🧹 Lau bàn / quét nhà                                │   │
│  │ Danh mục: Thực tế · ⏱️ 5-10 phút                     │   │
│  │                                                       │   │
│  │ Cho bé khăn nhỏ để lau bàn sau khi ăn.               │   │
│  │ Bé sẽ thích bắt chước người lớn.                     │   │
│  │                                                       │   │
│  │ 📦 Vật liệu: Khăn lau nhỏ, chổi nhỏ                  │   │
│  │                                                       │   │
│  │ ── Trạng thái ──                                      │   │
│  │ [Chưa] [Đang làm ✏️] [Đã xong ✅]                    │   │
│  │                                                       │   │
│  │ ── Ghi chú ──                                         │   │
│  │ [Text input]                                          │   │
│  │                                                       │   │
│  │ ── Ảnh minh chứng ──                                 │   │
│  │ [📷 Chọn ảnh]                                         │   │
│  │                                                       │   │
│  │ [💾 Lưu]                                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. User Flows

### 6.1 Flow: Phụ huynh nhập số đo + xem WHO Chart

```
┌─────────────────────────────────────────────────────────────────┐
│         USER STORY: "Nhập số đo chiều cao → Xem WHO Chart"      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTOR: Phụ huynh (đã đăng nhập)                                │
│  PRE-CONDITION: Hồ sơ bé đã có ngày sinh + giới tính            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 1: Vào trang "Phát triển" (📏)                     │    │
│  │                                                          │    │
│  │  [ Sidebar ]  [ Content:                                │    │
│  │  📊 Tổng quan    ┌──────────────────────────────┐      │    │
│  │  📝 Nhật ký      │ 📏 Chiều cao (cm)            │      │    │
│  │  🎯 Kế hoạch     │                               │      │    │
│  │  ⭐ Cột mốc      │  Biểu đồ WHO + con mình       │      │    │
│  │  📏 Phát triển ← │  (các đường +2SD, median, -2SD)│      │    │
│  │  🧬 Montessori   │                               │      │    │
│  │  📷 Album        │  ● = điểm đo của con          │      │    │
│  │  👤 Hồ sơ        │                               │      │    │
│  │              ]   │ [+ Thêm số đo]  [🔄 Cập nhật] │      │    │
│  │                   └──────────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 2: Click "Thêm số đo"                               │    │
│  │                                                          │    │
│  │  ┌─── Modal ─────────────────────────────────────┐      │    │
│  │  │ 📏 Thêm số đo                                 │      │    │
│  │  │                                                │      │    │
│  │  │ Ngày: [2026-04-30]                             │      │    │
│  │  │                                                │      │    │
│  │  │ Chiều cao (cm): [ 85.0 ]                      │      │    │
│  │  │ Cân nặng (kg):  [ 12.5 ]                      │      │    │
│  │  │ Vòng đầu (cm):  [ 48.0 ]                      │      │    │
│  │  │                                                │      │    │
│  │  │ Ghi chú: [Khám sức khỏe định kỳ]              │      │    │
│  │  │                                                │      │    │
│  │  │ [Hủy]  [💾 Lưu]                               │      │    │
│  │  └────────────────────────────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 3: Sau khi lưu → Tự động chuyển sang tab "Đánh giá"│    │
│  │                                                          │    │
│  │  ┌─── Modal: Kết quả ─────────────────────────────┐     │    │
│  │  │ ✅ Đã lưu số đo thành công!                     │     │    │
│  │  │                                                  │     │    │
│  │  │ ┌──────────────────────────────────────────┐    │     │    │
│  │  │ │ 📊 SO SÁNH VỚI CHUẨN WHO                 │    │     │    │
│  │  │ │                                           │    │     │    │
│  │  │ │ 📏 Chiều cao: 85.0 cm                    │    │     │    │
│  │  │ │    Z-score: -0.62 │ Percentile: 26.8%     │    │     │    │
│  │  │ │    🟢 Bình thường                         │    │     │    │
│  │  │ │    "Con cao hơn 26.8% bé trai cùng tuổi"  │    │     │    │
│  │  │ │    Median WHO: 87.1 cm                    │    │     │    │
│  │  │ │                                           │    │     │    │
│  │  │ │ ⚖️ Cân nặng: 12.5 kg                     │    │     │    │
│  │  │ │    Z-score: +0.31 │ Percentile: 62.2%     │    │     │    │
│  │  │ │    🟢 Bình thường                         │    │     │    │
│  │  │ │    "Con nặng hơn 62.2% bé trai cùng tuổi" │    │     │    │
│  │  │ │                                           │    │     │    │
│  │  │ │ 📊 Xu hướng: Chiều cao tăng đều +1.2cm/th │    │     │    │
│  │  │ └──────────────────────────────────────────┘    │     │    │
│  │  │                                                  │     │    │
│  │  │ [Đóng] [Xem biểu đồ đầy đủ]                     │     │    │
│  │  └──────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 4: Click "Xem biểu đồ đầy đủ"                       │    │
│  │                                                          │    │
│  │  → Đóng modal                                           │    │
│  │  → Scroll xuống biểu đồ Growth Chart                     │    │
│  │  → Highlight điểm vừa nhập                               │    │
│  │  → Hiển thị các đường WHO (±3SD, ±2SD, ±1SD, Median)    │    │
│  │  → Tooltip khi hover: "85cm · Z: -0.62 · P26.8"         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  EXCEPTIONS:                                                     │
│  • Thiếu ngày sinh → "Cập nhật ngày sinh ở Hồ sơ bé"          │
│  • Thiếu giới tính → "Cập nhật giới tính ở Hồ sơ bé"          │
│  • Giá trị bất thường (Z > 4 hoặc Z < -4) → Cảnh báo đỏ       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Flow: Đăng nhập

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ LOGIN SCREEN                                        │     │
│  │                                                     │     │
│  │         🌱 Kid Journey                              │     │
│  │                                                     │     │
│  │    ┌─────────────────────────────┐                  │     │
│  │    │  👤 Bố Đức                  │  ← Chọn user     │     │
│  │    │  👩 Mẹ Hà                   │                  │     │
│  │    │  👵 Bà Ngoại                │                  │     │
│  │    └─────────────────────────────┘                  │     │
│  │                                                     │     │
│  │    PIN: [●] [●] [●] [●]                            │     │
│  │                                                     │     │
│  │    [ 1 ] [ 2 ] [ 3 ]                               │     │
│  │    [ 4 ] [ 5 ] [ 6 ]                               │     │
│  │    [ 7 ] [ 8 ] [ 9 ]                               │     │
│  │    [ ← ] [ 0 ] [ ✓ ]                               │     │
│  │                                                     │     │
│  │    ⚠️ Sai PIN (nếu nhập sai)                        │     │
│  │                                                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  POST /api/auth/login                                        │
│  { "username": "ba", "pin": "1234" }                        │
│                                                              │
│  Response:                                                   │
│  {                                                           │
│    "token": "eyJhbG...",                                     │
│    "user": { "id": 1, "displayName": "Bố Đức" }            │
│  }                                                           │
│                                                              │
│  → Lưu token vào localStorage                                │
│  → Redirect đến Dashboard                                    │
│                                                              │
│  SECURITY:                                                   │
│  • 5 lần sai → khóa 60 giây                                │
│  • 10 lần sai → khóa 15 phút (rate limit)                  │
│  • PIN hashed bằng bcrypt (cost=10)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API Specification

### 7.1 Auth APIs

```
POST /api/auth/setup          — Tạo tài khoản đầu tiên
POST /api/auth/login           — Đăng nhập bằng PIN
POST /api/auth/refresh         — Làm mới token
GET  /api/auth/me              — Lấy thông tin user hiện tại
```

### 7.2 Growth APIs (mới)

```
GET  /api/kids/:kidId/growth
     → Danh sách số đo (như hiện tại)

POST /api/kids/:kidId/growth
     → Thêm số đo mới (như hiện tại)

GET  /api/kids/:kidId/growth/analysis
     → Số đo + Z-score + Percentile + WHO curves
     → Response:
       {
         records: [{
           id, date, height, weight, head_circumference,
           ageMonths: 22,
           who: {
             height: { zScore: -0.62, percentile: 26.8, evaluation: {...}, median: 87.1 },
             weight: { zScore: 0.31, percentile: 62.2, evaluation: {...}, median: 12.0 },
             headCirc: { zScore: -0.15, percentile: 44.0, evaluation: {...}, median: 48.3 }
           }
         }],
         whoCurves: { "-3": [...], "-2": [...], "-1": [...], "0": [...], "1": [...], "2": [...], "3": [...] },
         summary: { heightTrend: "stable", weightTrend: "increasing", alerts: [] }
       }

PUT  /api/growth/:id
     → Sửa số đo (CHƯA CÓ — cần thêm)

DELETE /api/growth/:id
     → Xóa số đo (như hiện tại)
```

### 7.3 Montessori Tracking APIs (mới)

```
GET  /api/kids/:kidId/montessori
     → Montessori info (như hiện tại)

GET  /api/kids/:kidId/montessori/progress
     → Danh sách activities + progress
     → Response:
       {
         activities: [{ key, title, icon, category, progress: { status, notes, evidence_photo } }],
         stats: { total: 18, completed: 8, inProgress: 3, notStarted: 7 },
         percentage: 44
       }

POST /api/kids/:kidId/montessori/progress
     → Cập nhật progress (multipart nếu có ảnh)
     → Body: { activity_key, status, notes, evidence (file) }

GET  /api/kids/:kidId/montessori/weekly-plan
     → Kế hoạch tuần hiện tại

POST /api/kids/:kidId/montessori/weekly-plan
     → Auto-generate kế hoạch tuần
```

---

## 8. Frontend Components

### 8.1 Component Architecture

```
index.html (SPA)
│
├── State Management (global state object)
│   ├── state.user          — { id, displayName, role }
│   ├── state.token         — JWT string
│   ├── state.kids          — Array<Kid>
│   ├── state.selectedKid   — number | null
│   └── state.page          — 'dashboard' | 'diary' | ...
│
├── Screens
│   ├── LoginScreen
│   │   ├── UserSelector
│   │   └── PINPad
│   │
│   ├── Dashboard (existing)
│   │
│   ├── GrowthScreen (enhanced)
│   │   ├── GrowthChart (WHO overlay)
│   │   ├── GrowthForm (modal)
│   │   ├── GrowthSummary (WHO evaluation)
│   │   └── GrowthTable (history)
│   │
│   ├── MontessoriScreen (enhanced)
│   │   ├── MontessoriHero (current stage)
│   │   ├── MontessoriProgress (progress bar)
│   │   ├── MontessoriWeeklyPlan
│   │   ├── MontessoriActivityCard
│   │   ├── MontessoriActivityDetail (modal)
│   │   └── MontessoriAllActivities (filterable)
│   │
│   └── ... (other screens unchanged)
│
├── Shared Components
│   ├── Modal (existing)
│   ├── Toast (existing)
│   ├── TabBar
│   └── ProgressBar
│
└── Utilities
    ├── api() — fetch wrapper (auto-attach JWT)
    ├── auth — login/logout/refresh
    └── who — z-score helpers
```

### 8.2 Code Changes Summary

| File | Thay đổi | Ước tính |
|------|----------|---------|
| `package.json` | Thêm bcryptjs, jsonwebtoken, express-rate-limit | +3 deps |
| `server.js` | Auth middleware, Growth analysis API, Montessori tracking API | +250 lines |
| `montessori.js` | Thêm `key` field cho mỗi activity | +40 keys |
| `middleware/auth.js` | **MỚI** — JWT guard, authorizeKid | ~60 lines |
| `scripts/seed-who.js` | **MỚI** — Seed WHO LMS data | ~30 lines |
| `data/who-lms-data.json` | **MỚI** — WHO reference data | ~1000 rows |
| `public/index.html` | Login screen, Growth Chart + WHO, Montessori tracking | +500 lines |
| `public/login.html` | **MỚI** — Tách login page (optional) | ~100 lines |

---

## 9. Implementation Order

```
Phase 1: Bảo mật (3-5 ngày)
│
├── Day 1: Install deps, tạo users table, seed admin user
├── Day 2: Auth API (setup, login, refresh)
├── Day 3: Auth middleware + rate limiter
├── Day 4: Frontend login screen + PIN pad
└── Day 5: Test + fix edge cases

Phase 2a: Growth Chart + WHO (4-6 ngày)
│
├── Day 1: Seed WHO LMS data (prepare JSON file)
├── Day 2: Growth analysis API (Z-score calculation)
├── Day 3: WHO curves generation API
├── Day 4: Frontend Growth Chart component (canvas-based)
├── Day 5: WHO overlay + tooltips + evaluation
└── Day 6: Growth summary + trend analysis

Phase 2b: Montessori Tracking (3-4 ngày)
│
├── Day 1: Add activity keys, create montessori_progress table
├── Day 2: Progress CRUD API
├── Day 3: Weekly plan API
├── Day 4: Frontend tracking UI + progress bar
```

---

## Appendix A: WHO LMS Data Source

Dữ liệu WHO LMS chính thức từ:
- **WHO Child Growth Standards**: https://www.who.int/tools/child-growth-standards/standards
- **CDC WHO Data Files**: https://www.cdc.gov/growthcharts/who-data-files.htm

Cần download và parse từ Excel sang JSON format:
```
{ indicator, sex, age_months, length_cm, l, m, s }
```

## Appendix B: Error Handling

```javascript
// Tất cả API nên có try-catch
app.get('/api/kids/:kidId/growth/analysis', authorizeKid, async (req, res) => {
  try {
    // ... logic
  } catch (err) {
    console.error('Growth analysis error:', err);
    res.status(500).json({ error: 'Lỗi phân tích dữ liệu tăng trưởng' });
  }
});
```

## Appendix C: Security Checklist

- [ ] PIN hashed bằng bcrypt (cost=10)
- [ ] JWT expire sau 2 giờ
- [ ] Rate limit login: 10 lần/15 phút
- [ ] CORS restrict (nếu cần)
- [ ] Helmet.js cho security headers
- [ ] Input validation cho tất cả API params
- [ ] File upload: kiểm tra mime type (không chỉ extension)
- [ ] SQLite WAL mode (đã có)
