/**
 * CountdownOverlay — displayed over the hero photo strip.
 * Shows the race's scheduled time + a "STARTS IN MM:SS" badge
 * (or a pulsing "LIVE NOW" badge when the race is running).
 */

type Props = {
  remainingSec: number;
  phase: 'pre' | 'live' | 'idle';
  /** UTC "YYYY-MM-DD HH:MM:SS" — the race's videoStartDt. */
  scheduledAt?: string;
};

function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Renders the race's scheduled time in the viewer's local timezone
 * (HH:MM 24h). Returns empty string if scheduledAt is missing or
 * unparseable so the overlay degrades gracefully.
 */
function fmtScheduled(scheduledAt: string | undefined): string {
  if (!scheduledAt) return '';
  const ms = Date.parse(scheduledAt.replace(' ', 'T') + 'Z');
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function CountdownOverlay({ remainingSec, phase, scheduledAt }: Props) {
  if (phase === 'idle') return null;

  const scheduled = fmtScheduled(scheduledAt);

  if (phase === 'live') {
    return (
      <div className="card-countdown-overlay countdown-live">
        <span className="countdown-live">
          <span className="countdown-live-inner">LIVE NOW</span>
        </span>
        {scheduled && (
          <span className="countdown-scheduled" aria-label="Race time">
            {scheduled}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="card-countdown-overlay">
      <span className="countdown-text">STARTS IN {fmtCountdown(remainingSec)}</span>
      {scheduled && (
        <span className="countdown-scheduled" aria-label="Race time">
          at {scheduled}
        </span>
      )}
    </div>
  );
}
