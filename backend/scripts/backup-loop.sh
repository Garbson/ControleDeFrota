#!/bin/sh

if [ "${BACKUP_ENABLED:-false}" != "true" ]; then
  echo "ℹ️ Backup automático desativado neste ambiente"
  while true; do sleep 3600; done
fi

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  echo "🕒 Iniciando ciclo de backup"
  node /app/src/scripts/backup.js || echo "❌ Backup falhou; nova tentativa no próximo ciclo"
  sleep "$INTERVAL"
done
