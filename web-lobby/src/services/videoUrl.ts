/**
 * Video URL resolver — central point to swap where mp4s are fetched from.
 *
 * The backend (`virtuales-go`) embeds a fully-signed CloudFront URL in
 * every race's `videoname.mp4`. We don't have to use it directly:
 *
 *   - In **prod** with the real vendor CDN: `VITE_VIDEO_OVERRIDE_BASE` is
 *     unset → we hand the URL through unchanged (signature intact).
 *
 *   - In **local dev**: set `VITE_VIDEO_OVERRIDE_BASE=/videos` and drop
 *     mp4 files in `web-lobby/public/videos/...`. The URL is rewritten:
 *
 *       backend: https://d1d5bk95n21f2z.cloudfront.net/dog6/R0716_h.mp4?Signature=…
 *       served : /videos/dog6/R0716_h.mp4
 *
 *     Vite serves `public/` automatically, no extra process needed.
 *
 *   - When we migrate to Cloudflare R2 (or any other CDN): set
 *     `VITE_VIDEO_OVERRIDE_BASE=https://cdn.virtualrace.com.do` and the
 *     same rewrite produces R2 URLs. The frontend doesn't care which
 *     provider serves the asset.
 *
 * Set `VITE_VIDEO_PLACEHOLDER=/videos/placeholder.mp4` to force every
 * race to use a single fallback clip — useful when you have ONE sample
 * mp4 instead of the full library.
 */

const OVERRIDE_BASE = (
  import.meta.env.VITE_VIDEO_OVERRIDE_BASE as string | undefined
)?.replace(/\/$/, '');

const PLACEHOLDER =
  (import.meta.env.VITE_VIDEO_PLACEHOLDER as string | undefined) || null;

export function resolveVideoUrl(backendUrl: string | undefined): string | undefined {
  if (!backendUrl) return undefined;
  if (PLACEHOLDER) return PLACEHOLDER;
  if (!OVERRIDE_BASE) return backendUrl;
  // Strip host + query (signature). Keep the path so file-system layout
  // mirrors the CDN: /dog6/RNNN_h.mp4 → ${BASE}/dog6/RNNN_h.mp4
  try {
    const u = new URL(backendUrl);
    return OVERRIDE_BASE + u.pathname;
  } catch {
    return backendUrl;
  }
}

/** Same logic for the poster image so it travels with the mp4. */
export function resolveVideoPoster(backendUrl: string | undefined): string | undefined {
  if (!backendUrl) return undefined;
  if (!OVERRIDE_BASE) return backendUrl;
  try {
    const u = new URL(backendUrl);
    return OVERRIDE_BASE + u.pathname;
  } catch {
    return backendUrl;
  }
}
