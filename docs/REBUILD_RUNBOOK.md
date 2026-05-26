# Rebuild runbook — web-lobby & tvbox-online

> **TL;DR after any `vite build`:** the videos disappear (404) until you
> **recreate the `dist/videos/{dog6,dog8,horse7}` symlinks**, and users must
> **hard-refresh (Ctrl+Shift+R)**. Use `scripts/rebuild-web.sh` so you can't
> forget the symlink step.

## The two things that break on every rebuild

`npx vite build` **wipes the entire `dist/` directory** and recreates it from
`src/` + `public/`. That has two recurring side-effects:

### 1. Videos stop loading (404) — the symlink farm is destroyed
- Real race videos live in **`/home/claude/projects/ds_assets/{dog6,dog8,horse7}`**
  (115 GB, outside the repo). CloudFront is dead, so they are served locally.
- In **dev**, Vite's `localRaceVideosPlugin` (`vite.config.ts`) serves `/videos/*`
  from `LOCAL_VIDEOS_DIR`. In **preview**, `configurePreviewServer` does the same.
- But the **deployed** build is served by `serve_webapp.py` (plain Python HTTP
  with Range support), **not** Vite — so there is no plugin. It can only serve
  what physically exists under `dist/`. The mechanism is **directory symlinks**:
  ```
  dist/videos/dog6   -> /home/claude/projects/ds_assets/dog6
  dist/videos/dog8   -> /home/claude/projects/ds_assets/dog8
  dist/videos/horse7 -> /home/claude/projects/ds_assets/horse7
  ```
  `public/videos/` holds only a `README.md` placeholder — Vite copies symlink
  **targets** (not the links) from `public/`, and copying 115 GB is unacceptable,
  so the links live in `dist/` and **must be recreated after each build**.
- The backend asks for `R####_h.mp4`; the `_h` aliases inside each `ds_assets/<type>/`
  resolve to the real variant (dog6→`_h50`, dog8→`_crf27`, horse7→`_h50`), so a
  plain **directory** symlink is enough — no per-file farm needed.

**Fix (run from the app dir after build):**
```bash
mkdir -p dist/videos
for t in dog6 dog8 horse7; do ln -sfn /home/claude/projects/ds_assets/$t dist/videos/$t; done
```

### 2. Page goes blank — stale cached bundle
- Vite content-hashes the JS (`index-<hash>.js`) and **deletes the old hash**.
- A browser holding the old `index.html` requests the deleted chunk → 404 → blank
  page. This looks like "todo desapareció" but the build is fine.

**Fix:** hard-refresh the tab — **Ctrl+Shift+R** (Cmd+Shift+R on Mac).

## The one-command fix

Always rebuild through the helper, which builds **and** restores the symlinks:
```bash
scripts/rebuild-web.sh web-lobby      # or: tvbox-online
```
Then hard-refresh the browser tab.

## Verify videos are actually served (don't trust the build log)
```bash
# Range probe a real file — expect HTTP 206; poster expect 200
curl -s -o /dev/null -w "%{http_code}\n" -r 0-1023 \
  "http://localhost:8891/videos/dog6/R0001_h.mp4"          # tvbox  -> 206
curl -s -o /dev/null -w "%{http_code}\n" -r 0-1023 \
  "http://localhost:8889/videos/dog6/R0001_h.mp4"          # lobby  -> 206
```

## Who serves what (current VPS)
| Port | App                         | Served from                         |
|------|-----------------------------|-------------------------------------|
| 8889 | web-lobby (production)      | `web-lobby/dist/` via `serve_webapp.py`   |
| 8891 | tvbox-online                | `tvbox-online/dist/` via `serve_webapp.py`|

`serve_webapp.py` (from `virtuales-go/tools/playwright/`) provides HTTP Range
support, required for `<video>` seeking. Static files only — a rebuild needs no
server restart, just the symlink re-link + a browser hard-refresh.
