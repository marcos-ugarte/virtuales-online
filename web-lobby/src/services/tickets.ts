/**
 * Tickets service — placeTicket / listTickets / getTicket against
 * /v1/web/tickets.
 *
 * Wire shape observed against the live backend on 2026-05-18 differs from
 * MANUAL_WEB_PLAYER.md §3.5/§3.6 in a few ways that this file normalises:
 *
 *   list response          wire field         our normalised field
 *   ──────────────         ──────────         ─────────────────────
 *   ticket id              id                 ticketId
 *   payout                 actualPayout       payout
 *   placement timestamp    placedAt           placedAt (kept)
 *   selections in list     null               null  (use getTicket for detail)
 *   per-selection raceId   raceId             raceId  (on selection, NOT ticket)
 *   per-selection market   marketType         betType
 *   per-selection odds     number             number (kept)
 *   per-selection stake    string ("10.00")   number
 *
 * The ticket itself does NOT carry a race object — raceId lives on each
 * selection. The lobby uses the WS race feed to enrich raceId → eventType +
 * videoStartDt for display when available.
 */

import { apiClient } from './apiClient';
import {
  formatMoneyWire,
  parseMoney,
  parseWallet,
  type Wallet,
  type WalletDTO,
} from './money';
import type { BetType } from '../state/betslip';

// ---------------------------------------------------------------------------
// Wire DTOs (camelCase, money-as-string).
// ---------------------------------------------------------------------------

interface PlaceTicketRequestDTO {
  raceId: string;
  currency: string;
  selections: Array<{
    betType: BetType;
    selection: Record<string, number>;
    odds: number;
    stake: string;
  }>;
}

interface PlaceTicketResponseDTO {
  ticketId: string;
  status: 'accepted' | 'rejected';
  rejectReason?: string;
  totalStake: string;
  potentialPayout: string;
  wallet: WalletDTO;
}

interface TicketSelectionDTO {
  id?: number;
  raceId: string;
  marketType: BetType;
  selection: Record<string, number>;
  /** Backend returns number in detail; we tolerate string too. */
  odds: number | string;
  stake: string;
  result: 'pending' | 'won' | 'lost' | 'void';
  settledAt: string | null;
}

export type TicketStatus =
  | 'open'
  | 'won'
  | 'lost'
  | 'void'
  | 'partially_settled';

interface TicketDTO {
  id: string;
  status: TicketStatus;
  currency: string;
  totalStake: string;
  potentialPayout: string;
  actualPayout: string;
  placedAt: string;
  settledAt: string | null;
  /** Null in list responses; populated in detail (`GET /tickets/{id}`). */
  selections: TicketSelectionDTO[] | null;
}

interface TicketsListDTO {
  /** Backend returns null instead of [] when empty — handle both. */
  items: TicketDTO[] | null;
  nextCursor: string | null | '';
}

// ---------------------------------------------------------------------------
// Public types (numbers, not strings).
// ---------------------------------------------------------------------------

export interface BetSlipLine {
  betType: BetType;
  /** win: the runner. forecast: the 1st-place runner. */
  runnerPos: number;
  /** forecast: the 2nd-place runner. */
  second?: number;
  odds: number;
  stake: number;
}

export interface PlacementResult {
  status: 'accepted' | 'rejected';
  ticketId?: string;
  rejectReason?: TicketRejectReason;
  totalStake: number;
  potentialPayout: number;
  wallet: Wallet;
}

export type TicketRejectReason =
  | 'betting_closed'
  | 'odds_changed'
  | 'race_not_found'
  | 'selection_runner_not_in_race'
  | 'selection_duplicate_runners'
  | 'selection_malformed'
  | 'insufficient_funds'
  | 'stake_below_min'
  | 'stake_above_max'
  | 'kyc_required'
  | 'self_excluded'
  | 'account_suspended'
  | 'account_closed'
  | 'unknown';

export interface TicketSelection {
  raceId: string;
  betType: BetType;
  selection: Record<string, number>;
  odds: number;
  stake: number;
  result: 'pending' | 'won' | 'lost' | 'void';
  settledAt: string | null;
}

export interface Ticket {
  ticketId: string;
  status: TicketStatus;
  currency: string;
  totalStake: number;
  potentialPayout: number;
  payout: number;
  placedAt: string;
  settledAt: string | null;
  /** Null when the list response didn't include details; fetch by id. */
  selections: TicketSelection[] | null;
  /** Derived: the raceId of the first selection (single-race tickets only). */
  primaryRaceId: string | null;
}

export interface TicketsPage {
  items: Ticket[];
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const r = crypto.getRandomValues(new Uint8Array(16));
  r[6] = (r[6] & 0x0f) | 0x40;
  r[8] = (r[8] & 0x3f) | 0x80;
  const hex = Array.from(r, (b) => b.toString(16).padStart(2, '0')).join('');
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    hex.slice(12, 16) + '-' +
    hex.slice(16, 20) + '-' +
    hex.slice(20)
  );
}

const KNOWN_REJECT_CODES = new Set<string>([
  'betting_closed',
  'odds_changed',
  'race_not_found',
  'selection_runner_not_in_race',
  'selection_duplicate_runners',
  'selection_malformed',
  'insufficient_funds',
  'stake_below_min',
  'stake_above_max',
  'kyc_required',
  'self_excluded',
  'account_suspended',
  'account_closed',
]);

function normaliseRejectReason(raw: string | undefined): TicketRejectReason {
  if (raw && KNOWN_REJECT_CODES.has(raw)) {
    return raw as TicketRejectReason;
  }
  return 'unknown';
}

function parseOdds(o: number | string): number {
  if (typeof o === 'number') return Number.isFinite(o) ? o : 0;
  return parseMoney(o);
}

function parseSelection(dto: TicketSelectionDTO): TicketSelection {
  return {
    raceId: dto.raceId,
    betType: dto.marketType,
    selection: dto.selection,
    odds: parseOdds(dto.odds),
    stake: parseMoney(dto.stake),
    result: dto.result,
    settledAt: dto.settledAt,
  };
}

function parseTicket(dto: TicketDTO): Ticket {
  const selections =
    dto.selections === null ? null : dto.selections.map(parseSelection);
  const primaryRaceId = selections && selections.length > 0
    ? selections[0].raceId
    : null;
  return {
    ticketId: dto.id,
    status: dto.status,
    currency: dto.currency,
    totalStake: parseMoney(dto.totalStake),
    potentialPayout: parseMoney(dto.potentialPayout),
    payout: parseMoney(dto.actualPayout),
    placedAt: dto.placedAt,
    settledAt: dto.settledAt,
    selections,
    primaryRaceId,
  };
}

// ---------------------------------------------------------------------------
// API.
// ---------------------------------------------------------------------------

export async function placeTicket(input: {
  raceId: string;
  currency: string;
  selections: BetSlipLine[];
}): Promise<PlacementResult> {
  const req: PlaceTicketRequestDTO = {
    raceId: input.raceId,
    currency: input.currency,
    selections: input.selections.map((s) => ({
      betType: s.betType,
      selection:
        s.betType === 'forecast'
          ? { first: s.runnerPos, second: s.second ?? 0 }
          : { runner: s.runnerPos },
      odds: s.odds,
      stake: formatMoneyWire(s.stake),
    })),
  };
  const dto = await apiClient.post<PlaceTicketResponseDTO>(
    '/tickets',
    req,
    uuidv4(),
  );
  return {
    status: dto.status,
    ticketId: dto.status === 'accepted' ? dto.ticketId : undefined,
    rejectReason:
      dto.status === 'rejected'
        ? normaliseRejectReason(dto.rejectReason)
        : undefined,
    totalStake: parseMoney(dto.totalStake),
    potentialPayout: parseMoney(dto.potentialPayout),
    wallet: parseWallet(dto.wallet),
  };
}

export async function listTickets(opts: {
  status?: 'open' | 'settled';
  limit?: number;
  cursor?: string;
}): Promise<TicketsPage> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const qs = params.toString();
  const path = '/tickets' + (qs ? '?' + qs : '');
  const dto = await apiClient.get<TicketsListDTO>(path);
  return {
    items: (dto.items ?? []).map(parseTicket),
    nextCursor: dto.nextCursor ? dto.nextCursor : null,
  };
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  const dto = await apiClient.get<TicketDTO>(`/tickets/${ticketId}`);
  return parseTicket(dto);
}
