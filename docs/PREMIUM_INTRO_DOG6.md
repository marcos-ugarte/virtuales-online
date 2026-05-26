# Premium inter-race intro — dog6 (180s) — timeline breakdown + storyboard

> Companion to `HANDOFF_TVBOX_ONLINE.md` → "NEXT FEATURE". This is the
> reverse-engineered timeline of the REAL 180s intro for **dog6**, and the
> from-scratch premium storyboard we build from it (Decision **B**: inspired by,
> NOT a port/replica of the MP4). All data comes from our web-ds wire.

## Reference asset (dog6)
- File: `ds_assets/dog6/intro_4_oao_crf27.mp4` — **179.68s**, 1920×1080, **50fps**, H264, **no audio**.
  - `_oao` = "empty odds boards" variant: cinematic drone footage + EMPTY navy
    boards; the production webview overlays live odds onto the cells. THIS is the
    structural reference (shows camera/board choreography without baked numbers).
  - Sibling `intro_4_crf27.mp4` = 180.0s **with** AAC audio (pre-baked full version);
    `intro.mp3` = the soundtrack bed. Round-4 broadcast = every 240s → this 180s clip.
- Regenerate reference frames (no binaries committed):
  ```
  IN=ds_assets/dog6/intro_4_oao_crf27.mp4
  ffmpeg -i "$IN" -vf "fps=1/5,scale=480:-1,drawtext=text='%{eif\:t\:d}s':x=10:y=10:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6" /tmp/intro_frames/oao_%03d.jpg
  ```

## Trap-color system (universal, same as our overlays — keep uniform per game type)
| Trap | dog6 color        |
|------|-------------------|
| 1    | Red               |
| 2    | Blue              |
| 3    | White             |
| 4    | Black             |
| 5    | Orange/Yellow     |
| 6    | Black/White checkered |

Header row (columns 1–6) and left column (rows 1–6) both carry these swatches +
white numerals. (dog8 adds 7 = green/red stripe, 8 = black/yellow stripe.)

## What the real intro actually is (the honest summary)
A **single glassy navy EXACTA 6×6 matrix board** floating in perspective over
**continuous real drone footage** of an English racecourse (grandstand, lake,
tented village, big screen, car parks; light drifts from midday → golden hour).
The board persists almost the whole 180s; the "show" is: a signature brand
wipe-in, the matrix build, a mid-section WIN/runner feature where the matrix
tilts aside, then a long matrix hold into pre-race dusk. Elegant but mostly
*static graphics over cinematic video* — the premium feel is the footage +
glass/perspective + trap-color coding + smooth parallax, not heavy motion.

**Axis labels (PRIMERO/SEGUNDO):** anchored to the board edges, not floating —
`PRIMERO` (rows = 1st place) is a vertical tab centred on the LEFT edge,
`SEGUNDO` (columns = 2nd place) a horizontal tab centred on the TOP edge. Both
are children of the `matrix` container (`scene.ts`), so the move/scale beats
transform the board **and its labels as one unit** (matrix pivot = visual centre).

### Reverse-engineered beats (timestamps from the _oao clip)
| t (s)   | Beat | What's on screen |
|---------|------|------------------|
| 0–12    | **Brand open** | Aerial establishing shot. Signature blue **L-frame** (top bar + left bar) wipes in with a red accent tick; logo lockup top-right (dark+blue angled tiles w/ light underline). |
| 12–20   | **Matrix build** | The 6×6 board assembles: rounded navy glass panel → header row (trap colors 1–6) → left column (1–6) → empty cells. Perspective tilt tracks the drone. |
| 20–45   | **Odds hold (WIN→EXACTA)** | Full matrix held over clouds/grandstand/lake. (Production fills WIN odds first, then the exacta cells with count-up.) |
| 45–95   | **WIN / runner feature** | Matrix **tilts to the right**; a translucent **left panel** appears with a **track-map oval** graphic; a **bottom strip of 6 angled trap tiles** (numbered, color-barred) slides in = the runner/WIN presentation. Camera over the tented village/crowd. |
| 95–160  | **Matrix return / long hold** | Back to the flat full matrix over changing venue angles; daylight warms toward golden hour. |
| 160–180 | **Pre-race dusk** | Evening light, tractors grooming the track, big screen visible in-frame; logo lockup tints **blue→red** = anticipation before the off. |

## Our premium storyboard (from scratch, ~180s, dog6, web-ds driven)
Same 6 beats, but **modernised** and fed by live data. Tech: PIXI 7 (installed) +
**GSAP** + `@pixi/filter-glow` / `@pixi/filter-advanced-bloom` (not yet installed).
Background = our local race-venue footage / a looping cinematic plate (we have the
clips locally; no CloudFront). Toggle `VITE_WAIT_MODE`/`?wait=premium` vs `image`.

| t (s)   | Segment | Data → graphics | Motion / FX |
|---------|---------|-----------------|-------------|
| 0–12    | **Open / brand** | Game name, race # (`raceNumber`), `videoStartDt` → "NEXT RACE", venue/weather (`weather/temperature/wind`). | L-frame wipe-in (GSAP stagger), logo bloom pulse, weather chip fade. Parallax drone plate. |
| 12–40   | **Runner roll-call** | `competitors[]` one by one: `name`, trap color, `strikeRate`, `bestLap`, `numberOfWins`, `trend`, `last5` mini-sparkline. | Cards slide in left→right with trap-color bar; stats **count up** (GSAP), sparkline draws on; glow on the in-card. |
| 40–95   | **WIN odds wall** | `odds[]` WIN per trap → 6 big tiles, color-coded, sorted/favorite highlighted. | Animated odds **counters**, favorite tile bloom, subtle 3D tilt parallax tied to bg camera. |
| 95–150  | **EXACTA matrix** | `odds[]` EXACTA → 6×6 cells (row beats column), diagonal blanked. | Matrix builds row-by-row (GSAP stagger), cells fade with count-up, hot combos glow. Header/left = trap colors. |
| 150–168 | **Form / jackpot** | `resultHistory` (recent winners strip), `jackpotInfo.bonusHistory` if present. | Ticker/marquee of past results; jackpot amount count-up with shimmer. |
| 168–180 | **Countdown** | `videoStartDt` → live MM:SS to the off. | Big countdown, ring/sweep, color shift to red, bloom ramp; hands off to the LIVE phase (RaceBar). |

### Notes / constraints
- **Uniform across game types**: dog8 = same segments, 8 runners / 8×8 matrix; no
  per-gameType branching in behavior, only counts/colors differ. (`[[feedback_uniform_gametypes]]`)
- Keep `Logic.createPixiMask` `cacheAsBitmap=false` if we reuse tvkit pieces (video stutter rule).
- Verify via `vite build` + `vite preview` (dev can't load vendored type-only imports); re-link `dist/videos` after each build.
- **Next concrete step**: run `ui-ux-pro-max` for palette/type/FX direction, then PoC
  the **runner roll-call** panel (PIXI+GSAP) fed by real web-ds data; verify locally, then extend.

## Implementation status

**Visual direction chosen (Jorge): Gold Luxe** — charcoal `#14140f` + gold `#d4af37`,
elegant/luxury broadcast (Royal Ascot), coherent with the POS web-corporate skin.

**Stack installed**: `gsap`, `@pixi/filter-glow`, `@pixi/filter-advanced-bloom`
(+ existing `pixi.js@7`, `odometer`). Typography = the DIN faces already vendored
in `tvkit/fonts.css` (family names `DIN-Bold`/`DIN-Medium`/…).

**Files (ours, self-contained — no vendored tvkit touched):** `src/premium/`
- `theme.ts` — Gold Luxe tokens, trap colours (1 red…6 checkered, 7/8 for dog8), DIN fonts.
- `fx.ts` — gradientTexture, radialBackground, glassPanel, text, trapBadge, countText, sparkline.
- `data/PremiumData.ts` — `PremiumData` view-model + `buildPremiumData(race,…)` adapter
  (odds: `[0..N-1]`=WIN, `[N..]`=forecast in-order pairs i≠j) + `mockPremiumData(n)`.
- `scene.ts` — PIXI scene in a 1280×720 design space scaled to fit; radial bg + 36
  gold particles; persistent header (race label + glowing live clock fed by a
  `clockRef`, independent of the aesthetic loop); a looping GSAP "show".
- `PremiumIntro.tsx` — React host: one PIXI.Application, awaits DIN, ResizeObserver,
  feeds `remainingSec`→clockRef without rebuilding the tree.

**Wiring (non-destructive):** `LiveMonitor.tsx` PRE phase renders `<PremiumIntro>`
when `WAIT_MODE==='premium'` (`?wait=premium` or `VITE_WAIT_MODE=premium`), else the
old static hero+countdown. LIVE phase + overlays untouched. CSS `.premium-intro` in
`global.css`. Dev preview route: `?premiumDemo=1[&gameType=dog8&t=<sec>]` in `App.tsx`
renders the scene full-screen with mock data (no WS/auth) for deterministic capture.

**Wave 1 = DONE & verified** (vite build + preview :4990 + Playwright/swiftshader,
no runtime errors): Open header + **Runner roll-call** ("THE FIELD") — staggered
glass rows, trap badges, count-up STRIKE/BEST/WINS, form sparkline, gold WIN-odds
tile. Confirmed dog6 (6 rows) and dog8 (8 rows). Screenshots `/tmp/premium1.png`,
`/tmp/premium_dog8.png`.

**Direction (Jorge, after reviewing Wave 1): "Gold Luxe pero timeline lineal 180s"** —
keep the from-scratch Gold Luxe aesthetic (NOT a replica of the real blue intro) but
follow the REAL intro's beat ORDER and TIMING as a linear ~180s film, not a short loop.

**Wave 2 = DONE & verified** (vite build + demo + Playwright, all 6 beats, no errors):
the scene is now a **linear ~180s "film" SCRUBBED by the live remaining time** — each
frame sets `master.time(clamp(180 - remainingSec, 0, 180))` so the countdown finale
ALWAYS lands at the off, even if we mount mid-wait (jumps to the right beat). Beats:
- 0–12 **Brand open**: "LIVE VIRTUAL RACING" + glowing race label + weather chips.
- 12–42 **Runner roll-call** ("THE FIELD"): staggered glass rows, count-up stats, sparkline.
- 42–96 **WIN odds wall**: N colour-coded tiles, favourite (lowest) with glow + FAVOURITE tag.
- 96–150 **EXACTA matrix**: N×N forecast, trap badges on header/left, hot-combo glow, count-up.
- 150–168 **Jackpot & form**: progressive jackpot count-up (bloom) + history + recent-winner badges.
- 168–180 **Countdown finale**: big number (live, from clockRef) + depleting ring (→red ≤5s) + GET READY.
Persistent header (race label + glowing clock) stays across all beats. Cross-fade between
beats (no blank/black interval). `beat(cont,t0,t1,build)` lays each on the paused master.
Deployed on :8891 (premium default). Demo: `?premiumDemo=1&t=<remainingSec>` scrubs to any beat.

**Refinements 2026-05-25 (Jorge feedback):**
- **Matrix diagonal = WIN odds.** A same-dog 1st+2nd forecast is impossible, so the
  EXACTA diagonal now carries each trap's **WIN price** (gold text + gold-tinted cell,
  count-up), with a "diagonal = WIN" legend. Off-diagonal = exacta (white, rounded).
- **Transitions**: each beat now enters with fade + upward slide (`power3.out`) and
  exits sliding up (`beat()` uses `fromTo` alpha+y), a clearer reveal of each element set.
- **Data robustness**: PremiumIntro effect deps now include `race?.odds?.length` so if
  odds arrive after mount (slim first frame → full odds) the scene rebuilds and WIN/EXACTA
  aren't left empty. Confirmed the /web-ds feed DOES carry full `odds` (len 36, WIN+EXACTA
  populated) for upcoming dog6 races, so real-data render is expected.

**Animation pass 2026-05-25 (Jorge: "same animations as the original, but with our graphics" — graphics only for now, animated background later):** recreated the original's
motion language on the Gold Luxe elements:
- **Perspective swing-in / tilt-aside-out** on every beat (`beat()` tweens `cont.skew.x`
  + `cont.scale` around the stage centre via pivot) — the boards "turn toward camera" on
  enter and tilt away on exit, like the original's glassy boards.
- **L-frame brand wipe** at the open (top bar sweeps from left, left bar drops from top).
- **Matrix board assembly**: header trap badges stagger L→R, then the left column T→B,
  then cells fill row-by-row (mirrors the original's board build).
NOTE: the animated cinematic BACKGROUND is deliberately deferred (Jorge: "later").

**RESTRUCTURE 2026-05-25 — matrix-centric, 2-cycle script (Jorge, faithful to the original):**
The original intro = the EXACTA odds matrix as the persistent centrepiece, and its
animation script REPEATS 2× over the 180s (confirmed by comparing frames at t vs t+90).
`scene.ts` rewritten to match:
- **Open (once, 0–8s)**: brand L-frame wipe + race label + **weather/track chips** (the
  track-map oval animation was dropped per Jorge — just weather/track DATA).
- **Matrix (persistent centrepiece, 8–160s)**: EXACTA board with runner NAMES on the left
  column, trap badges on header, **WIN on the diagonal** (gold), exacta off-diagonal, hot-combo glow.
- **Cycle (repeats 2×)**: matrix centred → matrix slides UP + **runner-data strip BELOW**
  (badge, name, STRIKE/BEST/WINS, form sparkline) → matrix centred → matrix slides LEFT +
  **jackpot history panel on the RIGHT** (progressive jackpot count-up + recent winners +
  bonus history) → matrix centred.
- **Countdown finale (160–180s)**: ring + live number.
The matrix title/legend live on a FIXED header (`mHead`) so they don't clip when the matrix
slides aside. Still a paused timeline scrubbed by `FILM - remainingSec`. Old standalone
roster/WIN-wall/form beats removed.

**Still TODO**: animated cinematic background (deferred by Jorge); wire/verify the real web-ds data path end-to-end (adapter `buildPremiumData` is
ready; verify live odds fill WIN/EXACTA correctly) and re-verify against a live PRE race;
consider a subtle cinematic video plate behind the charcoal bg. Build with `npx vite build`;
re-link `dist/videos/{dog6,dog8,horse7}` after each build.
</content>
</invoke>
