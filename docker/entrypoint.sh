#!/bin/sh
# Ensures the mounted /data directory is writable by the unprivileged "app" user,
# then drops root privileges before starting the application.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R app:app /data 2>/dev/null || echo "warning: could not chown /data; make sure it is writable by UID $(id -u app)"
  exec setpriv --reuid=app --regid=app --init-groups dotnet /app/InterviewForge.Api.dll "$@"
fi
exec dotnet /app/InterviewForge.Api.dll "$@"
