import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Local race videos plugin
 * ───────────────────────────────────────────────────────────────────────
 * Serves race mp4s from an arbitrary folder on disk under the dev URL
 * prefix `/videos/`. Lets us play locally-stored race videos in dev
 * without copying them into the project tree.
 *
 * Configure via env (read from `.env.local` by Vite's loadEnv):
 *   LOCAL_VIDEOS_DIR=C:/RacingDogs/videos     ← absolute path on disk
 *
 * The backend's CloudFront URLs come in the form
 *   /dog6/R0716_h.mp4
 *   /dog8/R0260_h.mp4
 *   /horse7/R1755_h.mp4
 *
 * If the on-disk layout uses different folder names, add a PATH_REWRITES
 * entry. If the FILE names differ (e.g. `_h.mp4` vs `_crf27.mp4`), add a
 * FILENAME_FALLBACKS entry — the plugin tries each fallback in turn.
 */
const PATH_REWRITES: Array<[string, string]> = [
  // No directory rewrites needed for the current layout — backend's
  // /dog6/, /dog8/, /horse7/ match the local folder names directly.
];

/**
 * Filename suffix tolerance. The backend's URL ends in `R0716_h.mp4` but
 * on disk we have the same render under different encoding suffixes
 * (`R0716_crf27.mp4`, `R0716_h50.mp4`, etc. — all the same race). When
 * the exact URL filename doesn't exist, we look for any file that starts
 * with `R0716_` and has the same extension, preferring the suffixes in
 * `ENCODING_PREFERENCE`.
 */
const ENCODING_PREFERENCE = ['crf27', 'h50', 'h'] as const;

function localRaceVideosPlugin(rootDir: string | undefined): Plugin {
  return {
    name: 'local-race-videos',
    configureServer(server) {
      if (!rootDir) {
        server.config.logger.info(
          '[local-race-videos] LOCAL_VIDEOS_DIR not set, plugin disabled',
        );
        return;
      }
      if (!fs.existsSync(rootDir)) {
        server.config.logger.warn(
          `[local-race-videos] LOCAL_VIDEOS_DIR=${rootDir} does not exist`,
        );
        return;
      }
      const root = path.resolve(rootDir);
      server.config.logger.info(
        `[local-race-videos] serving /videos/* from ${root}`,
      );

      server.middlewares.use('/videos', (req, res, next) => {
        if (!req.url) return next();
        let urlPath = req.url.split('?')[0];
        for (const [from, to] of PATH_REWRITES) {
          if (urlPath.startsWith(from)) {
            urlPath = to + urlPath.slice(from.length);
            break;
          }
        }

        const dir = urlPath.replace(/[^/]+$/, '');
        const file = urlPath.replace(/.*\//, '');

        // First try the exact filename the URL asks for.
        const exactFsPath = path.resolve(root, '.' + urlPath);
        if (!exactFsPath.startsWith(root)) {
          res.statusCode = 400;
          res.end('bad path');
          return;
        }
        fs.stat(exactFsPath, (err, stats) => {
          if (!err && stats.isFile()) {
            streamFile(req, res, exactFsPath, stats);
            return;
          }
          // Fallback: any sibling file with the same round prefix +
          // extension. We list the directory once and pick the best
          // encoding variant (crf27 > h50 > h > anything).
          const m = file.match(/^(R\d+)_[^.]+(\.[a-z0-9]+)$/i);
          if (!m) return next();
          const [, prefix, ext] = m;
          const dirFs = path.resolve(root, '.' + dir);
          fs.readdir(dirFs, (rdErr, files) => {
            if (rdErr) return next();
            const matchRx = new RegExp(
              `^${escapeRegex(prefix)}_([^.]+)${escapeRegex(ext)}$`,
              'i',
            );
            const matches = files.filter((f) => matchRx.test(f));
            if (matches.length === 0) return next();
            const ranked = matches.sort((a, b) => {
              const sa = a.match(matchRx)?.[1] ?? '';
              const sb = b.match(matchRx)?.[1] ?? '';
              return rank(sa) - rank(sb);
            });
            const picked = path.join(dirFs, ranked[0]);
            fs.stat(picked, (sErr, sStats) => {
              if (sErr || !sStats.isFile()) return next();
              streamFile(req, res, picked, sStats);
            });
          });
        });
      });
    },
  };
}

function streamFile(
  req: IncomingMessage,
  res: ServerResponse,
  fsPath: string,
  stats: fs.Stats,
): void {
  const range = req.headers.range;
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10) || 0;
    const end = endStr ? parseInt(endStr, 10) : stats.size - 1;
    const chunkSize = end - start + 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Type', mimeFor(fsPath));
    fs.createReadStream(fsPath, { start, end }).pipe(res);
  } else {
    res.statusCode = 200;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', mimeFor(fsPath));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(fsPath).pipe(res);
  }
}

function rank(suffix: string): number {
  const i = ENCODING_PREFERENCE.indexOf(suffix.toLowerCase() as never);
  return i === -1 ? ENCODING_PREFERENCE.length : i;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mimeFor(p: string): string {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.m4v': return 'video/x-m4v';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

// Vendored streaming_kit tree lives under src/tvkit/. These aliases let the
// UNMODIFIED streaming_kit files (RaceBarDog & its closure) resolve their
// original `client/*`, `common/*`, `settings/*`, `assets/*` imports against the
// vendored layout. They are prefix-scoped so tvbox-online's own code (which
// never imports from these bare prefixes) is unaffected. `client/assets/*` is
// listed before `client/*` so the more-specific prefix wins.
const tvkit = (p: string) =>
  path.resolve(__dirname, 'src/tvkit', p);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      localRaceVideosPlugin(env.LOCAL_VIDEOS_DIR),
    ],
    base: './',
    resolve: {
      alias: [
        { find: /^client\/assets\//, replacement: tvkit('assets') + '/' },
        { find: /^client\//, replacement: tvkit('client') + '/' },
        { find: /^common\//, replacement: tvkit('common') + '/' },
        { find: /^settings\//, replacement: tvkit('settings') + '/' },
        { find: /^assets\//, replacement: tvkit('assets') + '/' },
      ],
    },
    server: { port: 5173, host: '0.0.0.0' },
  };
});
