# web-lobby — mobile responsive (Adaptive, Fase 1)

> **Status:** design spec, not yet implemented.
> **Branch:** `feat/responsive-mobile`
> **Estimate:** 8–12 h. Pure CSS + minor component restructuring. Zero
> backend/services changes.

## 1. Goal

Make the entire `web-lobby` usable on phones (360–430 px wide) without
breaking the existing 1280 px+ desktop layout. "Adaptive" approach:
**same model, reflowed** — no new navigation paradigm, no new screens.

## 2. Non-goals

- Tablet-specific tweaks (anything 721–1023 px keeps current behaviour).
- Mobile-first redesign with bottom navigation, full-screen sections,
  swipe gestures (deferred to a possible Phase 2).
- New features. This is layout + ergonomics only.
- Touch gestures beyond tap (no swipe, no long-press, no pull-to-refresh).
- PWA / install / offline.

## 3. Architecture

Single breakpoint:

```css
@media (max-width: 720px) { /* mobile rules */ }
```

Mobile rules co-exist with the two existing breakpoints
(`max-width: 1280px` and `max-width: 1024px`) in
[`web-lobby/src/styles/global.css`](web-lobby/src/styles/global.css) —
no rewrite of desktop rules.

Component file structure does **not** change. The same `Navbar`,
`RaceCard`, `LiveMonitor`, etc. render on both desktop and mobile; the
CSS reflows them. Two narrow exceptions noted in §4:

- The Jackpot moves from inside `LiveMonitor` to a chip inside `Navbar`
  on mobile (via CSS `display: none` on the old slot + a new mobile-only
  chip element in the navbar markup).
- The Betslip + MyBets surface uses a new `MobileActionBar` component
  rendered alongside the existing `RightPanel`. Desktop hides the bar;
  mobile hides the panel.

Touch targets: **minimum 44 × 44 px** for every clickable element.
Minimum 8 px gap between adjacent targets.

## 4. Component-by-component spec

### 4.1 Navbar — [`Navbar.tsx`](web-lobby/src/components/Navbar.tsx)

**Layout (mobile, ≤720 px):**

```
┌───────────────────────────────────────────────────┐
│ [VR]   🏆 $127K   RD$ 4,700.00   🎫(3)   ☰      │
└───────────────────────────────────────────────────┘
```

- Single 56 px row, sticky `top: 0`, `z-index: 100`.
- Logo: 32 × 32 px, left.
- Jackpot chip: gold gradient, compact (`$127K` truncated, full value
  on tap → opens read-only `JackpotDisplay` sheet). Only on mobile.
- Wallet balance: bold, right-of-center.
- `🎫(N)` button: opens MyBets sheet (see §4.5). Badge shows active
  ticket count.
- `☰` hamburger: opens a slide-down menu (under navbar) with:
  - 🇪🇸/🇬🇧 Lang toggle
  - RD$/USD Currency toggle
  - 👤 Player name (read-only)
  - "Cerrar sesión" button

**Hidden on mobile (move into ☰ menu):** Lang toggle, Currency toggle,
player name, logout.

### 4.2 Lobby shell — [`App.tsx`](web-lobby/src/App.tsx)

Mobile reflow of `.lobby-shell`:

```css
@media (max-width: 720px) {
  .lobby-shell {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
  }
  .lobby-rail { display: none; }      /* video + jackpot handled elsewhere */
  .lobby-section-header h1 { font-size: 1rem; }
}
```

Order of stacked children:

1. Section header ("PRÓXIMAS CARRERAS")
2. RaceCard × 3 (one per game)
3. RecentResults section
4. Footer

The desktop `LiveMonitor` and `JackpotDisplay` stay mounted but
visually replaced as per §4.3.

### 4.3 LiveMonitor + JackpotDisplay placement

**Jackpot (mobile):**
- `JackpotDisplay` in its current desktop slot is `display: none` on
  mobile.
- A new compact chip (`<span class="navbar-jackpot-chip">`) is rendered
  inside `Navbar` and shown only ≤720 px (`display: none` on desktop).
  Reads the same `jackpotValue` from `useRaceFeed` via context.
- Tap on chip → opens a bottom-sheet with the full `JackpotDisplay`
  visual (read-only).

**Live video (mobile):**
- The video element from `LiveMonitor` is portaled into the first
  `RaceCard` that is currently EN VIVO (matches `pinnedGame` or the
  first card whose `race.status === 'live'`).
- Implemented via a render-prop on `RaceCard`: if mobile + this card is
  live, show a `<video>` directly under the title; else `null`.
- The whole `.lobby-rail` (video + jackpot + recent results) is hidden
  on mobile via CSS.
- Recent results rendered separately at the end of the stack (§4.6).

### 4.4 Race cards — [`RaceCard.tsx`](web-lobby/src/components/RaceCard.tsx)

Mobile card layout:

```
┌─────────────────────────────────────────┐
│ 🐕 Galgos 6 · London · #0035   [▶ WATCH]│
│ EN VIVO · ☀️ 10°C                       │
│ (if this card is the LIVE one:)         │
│   [video 16:9]                          │
├─────────────────────────────────────────┤
│ 1   Roma                       [ 9.00 ] │
│ 4·5·4·1·5  ·  55%  ·  ★☆☆☆☆            │
├─────────────────────────────────────────┤
│ 2   Yeti                       [ 3.70 ] │
│ 5·3·5·5·1  ·  52%  ·  ★☆☆☆☆            │
└─────────────────────────────────────────┘
```

- Title row wraps if needed.
- Each runner takes 2 lines (~64 px high):
  - Line 1: number + name (left), WIN odds button (right, ≥44×44 px).
  - Line 2: last-5 perf · % rating · stars (smaller, opacity 0.6).
- Runner row separators (`border-top: 1px solid var(--border)`).
- The performance table on desktop becomes a vertical list on mobile
  via `display: grid; grid-template-columns: 1fr auto;` per row.
- WATCH button shrinks to icon-only (`▶`) ≤480 px to save horizontal
  space; keeps ≥44×44 px tap area via padding.

### 4.5 Mobile action bar (Betslip + MyBets surface)

New component: `MobileActionBar.tsx` (next to `RightPanel.tsx`).

**Render rules:**
- `RightPanel` (desktop right column): `display: none` ≤720 px.
- `MobileActionBar`: `display: none` ≥721 px.

**Mobile betslip bar (sticky bottom):**

```
┌─────────────────────────────────────────┐
│  🎫 2 selecciones                       │
│  $5.00  ·  gana $42.30        APOSTAR ↑ │
└─────────────────────────────────────────┘
```

- Position `fixed`, `bottom: 0`, full width, 64 px high.
- Hidden when slip is empty (no bar at all → cards reach the footer).
- "APOSTAR ↑" button is the primary CTA (≥44 × 44 px touch area).
  Color: gold (matches the WIN buttons).
- Tap anywhere on the bar (or APOSTAR ↑) opens the **Betslip sheet**.

**Betslip sheet (full-screen modal):**
- Slides up from bottom, takes full viewport.
- Header: "🎫 BETSLIP" + close (✕, top right).
- Body: the existing `<Betslip>` component renders unchanged. CSS
  overrides make it full-width and tap-friendly.
- The current PLACE BET button at the bottom of `Betslip` keeps its
  role.

**MyBets sheet:**
- Triggered by the `🎫(N)` button in the Navbar.
- Same full-screen sheet pattern. Header: "📋 MIS APUESTAS" + tabs
  "ACTIVAS / HISTORIAL" (the tabs already exist inside `MyBetsList`).
- Body: the existing `<MyBetsList>` renders unchanged.

Both sheets close on ✕, on swipe-down on the header, or on Esc
(keyboard fallback).

### 4.6 RecentResults — [`RecentResults.tsx`](web-lobby/src/components/RecentResults.tsx)

Mobile:
- Rendered as a standalone section after the last `RaceCard`.
- One row per result: `🐕 #0034   1º Kimo (4.90)`.
- Show 5 by default + "Ver más" button that expands the list inline.
- Section title "ÚLTIMOS RESULTADOS" in the same style as the lobby
  section header.

### 4.7 LoginScreen — [`LoginScreen.tsx`](web-lobby/src/components/LoginScreen.tsx)

- Container: full viewport, centered card on desktop → full-width form
  with 16 px horizontal padding on mobile.
- Inputs: `width: 100%`, `min-height: 48px`, `font-size: 16px` (avoids
  iOS auto-zoom on focus).
- Submit button: full-width, 48 px tall, primary color.
- Logo: scales down to ~80 px on mobile (was 160 px on desktop).

### 4.8 CountdownOverlay — [`CountdownOverlay.tsx`](web-lobby/src/components/CountdownOverlay.tsx)

- Behaviour unchanged: shows when betting closes / next race starts.
- Mobile: overlay is `position: absolute` over the card body (already
  is). CSS already uses `inset: 0` on the card — naturally sizes to
  the card's narrow mobile width. Only the inner font sizes need a
  step-down (countdown digits go from `3rem` → `2rem` on mobile).

### 4.9 Footer

```
┌─────────────────────────────────────────┐
│   [VR]  © 2026 Virtual Race             │
│   18+ · Juego responsable · Términos    │
└─────────────────────────────────────────┘
```

- Flex column on mobile, `align-items: center`, `gap: 8px`.
- Font shrinks to `0.75rem`.
- Bottom padding adds the 64 px of the sticky betslip bar so content
  isn't hidden when the slip is non-empty
  (`padding-bottom: calc(64px + 16px)` ≤720 px).

## 5. Touch targets & typography

Global mobile rules in [`global.css`](web-lobby/src/styles/global.css):

- All `button`, `a`, `input[type=button]`, `[role=button]`: `min-height: 44px; min-width: 44px;`.
- Form inputs: `font-size: 16px` (prevents iOS zoom-on-focus).
- Body font: stays at 16 px base — line-height ≥1.4.
- Headings step down one notch (`h1: 1.25rem`, `h2: 1.1rem`, `h3: 1rem`).

## 6. State / wiring changes

The reflow is **predominantly CSS**. Only two component changes:

1. `Navbar.tsx` — add the Jackpot chip + ☰ hamburger menu markup.
   The menu is a controlled `useState` flip, opens a panel under the
   navbar.
2. `App.tsx` — render `<MobileActionBar />` alongside `<RightPanel />`.
   CSS toggles which is visible. `MobileActionBar` reads from the same
   `useBetslip()` + `useMyBets()` hooks the `RightPanel` already uses,
   so no state model changes.

`RaceCard.tsx` gets a single prop addition: `liveVideoPortalTarget` (or
a context-based "I should host the video" flag) so the first live card
can mount the existing `LiveMonitor` `<video>` element inside it on
mobile.

No changes to `services/`, `state/`, `useRaceFeed`, or anything outside
the components and `global.css`.

## 7. Acceptance criteria

Tested in Chrome DevTools mobile emulation at 360 × 640, 375 × 812,
414 × 896:

- [ ] No horizontal scroll on any screen.
- [ ] All clickable elements ≥44 × 44 px touch area.
- [ ] Wallet balance visible without scroll on every screen.
- [ ] Jackpot value visible on every screen (chip in navbar).
- [ ] Betslip sticky bar shows resumen + APOSTAR when slip non-empty;
      disappears when empty.
- [ ] Tap on Betslip bar opens the full sheet; ✕ closes it.
- [ ] Tap on 🎫(N) Navbar button opens MIS APUESTAS sheet; same close
      behaviour.
- [ ] ☰ menu opens/closes; Lang/Currency/Logout reachable from it.
- [ ] First EN VIVO race card has the live video embedded; other cards
      do not.
- [ ] CountdownOverlay renders correctly at card width during the
      "betting closed" window.
- [ ] LoginScreen has no iOS auto-zoom on input focus (`font-size: 16px`).
- [ ] RecentResults visible at bottom of the stack with "Ver más"
      working.
- [ ] Desktop view at ≥721 px is **byte-identical** to current master
      (no regressions). Visual spot-check at 1280, 1024, 800, 721 px.

## 8. Out of scope (defer to a possible Phase 2 — Mobile-first IA)

- Bottom navigation bar (Carreras / En vivo / Mis apuestas / Cuenta).
- Carousel / tabbed race switching.
- Swipe gestures.
- Per-race full-screen detail page.
- iPad / large-tablet layout (721–1023 px gets desktop view today; can
  add a `@media (max-width: 1023px) and (min-width: 721px)` band later
  if needed).

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Video portaling into RaceCard breaks autoplay / size on layout reflow | Medium | Keep the `<video>` element mounted in one place; use CSS `position: absolute` inside the card with explicit `aspect-ratio: 16/9`. Test on real iOS Safari (autoplay gates). |
| Sticky bottom bar covers footer links when slip is non-empty | Low | Already mitigated by `padding-bottom: calc(64px + 16px)` on `.lobby-main`. |
| 44 × 44 px touch targets break existing dense layouts on desktop | Low | The 44 × 44 rule is scoped inside the `@media (max-width: 720px)` block — desktop unchanged. |
| `useBetslip` re-renders cascading through both `RightPanel` and `MobileActionBar` | Low | Both are siblings; only one is visible. React still re-renders both. Acceptable for this scale (3 race cards + 1 slip). |
| iOS Safari `100vh` includes browser chrome → sheets overflow | Medium | Use `100dvh` (dynamic viewport) for the sheet height; fallback to `100vh` only. |

## 10. Implementation checklist (high-level — refined in writing-plans)

1. Add the `@media (max-width: 720px)` block scaffold in `global.css`.
2. `Navbar`: add Jackpot chip + ☰ menu markup + state.
3. `App.tsx` / `lobby-shell` reflow CSS.
4. `RaceCard`: 2-line runner layout + live video portal target.
5. `MobileActionBar.tsx`: new component (sticky bar + sheet shell).
6. `MobileActionBar` Betslip sheet wires existing `<Betslip>`.
7. `MobileActionBar` MyBets sheet wires existing `<MyBetsList>`.
8. `RecentResults`: standalone mobile section after cards.
9. `LoginScreen`: input/button mobile rules.
10. `CountdownOverlay`: font step-down.
11. Footer: vertical stack + padding for sticky bar.
12. Touch-target + iOS-zoom global rules.
13. Verification pass: Chrome DevTools 360/375/414 emulation + desktop
    spot-check at 1280/1024/800/721 px.
