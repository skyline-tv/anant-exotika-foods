#!/bin/sh
# Dump MongoDB to a gzip archive and keep the newest BACKUP_KEEP files.
# Schedule with cron, or run the compose "backup" service.
# Example cron (daily 02:15):
# 15 2 * * * MONGODB_URI="mongodb://127.0.0.1:27017/anant_exotika" BACKUP_DIR=/var/backups/anant-exotika /path/to/deploy/backup-mongo.sh
set -eu

OUT="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-14}"
URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/anant_exotika}"

mkdir -p "$OUT"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$OUT/anant-exotika-$STAMP.archive.gz"

mongodump --uri="$URI" --archive="$FILE" --gzip
echo "Backup written"

count=0
for old in $(ls -1t "$OUT"/anant-exotika-*.archive.gz 2>/dev/null); do
  count=$((count + 1))
  if [ "$count" -gt "$KEEP" ]; then
    rm -f "$old"
  fi
done
