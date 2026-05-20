/**
 * CurrencyToggle — switches the displayed wallet/jackpot currency between
 * USD ($) and Dominican peso (RD$). Mirrors LangToggle's style.
 */

import { useLang, type Currency } from '../i18n';

export function CurrencyToggle() {
  const { currency, setCurrency } = useLang();
  const next: Currency = currency === 'USD' ? 'DOP' : 'USD';
  const label =
    currency === 'USD'
      ? 'Switch to Dominican peso'
      : 'Cambiar a dólar estadounidense';
  return (
    <button
      type="button"
      className="currency-toggle"
      onClick={() => setCurrency(next)}
      aria-label={label}
      title={label}
    >
      <span className="currency-toggle-symbol">
        {currency === 'USD' ? '$' : 'RD$'}
      </span>
    </button>
  );
}
