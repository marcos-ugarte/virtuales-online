# Local race videos (dev only)

This directory is served by Vite at `/videos/...` and is the fallback
source for race mp4s in local development. Production deployments
serve the same files from a CDN (CloudFront, Cloudflare R2, Azure Front
Door — whatever the backend signs URLs against).

## How the resolver picks a source

`src/services/videoUrl.ts` looks at two env vars (set in `.env.local`):

```
VITE_VIDEO_OVERRIDE_BASE   — if set, strip the backend URL down to its
                             path and prepend this base
VITE_VIDEO_PLACEHOLDER     — if set, every race uses this single file
                             regardless of what the backend sent
```

| Env vars                                  | Behaviour                                                 |
|-------------------------------------------|-----------------------------------------------------------|
| (none)                                    | Use the URL the backend embedded (CloudFront, signed).    |
| `VITE_VIDEO_PLACEHOLDER=/videos/sample.mp4` | Every race plays `/videos/sample.mp4`. Quickest setup.  |
| `VITE_VIDEO_OVERRIDE_BASE=/videos`        | Mirror the CDN paths: `/dog6/R0716_h.mp4`, etc.           |
| `VITE_VIDEO_OVERRIDE_BASE=https://cdn.virtualrace.com.do` | Production CDN. Cero diff de código entre dev y prod. |

## Quick start — single placeholder

Easiest path: drop ONE mp4 (any 45s clip works) at:

```
web-lobby/public/videos/placeholder.mp4
```

and set in `web-lobby/.env.local`:

```
VITE_VIDEO_PLACEHOLDER=/videos/placeholder.mp4
```

Reload the dev server (Vite picks up the env on restart). Now every race
plays the placeholder regardless of what the backend sends.

## Mirroring the full CDN library

If you want a faithful local mirror of all races:

1. Run a small script that walks the WS feed for ~24h capturing
   `videoname.mp4` URLs (they rotate by signature, the path is stable).
2. Curl each unique path into `web-lobby/public/videos/<type>/<file>.mp4`.
3. Set `VITE_VIDEO_OVERRIDE_BASE=/videos`.

This keeps the URL pattern identical between dev and prod: just swap
the base when you move to R2.

## Production cutover

When the backend starts signing URLs against the new CDN (R2, Azure FD,
etc.), set the env on the deployed lobby:

```
VITE_VIDEO_OVERRIDE_BASE=https://cdn.virtualrace.com.do
```

…OR leave it unset and let the backend send the signed URLs directly
(then the lobby plays them as-is). Both work; the override is most
useful when you want the lobby to control the CDN host while the
backend keeps signing arbitrary URLs.
