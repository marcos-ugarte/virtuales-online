/**
 * Stake limits per currency × market_type.
 *
 * These mirror the backend's `web.stake_limits` table — confirmed against
 * the live env on 2026-05-19:
 *
 *   USD / win:  min 1.00,  max ~1000.00
 *   DOP / win:  min 25.00, max not yet confirmed (probed up to 100.00 OK)
 *
 * When the backend grows multi-market support or exposes the limits via an
 * endpoint, we'll source these from the API at boot. For now the static
 * table is enough — there's only one market type (`win`) and two
 * currencies (USD / DOP).
 *
 * `step` is the UI's +/- increment for the stake-master controls. Smaller
 * for USD (people bet in $1 increments), larger for DOP because RD$25 is
 * the floor so RD$1 steps would feel silly.
 */

export interface StakeLimits {
  min: number;
  max: number;
  default: number;
  step: number;
  /** Quick-amount presets shown in the tap-to-pick-amount popover. */
  presets: number[];
}

const USD_DEFAULTS: StakeLimits = {
  min: 1, max: 1000, default: 1, step: 1,
  presets: [1, 5, 10, 25, 50, 100],
};
const DOP_DEFAULTS: StakeLimits = {
  min: 25, max: 25000, default: 25, step: 25,
  presets: [25, 50, 100, 200, 500, 1000],
};

export function getStakeLimits(currency: string | undefined): StakeLimits {
  switch (currency) {
    case 'DOP':
      return DOP_DEFAULTS;
    case 'USD':
    default:
      return USD_DEFAULTS;
  }
}
