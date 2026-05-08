# Bet Types — Reference for future work

> Captured from https://www.greyhoundracing.com/bet-types.html on 2026-05-08.
> The user flagged this page as authoritative for the bet markets we'll
> implement once the web-lobby moves beyond the spectator phase.

Different jurisdictions use slightly different naming. We'll align on the column
labelled "Canonical name" below when we wire the betslip.

## Single-race bets

### Simple / straight bets

| Canonical name | Aliases | Description | Min runners |
|---|---|---|---|
| **Win** | Straight Bet, Single | First dog past the post. | 2 |
| **Place** | — | Selection finishes 1st OR 2nd. | 5 (typical UK) |
| **Show** | — | Selection finishes 1st, 2nd OR 3rd. | 6 |

### Combination

| Canonical name | Aliases | Description | Notes |
|---|---|---|---|
| **Across the Board** | Win/Place/Show | Three simultaneous bets on one dog: Win + Place + Show. | Cost = 3× unit stake. |

### Two-dog exactas

| Canonical name | Aliases | Description |
|---|---|---|
| **Quinella** | Reverse Forecast | First 2 in **any order**. |
| **Perfecta / Exacta** | Straight Forecast | First 2 in **exact order**. |

### Three-dog and four-dog

| Canonical name | Aliases | Description |
|---|---|---|
| **Trifecta** | Tricast, Treble Forecast | First 3 in exact order. |
| **Superfecta** | — | First 4 in exact order. |

## Multi-race bets

| Canonical name | Description |
|---|---|
| **Daily Double** | Winners of races 1 and 2; placed before race 1 starts. |
| **Pick 3** | Winners of 3 consecutive races. |
| **Pick 6** | Winners of 6 consecutive races. |
| **Parlay / Accumulator** | "Let-it-ride" — all selections across multiple races must win for any payout. |
| **Twin Trifecta** | Trifecta in two consecutive races with a pool-based payout. |
| **Tri-Super** | Trifecta in race N + Superfecta in race N+1. |
| **Titanic Tri-Super** | Trifecta in race 5 + Superfecta in race 7 (track-specific). |
| **Jackpot** | Pick 6 consecutive winners; rules vary by track. |

## Mapping to our current codebase

The virteon-platform protocol (`packages/shared-types/src/betting.ts`) currently
exposes only:

```ts
export enum BetType {
  WIN = 'win',
  FORECAST = 'forecast',  // = Perfecta / Exacta / Straight Forecast
}
```

The virteon POS UI (`apps/pos-go/`) also has a TRIFECTA mode (only enabled for
the DOT game type — Dog 6×3). So as of now the live system supports a small
subset:

| Bet type | Implemented? |
|---|---|
| Win | ✅ in `BetType.WIN` |
| Forecast / Exacta | ✅ in `BetType.FORECAST` |
| Trifecta | ✅ UI for DOT only (`BetMode = 'trifecta'`) |
| Quinella, Place, Show, Superfecta, multi-race | ❌ not in the protocol |

When we extend to cover more markets:

1. Add new variants to the `BetType` enum.
2. Extend `OddsSet` (currently `{ winOdds, forecastOdds }`) with arrays for
   each new market. The shape of each array will need a documented index
   formula — e.g. for Quinella with N runners, `quinellaOdds[]` has
   `N*(N-1)/2` entries indexed by `(min(a,b)*N) + max(a,b)`-ish.
3. Update the relay's fixture-replay logic so the mock generates plausible
   odds for the new markets (or extracts them from the captured data once we
   have a real source).
4. Build the betslip UI: per-market selector + N-runner picker.

## Visual conventions (from the Virtustec demo we mirrored)

The original SPA's race-detail page groups markets into stacked panels:

1. Win / Place / Show
2. Even / Odd
3. Over / Under
4. Esatta / Schiavin (Italian for Exacta / Quinella)
5. Trifecta

We'll likely follow the same grouping but using the canonical English names from
this document.

## TODO when we implement

- [ ] Decide which subset to expose in v2 (probably Win + Place + Show + Forecast + Trifecta).
- [ ] Confirm with the gambling-jurisdiction team what's permitted in the target markets.
- [ ] Verify minimum-runner thresholds — `Place` with 4 runners or fewer is usually paid as Win.
- [ ] Add `quinellaOdds` and `trifectaOdds` to `OddsSet` if not already.
- [ ] Add multi-race bets at the lobby level (cross-race selection UI).

---

**Reference:** https://www.greyhoundracing.com/bet-types.html
