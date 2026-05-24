/**
 * Money helpers — bridge between the backend's string wire format and the
 * client's plain `number` (we don't need integer-exactness for display
 * because amounts are bounded to 18 digits with 2 decimals — well within
 * f64 safe range, and we never multiply/divide in the client).
 *
 * Wire shape: `"1000.00"` (string, always 2 decimals). See MANUAL_WEB_PLAYER §9.
 */

/** Parse the backend's money string (`"1000.00"`) to a plain number.
 *  Returns 0 for missing / malformed input. */
export function parseMoney(s: string | number | null | undefined): number {
  if (s === null || s === undefined) return 0;
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Serialize a client-side number to the wire format `"1000.00"`. */
export function formatMoneyWire(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** Backend WalletDTO wire shape (every money field is a string). */
export interface WalletDTO {
  currency: string;
  balance: string;
  bonusBalance: string;
  locked: string;
  available: string;
}

/** Parsed wallet snapshot — money fields as plain numbers. */
export interface Wallet {
  currency: string;
  balance: number;
  bonusBalance: number;
  locked: number;
  available: number;
}

export function parseWallet(dto: WalletDTO): Wallet {
  return {
    currency: dto.currency,
    balance: parseMoney(dto.balance),
    bonusBalance: parseMoney(dto.bonusBalance),
    locked: parseMoney(dto.locked),
    available: parseMoney(dto.available),
  };
}
