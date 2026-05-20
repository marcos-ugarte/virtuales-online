/**
 * Betslip — global state for the user's pending selections.
 *
 * Stake model: each tip has its OWN stake. The "selected" tip is the one
 * whose stake the footer −/+ / input edits. If the user hasn't explicitly
 * selected anything, the operations target the most recently added tip
 * (= last element of `selections`). Adding a new tip auto-selects it;
 * removing the selected tip falls back to the now-last tip.
 *
 * Scope: WIN only in this iteration. Forecast (Tricast) will extend the
 * `type` union when implemented.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GameKey } from '../types/websocket';
import { getStakeLimits, type StakeLimits } from '../services/stakeLimits';
import { useWallet } from './wallet';

export type BetType = 'win';

export interface BetSelection {
  /** Stable id derived from raceId + type + runnerPos so toggling is idempotent. */
  id: string;
  raceId: string;
  raceLabel: string;
  gameType: GameKey;
  runnerPos: number;
  runnerName: string;
  type: BetType;
  odds: number;
  /** Per-tip stake. Default on add: DEFAULT_STAKE. */
  stake: number;
}

interface BetslipCtx {
  selections: BetSelection[];
  toggleWin: (sel: Omit<BetSelection, 'id' | 'type' | 'stake'>) => void;
  removeSelection: (id: string) => void;
  clearAll: () => void;
  pruneToActiveRaces: (activeRaceIds: readonly string[]) => void;

  /** Currently-selected tip id (explicit user pick). May be null. */
  selectedId: string | null;
  selectTip: (id: string) => void;
  /** Returns the id the footer controls operate on:
   *  selectedId if set + still present, else the last tip's id, else null. */
  effectiveSelectionId: string | null;

  /** Stake of the effective selection (or `limits.default` if slip is empty). */
  effectiveStake: number;
  /** Set the effective tip's stake. No-op if slip is empty. */
  setEffectiveStake: (value: number) => void;
  /** Bump the effective tip's stake by ±delta. */
  bumpEffectiveStake: (delta: number) => void;

  /** Per-currency limits (min/max/default/step) — driven by wallet currency. */
  limits: StakeLimits;
}

const Ctx = createContext<BetslipCtx | null>(null);

function makeId(raceId: string, type: BetType, runnerPos: number): string {
  return `${raceId}:${type}:${runnerPos}`;
}

function clampStake(value: number, limits: StakeLimits): number {
  if (!Number.isFinite(value)) return limits.min;
  if (value < limits.min) return limits.min;
  if (value > limits.max) return limits.max;
  return Math.round(value * 100) / 100;
}

export function BetslipProvider({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const limits = useMemo(
    () => getStakeLimits(wallet?.currency),
    [wallet?.currency],
  );
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Compute the id the footer operates on — explicit pick first, else last.
  const effectiveSelectionId = useMemo<string | null>(() => {
    if (selections.length === 0) return null;
    if (selectedId && selections.some((s) => s.id === selectedId)) {
      return selectedId;
    }
    return selections[selections.length - 1].id;
  }, [selectedId, selections]);

  const effectiveStake = useMemo<number>(() => {
    if (!effectiveSelectionId) return limits.default;
    const t = selections.find((s) => s.id === effectiveSelectionId);
    return t ? t.stake : limits.default;
  }, [effectiveSelectionId, selections, limits.default]);

  const toggleWin = useCallback(
    (sel: Omit<BetSelection, 'id' | 'type' | 'stake'>) => {
      const id = makeId(sel.raceId, 'win', sel.runnerPos);
      setSelections((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (existing) return prev.filter((s) => s.id !== id);
        return [...prev, { ...sel, id, type: 'win', stake: limits.default }];
      });
      // Always auto-select the just-added (or just-removed-and-readded-next) tip.
      setSelectedId(id);
    },
    [limits.default],
  );

  const removeSelection = useCallback(
    (id: string) => {
      setSelections((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (id === selectedId) {
          // Fall back to the now-last tip (or null if empty).
          setSelectedId(next.length > 0 ? next[next.length - 1].id : null);
        }
        return next;
      });
    },
    [selectedId],
  );

  const clearAll = useCallback(() => {
    setSelections([]);
    setSelectedId(null);
  }, []);

  const pruneToActiveRaces = useCallback(
    (activeRaceIds: readonly string[]) => {
      const active = new Set(activeRaceIds);
      setSelections((prev) => {
        const next = prev.filter((s) => active.has(s.raceId));
        if (selectedId && !next.some((s) => s.id === selectedId)) {
          setSelectedId(next.length > 0 ? next[next.length - 1].id : null);
        }
        return next.length === prev.length ? prev : next;
      });
    },
    [selectedId],
  );

  const selectTip = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const setEffectiveStake = useCallback(
    (value: number) => {
      if (!effectiveSelectionId) return;
      const next = clampStake(value, limits);
      setSelections((prev) =>
        prev.map((s) =>
          s.id === effectiveSelectionId ? { ...s, stake: next } : s,
        ),
      );
    },
    [effectiveSelectionId, limits],
  );

  const bumpEffectiveStake = useCallback(
    (delta: number) => {
      if (!effectiveSelectionId) return;
      setSelections((prev) =>
        prev.map((s) =>
          s.id === effectiveSelectionId
            ? { ...s, stake: clampStake(s.stake + delta, limits) }
            : s,
        ),
      );
    },
    [effectiveSelectionId, limits],
  );

  const value = useMemo<BetslipCtx>(
    () => ({
      selections,
      toggleWin,
      removeSelection,
      clearAll,
      pruneToActiveRaces,
      selectedId,
      selectTip,
      effectiveSelectionId,
      effectiveStake,
      setEffectiveStake,
      bumpEffectiveStake,
      limits,
    }),
    [
      selections,
      toggleWin,
      removeSelection,
      clearAll,
      pruneToActiveRaces,
      selectedId,
      selectTip,
      effectiveSelectionId,
      effectiveStake,
      setEffectiveStake,
      bumpEffectiveStake,
      limits,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBetslip(): BetslipCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBetslip must be used inside <BetslipProvider>');
  return c;
}

/** True when the given runner is currently in the slip (for visual toggle). */
export function useIsSelected(
  raceId: string,
  runnerPos: number,
  type: BetType = 'win',
): boolean {
  const { selections } = useBetslip();
  return selections.some(
    (s) => s.raceId === raceId && s.type === type && s.runnerPos === runnerPos,
  );
}
