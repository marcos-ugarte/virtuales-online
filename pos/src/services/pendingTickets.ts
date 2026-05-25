import type { PrintTicketData } from './printer'

export interface PendingTicketRecord {
  ticketNumber: string
  gameType: string
  gameId: string
  gameName: string
  printData: PrintTicketData
  reservedAt: number
}

const STORAGE_KEY = 'pos_pending_tickets'
const MAX_AGE_MS = 10 * 60 * 1000 // 10 min, matches Redis TTL

/**
 * Save a pending ticket to localStorage
 */
export function savePending(record: PendingTicketRecord): void {
  const existing = getPending()
  existing.push(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

/**
 * Remove a pending ticket by ticketNumber
 */
export function removePending(ticketNumber: string): void {
  const existing = getPending()
  const filtered = existing.filter(r => r.ticketNumber !== ticketNumber)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * Get all pending tickets from localStorage
 */
export function getPending(): PendingTicketRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingTicketRecord[]
  } catch {
    return []
  }
}

/**
 * Remove expired pending tickets (older than MAX_AGE_MS)
 */
export function clearExpired(): void {
  const now = Date.now()
  const existing = getPending()
  const valid = existing.filter(r => (now - r.reservedAt) < MAX_AGE_MS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
}
