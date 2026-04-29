#!/bin/bash
cd "$(dirname "$0")"

# Kill existing if running
pkill -f "node server.js" 2>/dev/null

# Start server
nohup node server.js > data/server.log 2>&1 &
echo "Kid Journey started on port 3107 (PID: $!)"
echo "Access: http://$(hostname -I | awk '{print $1}'):3107"
