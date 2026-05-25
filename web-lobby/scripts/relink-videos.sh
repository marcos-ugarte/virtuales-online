#!/usr/bin/env bash
# Recreate the race-video symlink farm under dist/videos/ after a `vite build`.
#
# WHY: production (the VPS static server on :8889) serves the lobby's dist/.
# The build rewrites video URLs to /videos/<game>/<file> (VITE_VIDEO_OVERRIDE_BASE
# in .env.production), so dist/videos/<game> must point at the real files in
# ds_assets. `vite build` wipes dist/ every time, removing these symlinks — so
# run this AFTER every build, or use `npm run build:vps` which does both.
set -euo pipefail
DIST="$(cd "$(dirname "$0")/.." && pwd)/dist"
ASSETS="${LOCAL_VIDEOS_DIR:-/home/claude/projects/ds_assets}"
mkdir -p "$DIST/videos"
for game in dog6 dog8 horse7; do
  if [ -d "$ASSETS/$game" ]; then
    ln -sfn "$ASSETS/$game" "$DIST/videos/$game"
    echo "linked dist/videos/$game -> $ASSETS/$game"
  else
    echo "WARN: $ASSETS/$game not found, skipped" >&2
  fi
done
