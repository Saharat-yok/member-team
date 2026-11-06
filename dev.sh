#!/usr/bin/env bash
# เปิด/ปิด/ดูสถานะ MongoDB + API + หน้าเว็บ สำหรับรันในเครื่อง (proot)
# ใช้: ./dev.sh start | stop | status | restart | logs
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGOD="${MONGOD:-/root/mongo7/mongod}"
DATA="${MONGO_DATA:-/root/mongo-data}"
LOGDIR="${LOGDIR:-/root}"

port_up() { curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/$2"; }
mongo_up() { (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; }

wait_for() { # ชื่อ  คำสั่งเช็ก  จำนวนครั้ง
  local name=$1 check=$2 tries=${3:-30}
  for _ in $(seq "$tries"); do
    if eval "$check"; then echo "  ✓ $name พร้อม"; return 0; fi
    sleep 1
  done
  echo "  ✗ $name ไม่ขึ้นภายใน ${tries}s (ดู log ใน $LOGDIR)"; return 1
}

start() {
  [ -f "$ROOT/server/.env" ] || { echo "ไม่พบ server/.env (คัดลอกจาก server/.env.example)"; exit 1; }
  [ -d "$ROOT/node_modules" ] || { echo "ยังไม่ได้ติดตั้ง: รัน npx npm@10 ci ก่อน"; exit 1; }

  echo "MongoDB"
  if mongo_up; then echo "  - รันอยู่แล้ว"; else
    [ -x "$MONGOD" ] || { echo "ไม่พบ $MONGOD"; exit 1; }
    mkdir -p "$DATA"
    nohup "$MONGOD" --dbpath "$DATA" --port 27017 --bind_ip 127.0.0.1 >"$LOGDIR/mongod.log" 2>&1 &
    wait_for MongoDB mongo_up 30 || exit 1
  fi

  echo "API (:4000)"
  if port_up 4000 api/health; then echo "  - รันอยู่แล้ว"; else
    (cd "$ROOT" && nohup npm run dev -w server >"$LOGDIR/server.log" 2>&1 &)
    wait_for API "curl -sf --max-time 2 http://127.0.0.1:4000/api/health >/dev/null" 40 || exit 1
  fi

  echo "หน้าเว็บ (:5173)"
  if port_up 5173 ""; then echo "  - รันอยู่แล้ว"; else
    (cd "$ROOT" && nohup npm run dev -w client -- --host >"$LOGDIR/client.log" 2>&1 &)
    wait_for หน้าเว็บ "port_up 5173 ''" 40 || exit 1
  fi

  echo; echo "เปิดที่ http://localhost:5173"
}

stop() {
  pkill -f "vite" 2>/dev/null && echo "หยุดหน้าเว็บ"
  pkill -f "src/server.js" 2>/dev/null && echo "หยุด API"
  if pgrep -f "mongod --dbpath $DATA" >/dev/null; then
    pkill -TERM -f "mongod --dbpath $DATA"; echo "หยุด MongoDB (ข้อมูลยังอยู่ที่ $DATA)"
  fi
  return 0
}

status() {
  mongo_up                  && echo "MongoDB  : รันอยู่ (:27017)" || echo "MongoDB  : หยุด"
  port_up 4000 api/health   && echo "API      : $(curl -s --max-time 2 http://127.0.0.1:4000/api/health)" || echo "API      : หยุด"
  port_up 5173 ""           && echo "หน้าเว็บ : รันอยู่ (:5173)" || echo "หน้าเว็บ : หยุด"
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 2; start ;;
  status)  status ;;
  logs)    tail -n 20 "$LOGDIR/mongod.log" "$LOGDIR/server.log" "$LOGDIR/client.log" ;;
  *) echo "ใช้: $0 {start|stop|restart|status|logs}"; exit 1 ;;
esac
