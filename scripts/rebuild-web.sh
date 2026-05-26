#!/usr/bin/env bash
# Rebuild a web app AND restore the local video symlinks that `vite build` wipes.
# Without the symlinks, race videos 404 in the deployed (serve_webapp.py) build.
# See docs/REBUILD_RUNBOOK.md. After running, hard-refresh the tab (Ctrl+Shift+R).
set -euo pipefail

APP="${1:-}"
case "$APP" in
  web-lobby|tvbox-online) ;;
  *) echo "usage: scripts/rebuild-web.sh <web-lobby|tvbox-online>" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="/home/claude/projects/ds_assets"

cd "$ROOT/$APP"
echo "▶ building $APP …"
npx vite build

echo "▶ restoring video symlinks (dist/videos/{dog6,dog8,horse7}) …"
mkdir -p dist/videos
for t in dog6 dog8 horse7; do ln -sfn "$ASSETS/$t" "dist/videos/$t"; done

echo "✓ $APP rebuilt and videos re-linked. Now hard-refresh the tab (Ctrl+Shift+R)."
