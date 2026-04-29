# 🌱 Kid Journey - Hướng dẫn Deploy

## Yêu cầu
- Node.js >= 18 (cài: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs`)
- Mini PC trong LAN, mở port 3107

## Bước deploy

### 1. Clone repo
```bash
git clone https://github.com/dinhhieudl/kid-journey.git
cd kid-journey
```

### 2. Cài dependencies
```bash
npm install
```

### 3. Chạy thử
```bash
node server.js
# → 🧒 Kid Journey running at http://0.0.0.0:3107
```

### 4. Truy cập
Mở trình duyệt trên bất kỳ thiết bị nào trong LAN:
```
http://<IP_mini_PC>:3107
```

Xem IP: `hostname -I`

---

## Chạy nền (production)

### Cách 1: systemd (khuyến nghị)
```bash
sudo tee /etc/systemd/system/kid-journey.service << 'EOF'
[Unit]
Description=Kid Journey
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/kid-journey
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kid-journey
sudo systemctl start kid-journey
sudo systemctl status kid-journey
```

### Cách 2: pm2
```bash
npm install -g pm2
pm2 start server.js --name kid-journey
pm2 save
pm2 startup
```

### Cách 3: screen/tmux
```bash
screen -S kid-journey
node server.js
# Ctrl+A D để detach
```

---

## Mở port tường lửa
```bash
# Ubuntu/Debian
sudo ufw allow 3107

# CentOS/RHEL
sudo firewall-cmd --add-port=3107/tcp --permanent
sudo firewall-cmd --reload
```

## Backup dữ liệu
Dữ liệu SQLite lưu tại: `./data/kidjourney.db`
```bash
cp data/kidjourney.db data/kidjourney.db.backup
```

## Cập nhật
```bash
cd kid-journey
git pull
npm install  # nếu có package mới
# Restart service:
sudo systemctl restart kid-journey
# hoặc: pm2 restart kid-journey
```
