/**
 * StakePopover — tap a runner's WIN odd and pick HOW MUCH to bet before it
 * goes on the slip (instead of always using the default stake). Shows quick
 * amount chips (currency-aware) + a free input, anchored next to the runner.
 *
 * Rendered in a portal with fixed positioning so the card's `overflow:hidden`
 * never clips it. Positioned below the tapped odd cell, flipped above when
 * there isn't room, and clamped to the viewport.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBetslip } from '../state/betslip';
import { useLang } from '../i18n';

const POPOVER_W = 236;

export interface StakePopoverProps {
  anchorRect: DOMRect;
  runnerName: string;
  odds: number;
  /** Starting amount (existing stake if already in slip, else default). */
  initialStake: number;
  /** True when the runner is already in the slip (button says "Update"). */
  alreadyInSlip: boolean;
  onConfirm: (stake: number) => void;
  onClose: () => void;
}

export function StakePopover({
  anchorRect,
  runnerName,
  odds,
  initialStake,
  alreadyInSlip,
  onConfirm,
  onClose,
}: StakePopoverProps) {
  const { t, formatMoney } = useLang();
  const { limits } = useBetslip();
  const ref = useRef<HTMLDivElement | null>(null);

  const [amount, setAmount] = useState<number>(initialStake);
  const [customText, setCustomText] = useState<string>('');

  const presets = limits.presets.filter((p) => p >= limits.min && p <= limits.max);
  const valid = Number.isFinite(amount) && amount >= limits.min && amount <= limits.max;

  // Position: below the odd cell, flipped above if needed, clamped to viewport.
  const [pos, setPos] = useState<{ top: number; left: number }>(() => ({
    top: anchorRect.bottom + 6,
    left: anchorRect.right - POPOVER_W,
  }));
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchorRect.right - POPOVER_W;
    left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));
    let top = anchorRect.bottom + 6;
    if (top + h > vh - 8) top = anchorRect.top - h - 6; // flip above
    top = Math.max(8, top);
    setPos({ top, left });
  }, [anchorRect]);

  // Close on outside tap / Escape, and on page scroll or orientation change
  // (the anchor would go stale). IMPORTANT: do NOT close when the interaction
  // comes from the mobile virtual keyboard — focusing the "other amount" input
  // fires scroll + resize(height) events, which previously closed the popover
  // before the user could type. So: skip the close while focus is inside the
  // popover, and on resize only close when the WIDTH changes (real rotation),
  // not the height (keyboard show/hide).
  useEffect(() => {
    const focusedInside = () =>
      !!ref.current && ref.current.contains(document.activeElement);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onTouch = (e: TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => {
      if (!focusedInside()) onClose();
    };
    const startW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== startW) onClose(); // rotation, not keyboard
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onTouch);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onTouch);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [onClose]);

  const pickPreset = (v: number) => {
    setAmount(v);
    setCustomText('');
  };
  const onCustom = (text: string) => {
    setCustomText(text);
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) setAmount(n);
  };
  const confirm = () => {
    if (valid) onConfirm(amount);
  };

  return createPortal(
    <div
      ref={ref}
      className="sp-popover"
      style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
      role="dialog"
      aria-label={t('stakePicker.title')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sp-head">
        <span className="sp-runner">{runnerName}</span>
        <span className="sp-odds">{odds.toFixed(2)}</span>
      </div>

      <div className="sp-title">{t('stakePicker.title')}</div>

      <div className="sp-chips">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`sp-chip${amount === p && !customText ? ' sp-chip--active' : ''}`}
            onClick={() => pickPreset(p)}
          >
            {formatMoney(p, 0)}
          </button>
        ))}
      </div>

      <label className="sp-custom">
        <span className="sp-custom-label">{t('stakePicker.other')}</span>
        <input
          type="text"
          inputMode="decimal"
          className="sp-input"
          placeholder="0.00"
          value={customText}
          onChange={(e) => onCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
          aria-label={t('stakePicker.other')}
        />
      </label>

      <button
        type="button"
        className="sp-add"
        onClick={confirm}
        disabled={!valid}
      >
        {alreadyInSlip ? t('stakePicker.update') : t('stakePicker.add')} ·{' '}
        {formatMoney(valid ? amount : limits.min)}
      </button>
    </div>,
    document.body,
  );
}
