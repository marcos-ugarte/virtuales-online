/**
 * JackpotDisplay — odometer-rolled jackpot counter using HubSpot's
 * `odometer` library (battle-tested rolling-digit positioning).
 *
 * Behaviour:
 *   - First positive `target` initialises the odometer at that value (no
 *     noisy roll from 0 → $28k on page load).
 *   - Higher targets call `od.update()` so only the digits that change roll
 *     upward; unchanged digits stay perfectly aligned.
 *   - A slow ticker advances 1 cent every CRAWL_INTERVAL_MS so the panel
 *     feels alive without spinning multiple digits at once.
 *   - Currency symbol intentionally omitted — only the number rolls.
 *
 * Structure: an outer wrapper carries our styling. The inner span is
 * handed off to odometer — odometer overwrites its className and innerHTML,
 * so React must never re-render that node after mount (we render it once,
 * with empty children, and let odometer own it).
 */

import { useEffect, useRef, useState } from 'react';
import Odometer from 'odometer';
import 'odometer/themes/odometer-theme-default.css';

interface Props {
  target: number;
}

const CRAWL_INTERVAL_MS = 8000;
const CRAWL_INCREMENT = 0.01;
const ROLL_DURATION_MS = 2500;

export function JackpotDisplay({ target }: Props) {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const odRef = useRef<Odometer | null>(null);
  const valueRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (odRef.current) return;
    if (!elRef.current) return;
    if (!Number.isFinite(target) || target <= 0) return;
    odRef.current = new Odometer({
      el: elRef.current,
      value: target,
      format: '(,ddd).dd',
      theme: 'default',
      duration: ROLL_DURATION_MS,
    });
    valueRef.current = target;
    setReady(true);
  }, [target]);

  useEffect(() => {
    if (!odRef.current) return;
    if (!Number.isFinite(target) || target <= 0) return;
    if (target <= valueRef.current) return;
    valueRef.current = target;
    odRef.current.update(target);
  }, [target]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      if (!odRef.current || valueRef.current <= 0) return;
      valueRef.current = +(valueRef.current + CRAWL_INCREMENT).toFixed(2);
      odRef.current.update(valueRef.current);
    }, CRAWL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [ready]);

  // Two siblings with stable keys so React matches by key (not position) on
  // re-render — the odometer span keeps its identity and React never sets
  // its innerHTML. Critical because odometer overrides the element's
  // innerHTML/textContent setters: any React write would update the
  // odometer value to NaN/0.
  return (
    <span className="lm-jackpot-amount">
      {!ready && (
        <span key="loading" className="lm-jackpot-amount--loading">
          —
        </span>
      )}
      <span
        key="odometer"
        ref={elRef}
        style={ready ? undefined : { visibility: 'hidden', position: 'absolute' }}
      />
    </span>
  );
}
