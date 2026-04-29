#!/bin/bash
# Kid Journey - Start/Stop/Restart
DIR="$(cd "$(dirname "$0")" && pwd)"
PID=$(pgrep -f "node.*kid-journey/server.js" 2>/dev/null)

case "${1:-start}" in
  start)
    if [ -n "$PID" ]; then
      echo "⚠️  Already running (PID: $PID)"
    else
      cd "$DIR"
      nohup node server.js > data/server.log 2>&1 &
      sleep 1
      IP=$(hostname -I | awk '{print $1}')
      echo "🌱 Kid Journey started!"
      echo "   LAN: http://${IP}:3107"
      echo "   Local: http://localhost:3107"
      echo "   PID: $!"
    fi
    ;;
  stop)
    if [ -n "$PID" ]; then
      kill $PID 2>/dev/null
      echo "🛑 Stopped (PID: $PID)"
    else
      echo "Not running"
    fi
    ;;
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
  status)
    if [ -n "$PID" ]; then
      echo "✅ Running (PID: $PID)"
      echo "   $(curl -s http://localhost:3107/api/stats 2>/dev/null || echo 'N/A')"
    else
      echo "❌ Not running"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    ;;
esac
