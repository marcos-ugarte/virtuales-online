# Presentation / landing site — visual reference

When the marketing or presentation website that links into this app gets built (the "front door" before the user reaches the live lobby at `web-lobby/`), it MUST follow the visual style defined here:

**Reference style:** https://styles.refero.design/style/5d273906-0110-48cf-99cd-63a72eb9c586

## What this is

A standalone marketing / landing experience that introduces the product and routes visitors into the live lobby. Out of scope for the lobby itself (`web-lobby/` keeps its current Golden Race / virteon dark theme); this is for the surrounding promotional site.

## What to mirror from refero.design

- Palette / hero treatments / typography ratios as defined at the URL above (this is the canonical reference — re-fetch when ready to design).
- Maintain visual continuity with the lobby on the **gold accent** (`#f5a623`) and dark surfaces, so the transition from landing → app doesn't feel jarring.

## What lives in this repo that the presentation site should reuse

If the presentation site is built in the same repo (or pulls from a shared assets package), point it at:

- `web-lobby/public/assets/goldenrace_logo.svg` — primary logo (also at `custom-lobby/assets/`).
- `web-lobby/public/assets/hero/dog-race.jpg`, `horse-race-v2.png` — race imagery for hero / feature sections.
- The shield SVGs under `web-lobby/public/assets/{dos,doe,hoc}-shields/` — usable as small decorative elements in feature lists ("6 dogs", "8 dogs", "7 horses" cards).

## App entry point to link to

Once deployed, the presentation site's primary CTA links to whatever URL `web-lobby/` is hosted at (e.g., `https://lobby.example.com/`). For local development that URL is `http://localhost:5173/`.

## Action items (when this work begins)

1. Fetch the refero.design style URL and capture the palette / typography / spacing tokens into a small design-tokens file (probably `presentation/src/tokens.ts` or similar).
2. Confirm with the team that the gold accent and dark-on-gold CTA convention matches both sides.
3. Decide hosting topology: same monorepo as `web-lobby/`, or a separate Vite/Next app under `presentation/`.
