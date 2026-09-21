#!/bin/sh
# Nightly PostgreSQL backup for Acidic, without anyone remembering to run it.
# Runs inside the compose network next to the database: whenever the newest dump in
# /backups is older than BACKUP_MAX_AGE_HOURS, a new one is taken, verified with
# pg_restore -l, and the oldest beyond BACKUP_KEEP are removed.
set -eu
KEEP="${BACKUP_KEEP:-30}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-20}"
DIR="/backups"

newest_age_hours() {
  newest=$(ls -1t "$DIR"/acidic-*.dump 2>/dev/null | head -n 1 || true)
  if [ -z "$newest" ]; then echo 999999; return; fi
  now=$(date +%s); mtime=$(stat -c %Y "$newest")
  echo $(( (now - mtime) / 3600 ))
}

take_backup() {
  stamp=$(date +%Y%m%d-%H%M%S)
  tmp="$DIR/acidic-$stamp.dump.tmp"
  final="$DIR/acidic-$stamp.dump"
  if pg_dump -Fc -f "$tmp" && pg_restore -l "$tmp" > /dev/null; then
    mv "$tmp" "$final"
    echo "backup: wrote $(basename "$final") ($(stat -c %s "$final") bytes)"
    ls -1t "$DIR"/acidic-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old"; echo "backup: pruned $(basename "$old")"; done
  else
    rm -f "$tmp"
    echo "backup: FAILED at $stamp" >&2
  fi
}

echo "backup: loop started, keep=$KEEP max_age=${MAX_AGE_HOURS}h"
while true; do
  age=$(newest_age_hours)
  if [ "$age" -ge "$MAX_AGE_HOURS" ]; then take_backup; else echo "backup: newest dump is ${age}h old, next check in 1h"; fi
  sleep 3600
done
