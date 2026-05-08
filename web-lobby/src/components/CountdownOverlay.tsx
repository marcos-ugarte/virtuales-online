/**
 * CountdownOverlay — displayed over the hero photo strip.
 * Shows a "STARTS IN MM:SS" badge or a pulsing "LIVE NOW" badge.
 */

type Props = {
  remainingSec: number;
  phase: 'pre' | 'live' | 'idle';
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CountdownOverlay({ remainingSec, phase }: Props) {
  if (phase === 'idle') return null;

  if (phase === 'live') {
    return (
      <div className="card-countdown-overlay countdown-live">
        <span className="countdown-live">
          <span className="countdown-live-inner">LIVE NOW</span>
        </span>
      </div>
    );
  }

  return (
    <div className="card-countdown-overlay">
      <span className="countdown-text">STARTS IN {fmt(remainingSec)}</span>
    </div>
  );
}
