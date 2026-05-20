/**
 * LangToggle — tiny EN/ES button with an SVG flag icon. Click toggles the
 * stored language; the surrounding UI re-renders via the i18n context.
 */

import { useLang, type Lang } from '../i18n';

/** Simplified US flag (no 50 stars — just a blue canton with a single
 *  star marker, 13 red/white stripes). Renders consistently across OSes. */
function FlagUS() {
  return (
    <svg
      className="flag-svg"
      viewBox="0 0 19 10"
      role="img"
      aria-label="US flag"
      preserveAspectRatio="none"
    >
      <rect width="19" height="10" fill="#fff" />
      {[0, 2, 4, 6, 8].map((y) => (
        <rect key={y} y={y} width="19" height="1" fill="#b31942" />
      ))}
      <rect width="8" height="5" fill="#0a3161" />
      <g fill="#fff">
        {[
          [1, 0.7], [3, 0.7], [5, 0.7], [7, 0.7],
          [2, 1.7], [4, 1.7], [6, 1.7],
          [1, 2.7], [3, 2.7], [5, 2.7], [7, 2.7],
          [2, 3.7], [4, 3.7], [6, 3.7],
          [1, 4.3], [3, 4.3], [5, 4.3], [7, 4.3],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="0.22" />
        ))}
      </g>
    </svg>
  );
}

/** Dominican Republic flag — quartered blue/red with a white cross.
 *  Simplified: the central coat of arms is omitted (illegible at icon size). */
function FlagDO() {
  return (
    <svg
      className="flag-svg"
      viewBox="0 0 15 10"
      role="img"
      aria-label="Bandera de República Dominicana"
      preserveAspectRatio="none"
    >
      {/* Quadrants: TL blue, TR red, BL red, BR blue. */}
      <rect x="0" y="0" width="7.5" height="5" fill="#002d62" />
      <rect x="7.5" y="0" width="7.5" height="5" fill="#ce1126" />
      <rect x="0" y="5" width="7.5" height="5" fill="#ce1126" />
      <rect x="7.5" y="5" width="7.5" height="5" fill="#002d62" />
      {/* White cross: vertical + horizontal bands, ~0.9 units wide. */}
      <rect x="7.05" y="0" width="0.9" height="10" fill="#fff" />
      <rect x="0" y="4.55" width="15" height="0.9" fill="#fff" />
    </svg>
  );
}

function Flag({ active }: { active: Lang }) {
  return active === 'en' ? <FlagUS /> : <FlagDO />;
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  const next: Lang = lang === 'en' ? 'es' : 'en';
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLang(next)}
      aria-label={lang === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
      title={lang === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
    >
      <Flag active={lang} />
      <span className="lang-toggle-code">{lang.toUpperCase()}</span>
    </button>
  );
}
