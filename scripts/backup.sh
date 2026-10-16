#!/usr/bin/env bash
# Online, consistent SQLite backup using the sqlite3 ".backup" command (safe while the app is running).
# Usage: ./scripts/backup.sh [db-path] [backup-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-data/interviewforge.db}"
OUT="${2:-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$OUT"
TARGET="$OUT/interviewforge-$(date +%F-%H%M).db"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$TARGET'"
else
  echo "sqlite3 not installed; falling back to stop/copy/start" >&2
  docker compose stop
  cp "$DB" "$TARGET"
  docker compose start
fi

find "$OUT" -name 'interviewforge-*.db' -mtime +"$KEEP_DAYS" -delete
echo "Backup written to $TARGET"
