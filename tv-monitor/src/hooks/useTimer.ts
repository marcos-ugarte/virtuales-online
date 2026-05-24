/**
 * useTimer — derives a live countdown from a UTC videoStartDt string.
 * Adapted from virteon-platform/apps/pos-go/src/hooks/useTimer.ts
 * (simplified: no roundInterval tracking, no per-second sync).
 */

import { useState, useEffect } from 'react';

export function useTimer(
  videoStartDt: string | undefined,
  clockOffsetMs = 0
): { remainingSec: number; phase: 'pre' | 'live' | 'idle' } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!videoStartDt) {
    return { remainingSec: 0, phase: 'idle' };
  }

  // 'YYYY-MM-DD HH:mm:ss' → treat as UTC
  const startMs = Date.parse(videoStartDt.replace(' ', 'T') + 'Z');
  const remainingMs = startMs - (now + clockOffsetMs);
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
  const phase: 'pre' | 'live' = remainingSec > 0 ? 'pre' : 'live';

  return { remainingSec, phase };
}
