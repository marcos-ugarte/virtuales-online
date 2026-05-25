/**
 * Odds layout helpers for the flat `race.odds` array.
 *
 * Layout (authoritative — virtuales-go `internal/raceapi/parser.go` +
 * `web_ds_betoffers.go`): the array is WIN then EXACTA/forecast:
 *
 *   [ WIN_1, WIN_2, …, WIN_N,                 // index = dorsal-1
 *     EXACTA(1,2), EXACTA(1,3), … EXACTA(1,N),
 *     EXACTA(2,1), EXACTA(2,3), … EXACTA(2,N),
 *     …                                       // row-major by 1st place,
 *     EXACTA(N,1), … EXACTA(N,N-1) ]          // 2nd ascending, diagonal skipped
 *
 * Total length = N² (N WIN + N²−N ordered exacta pairs). Verified against the
 * live dog6 feed (N=6, length 36).
 */

/** WIN odd for a 1-based dorsal. */
export function winOdd(odds: number[] | undefined, pos: number): number {
  return odds?.[pos - 1] ?? 0;
}

/**
 * Forecast/EXACTA odd for the ordered pair (first → second), 1-based dorsals.
 * `n` is the number of runners. Returns 0 for the diagonal (first === second)
 * or when data is missing.
 */
export function forecastOdd(
  odds: number[] | undefined,
  first: number,
  second: number,
  n: number,
): number {
  if (!odds || first === second) return 0;
  const withinRow = second < first ? second - 1 : second - 2;
  const idx = n + (first - 1) * (n - 1) + withinRow;
  return odds[idx] ?? 0;
}
