/**
 * Real Race Data Hook
 *
 * Connects to the WebSocket relay server to receive live race data
 * from the original POS system.
 *
 * Key behavior:
 * - Tracks "displayed race" separately from "latest received race"
 * - Won't switch to next race until current race's videoEndDt passes
 * - Closing state: last 10 seconds (red blinking timer)
 * - Running state: from countdown=0 until videoEndDt
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getPOSConnection, type RaceBroadcast } from '@/services/posConnection'
import type { PosGoDsMessage } from '@/services/posGoDsClient'

// Types matching the relay server output
export interface CompetitorData {
  name: string
  weight: number
  numberOfRaces: number
  numberOfWins: number
  strikeRate: number
  bestLap: number
  performance: number
  last5: string
  trend: number
}

export interface RaceData {
  type: 'raceUpdate'
  game: string
  raceId: string
  raceNumber: string
  videoStartDt: string
  videoEndDt: string
  eventType: string
  roundInterval: number
  odds: number[]
  competitors: Record<string, CompetitorData>
}

export interface RaceResult {
  type: 'raceResult'
  game: string
  raceId: string
  finish: Record<string, { competitorIndex: number; time: number | null }>
  bonus: number
  eventType: string
}

export interface TimeSync {
  type: 'timeSync'
  serverTime: string
  serverTimeUnix: number
}

export interface ConnectionStatus {
  type: 'status'
  connected: boolean
  message: string
}

export interface GamepoolUpdate {
  type: 'gamepoolUpdate'
  gamepool: Record<string, RaceData[]>
  sourceMode?: string  // 'test' | 'replay' | 'redis'
}

export interface ResultsHistoryUpdate {
  type: 'resultsHistory'
  game: string
  results: Array<{
    raceNumber: string
    first: number
    second: number
    bonus?: number
  }>
}

export interface OddsHistoryUpdate {
  type: 'oddsHistory'
  game: string
  odds: Array<{
    raceNumber: string
    odds: number[]
  }>
}

export type RaceState = 'betting' | 'closing' | 'running'

export interface GameRaceData {
  raceNumber: string
  raceId: string                    // Full race ID for ticket submission (e.g., "541_105_202601030278")
  countdown: number
  roundInterval: number
  serverTime: string
  raceStartTime: string
  raceState: RaceState
  runningRaceNumber: string | null  // Race number shown in overlay (null = no overlay)
  runningRaceId: string | null      // Full raceId of the running race (for ticket matching)
  odds: number[]
  competitors: Record<string, CompetitorData>
  lastResult: RaceResult | null
}

interface UseRealRaceDataOptions {
  relayUrl?: string
  reconnectDelay?: number
  timezone?: string  // Windows or IANA timezone name
}

export interface RaceOddsData {
  raceNumber: string
  odds: number[]
}

// Result format for the Results component
export interface FormattedRaceResult {
  raceNumber: string
  first: number      // First place competitor index
  second: number     // Second place competitor index
  multiplier?: number // Bonus multiplier (only if > 1)
  startTime?: string // Race start date/time formatted as DD/MM/YYYY HH:mm:ss
}

// Stored result with race number for history
interface StoredRaceResult extends RaceResult {
  raceNumber: string
  videoStartDt?: string // UTC datetime of race start (from gamepool lookup)
}

/**
 * Sorts race numbers by recency, handling the daily epoch rollover.
 * Race numbers reset to 1 every day (around 22:00 UTC for dog games).
 * If the dataset contains both LOW (< 100) and HIGH (> 250) numbers, the low
 * ones are "today" and should appear first (newer) than the high ones (yesterday).
 *
 * @returns negative if a is newer (should come first), positive if b is newer.
 */
function sortRacesByRecency(a: string, b: string): number {
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  // Day rollover detection: if numbers are far apart, the low one is "today"
  if (Math.abs(na - nb) > 200) {
    // The smaller number is from today (newer), should come first
    return na - nb // ascending: smaller (today) first
  }
  // Same day: standard newest first (higher number first)
  return nb - na
}

interface UseRealRaceDataReturn {
  connected: boolean
  connectionMessage: string
  /** Game keys available in the gamepool (e.g. ['doe', 'dos']) */
  availableGames: string[]
  getGameData: (game: string) => GameRaceData
  getGameOdds: (game: string) => RaceOddsData[]
  getGameResults: (game: string) => FormattedRaceResult[]
  lastResult: (game: string) => RaceResult | null
  /** Timestamp of last timeSync received from relay (Date.now()) */
  lastTimeSyncReceived: number | null
  /** Check if data is stale (no timeSync in threshold ms, default 30000) */
  isDataStale: (thresholdMs?: number) => boolean
  /** Source mode from simulator: 'test' | 'replay' | 'redis' | null */
  sourceMode: string | null
}

const DEFAULT_TIMEZONE = 'America/Santo_Domingo'

// ============================================================================
// Vendor wire (/pos-go-ds gameRound/gameResult) → internal translation
//
// The /pos-go-ds backend broadcasts the SAME vendor wire as TV / web-ds:
//   gameRound  → { gamepool: VendorRace[] }
//   gameResult → { gameresult: { id, eventType, finish, interval, ... } }
// The Dashboard keys games by prefix (dos/doe/dot/hoc). Vendor `eventType`
// strings map to those prefixes below. The internal RaceData/RaceResult
// shapes (consumed by getGameData/getGameOdds/getGameResults) are produced
// here so the rest of the hook and the Dashboard stay untouched.
// ============================================================================

/** Vendor eventType → Dashboard game prefix. */
const EVENT_TYPE_TO_GAME: Record<string, string> = {
  dog: 'dos',          // dog6 / betoffer 141
  dog6: 'dos',
  dog8: 'doe',         // betoffer 541
  dog63: 'dot',        // betoffer 341/741
  horsec: 'hoc',       // horse classic / betoffer 241/251
  horse: 'hoc',
  horse_classic: 'hoc',
}

interface VendorCompetitor {
  name?: string
  weight?: number
  numberOfRaces?: number
  numberOfWins?: number
  strikeRate?: number
  bestLap?: number
  performance?: number
  last5?: string
  trend?: number
  [k: string]: unknown
}

interface VendorRace {
  id: string
  eventType: string
  videoStartDt: string
  videoEndDt: string
  roundInterval?: number
  odds?: number[]
  competitors?: Record<string, VendorCompetitor>
  finish?: Record<string, { competitorIndex: number; time: number | null }> | null
  bonus?: number | null
  [k: string]: unknown
}

/** Derive the 4-digit race number from the round id (last segment, last 4). */
function raceNumberFromId(id: string): string {
  const tail = (id.split('_').pop() || id)
  return tail.slice(-4)
}

function translateCompetitors(
  competitors: Record<string, VendorCompetitor> | undefined
): Record<string, CompetitorData> {
  const out: Record<string, CompetitorData> = {}
  if (!competitors) return out
  for (const [pos, c] of Object.entries(competitors)) {
    out[pos] = {
      name: c.name ?? '',
      weight: c.weight ?? 0,
      numberOfRaces: c.numberOfRaces ?? 0,
      numberOfWins: c.numberOfWins ?? 0,
      strikeRate: c.strikeRate ?? 0,
      bestLap: c.bestLap ?? 0,
      performance: c.performance ?? 0,
      last5: c.last5 ?? '',
      trend: c.trend ?? 0,
    }
  }
  return out
}

/** Translate one vendor race into the internal RaceData shape. */
function translateRace(v: VendorRace): { game: string; race: RaceData } | null {
  const game = EVENT_TYPE_TO_GAME[v.eventType]
  if (!game) return null
  if (!v.id || !v.videoStartDt || !v.videoEndDt) return null
  return {
    game,
    race: {
      type: 'raceUpdate',
      game,
      raceId: v.id,
      raceNumber: raceNumberFromId(v.id),
      videoStartDt: v.videoStartDt,
      videoEndDt: v.videoEndDt,
      eventType: v.eventType,
      roundInterval: v.roundInterval ?? 240,
      odds: Array.isArray(v.odds) ? v.odds : [],
      competitors: translateCompetitors(v.competitors),
    },
  }
}

/** Translate a vendor gameResult.gameresult into the internal RaceResult shape. */
function translateResult(gr: VendorRace): { game: string; result: RaceResult } | null {
  const game = EVENT_TYPE_TO_GAME[gr.eventType]
  if (!game || !gr.id) return null
  const finish: RaceResult['finish'] = {}
  if (gr.finish) {
    for (const [place, f] of Object.entries(gr.finish)) {
      finish[place] = { competitorIndex: f.competitorIndex, time: f.time ?? null }
    }
  }
  return {
    game,
    result: {
      type: 'raceResult',
      game,
      raceId: gr.id,
      finish,
      bonus: gr.bonus ?? 1,
      eventType: gr.eventType,
    },
  }
}

// Windows timezone name to IANA timezone mapping
const WINDOWS_TO_IANA_TIMEZONE: Record<string, string> = {
  'Atlantic Standard Time': 'America/Santo_Domingo',
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
  'SA Western Standard Time': 'America/Santo_Domingo',
  'Venezuela Standard Time': 'America/Caracas',
  'SA Pacific Standard Time': 'America/Bogota',
  'Central America Standard Time': 'America/Guatemala',
  'Mexico Standard Time': 'America/Mexico_City',
  'UTC': 'UTC',
  'GMT Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Romance Standard Time': 'Europe/Paris',
  'Central European Standard Time': 'Europe/Warsaw'
}

/**
 * Resolve timezone to IANA format
 * Handles both Windows and IANA timezone names
 */
function resolveTimezone(tz?: string): string {
  if (!tz) return DEFAULT_TIMEZONE

  // Check if it's already an IANA timezone (contains '/')
  if (tz.includes('/')) return tz

  // Try to map from Windows format
  const mapped = WINDOWS_TO_IANA_TIMEZONE[tz]
  if (mapped) return mapped

  // Fixed UTC offset (e.g. "-04:00") — the /pos-go-ds backend sends the
  // location offset, not an IANA name. Intl.DateTimeFormat can't take an
  // offset as `timeZone`, so map common offsets to a representative no-DST
  // IANA zone. (Only affects the displayed clock; race timing is UTC-based.)
  const OFFSET_TO_IANA: Record<string, string> = {
    '-03:00': 'America/Argentina/Buenos_Aires',
    '-04:00': 'America/Santo_Domingo',
    '-05:00': 'America/Bogota',
    '-06:00': 'America/Guatemala',
    '+00:00': 'UTC',
    '-00:00': 'UTC',
  }
  if (OFFSET_TO_IANA[tz]) return OFFSET_TO_IANA[tz]

  // Fallback to default if unknown (warn once-ish — unknown non-offset value)
  console.warn(`[useRealRaceData] Unknown timezone: ${tz}, using default`)
  return DEFAULT_TIMEZONE
}

/**
 * Check if videoEndDt has passed
 */
function hasVideoEnded(videoEndDt: string): boolean {
  if (!videoEndDt) return true
  const endTime = new Date(videoEndDt.replace(' ', 'T') + 'Z').getTime()
  return Date.now() >= endTime
}

/**
 * Calculate countdown until video starts
 * videoStartDt = when video/race starts (UTC)
 */
function calculateCountdown(videoStartDt: string): number {
  if (!videoStartDt) return 0
  const start = new Date(videoStartDt.replace(' ', 'T') + 'Z')
  const now = Date.now()
  const diff = Math.floor((start.getTime() - now) / 1000)
  return Math.max(0, diff)
}

/**
 * Format time as HH:MM:SS from datetime string (converts UTC to specified timezone)
 */
function formatTime(dtString: string, timezone: string): string {
  if (!dtString) return '--:--:--'
  // Parse as UTC and convert to display timezone
  const date = new Date(dtString.replace(' ', 'T') + 'Z')
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone
  })
}

/**
 * Format datetime as DD/MM/YYYY HH:MM:SS from UTC string (converts to specified timezone)
 */
function formatDateTime(dtString: string | undefined, timezone: string): string {
  if (!dtString) return ''
  const date = new Date(dtString.replace(' ', 'T') + 'Z')
  const parts = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`
}

/**
 * Compute a historical race's start time using an anchor race with known videoStartDt.
 * Uses slot spacing (roundInterval, default 240s) to derive the target race's time-of-day,
 * then pairs it with today's date (in the display timezone) per product spec.
 */
function computeStartTimeFromAnchor(
  targetRaceNumber: string,
  anchor: RaceData | undefined,
  timezone: string
): string {
  if (!anchor) return ''
  const targetNum = parseInt(targetRaceNumber, 10)
  const anchorNum = parseInt(anchor.raceNumber, 10)
  if (!Number.isFinite(targetNum) || !Number.isFinite(anchorNum)) return ''

  const roundIntervalSec = anchor.roundInterval || 240
  const anchorMs = new Date(anchor.videoStartDt.replace(' ', 'T') + 'Z').getTime()
  const targetMs = anchorMs + (targetNum - anchorNum) * roundIntervalSec * 1000

  // Time-of-day of target race in display timezone
  const todParts = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: timezone
  }).formatToParts(new Date(targetMs))
  const tod = (type: string) => todParts.find(p => p.type === type)?.value ?? ''

  // Today's date in display timezone
  const dateParts = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone
  }).formatToParts(new Date())
  const d = (type: string) => dateParts.find(p => p.type === type)?.value ?? ''

  return `${d('day')}/${d('month')}/${d('year')} ${tod('hour')}:${tod('minute')}:${tod('second')}`
}

/**
 * Hook that connects to the relay server and provides real race data
 */
export function useRealRaceData(options: UseRealRaceDataOptions = {}): UseRealRaceDataReturn {
  const { timezone: rawTimezone } = options

  // Resolve timezone to IANA format
  const displayTimezone = resolveTimezone(rawTimezone)

  const [connected, setConnected] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('Connecting...')

  // Store FULL gamepool - all races per game type (sorted by videoStartDt)
  const [gamepoolMap, setGamepoolMap] = useState<Record<string, RaceData[]>>({})
  // Store currently RUNNING race (for overlay - stays until videoEndDt passes)
  const [runningRaceMap, setRunningRaceMap] = useState<Record<string, RaceData>>({})
  // Store odds history per game (newest first, max 20 per game)
  const [oddsHistoryMap, setOddsHistoryMap] = useState<Record<string, RaceOddsData[]>>({})
  // Store results history per game (newest first, max 50 per game)
  const [resultsHistoryMap, setResultsHistoryMap] = useState<Record<string, StoredRaceResult[]>>({})
  // Store latest result per game (for lastResult function)
  const [resultMap, setResultMap] = useState<Record<string, RaceResult>>({})
  // Source mode from simulator ('test' | 'replay' | 'redis') — not applicable
  // on /pos-go-ds (live broadcasts only); kept null to preserve return shape.
  const sourceMode: string | null = null

  // Server time reference: store the unix timestamp and when we received it
  const serverTimeRef = useRef<{ serverUnix: number; localWhen: number } | null>(null)
  // Track when we last received a timeSync (for staleness detection)
  const [lastTimeSyncReceived, setLastTimeSyncReceived] = useState<number | null>(null)

  // Local time ticker for countdown updates
  const [tick, setTick] = useState(0)

  // Mirror of gamepoolMap for access inside the broadcast handler (avoids
  // stale closure when computing race numbers / videoEndDt for results).
  const gamepoolMapRef = useRef<Record<string, RaceData[]>>({})
  useEffect(() => {
    gamepoolMapRef.current = gamepoolMap
  }, [gamepoolMap])

  // --------------------------------------------------------------------------
  // Broadcast ingestion (Phase 2)
  //
  // Instead of opening a second WebSocket to the relay, subscribe to the
  // gameRound/gameResult broadcasts arriving on the SINGLE authenticated
  // /pos-go-ds socket held by posConnection. Translate the vendor wire into
  // the internal RaceData/RaceResult structures this hook already produces.
  // --------------------------------------------------------------------------

  // Ingest a full vendor gamepool (gameRound) — replace each game's race list
  // by raceId merge, sorted by videoStartDt. Also accumulate odds history.
  const ingestGameRound = useCallback((gamepool: VendorRace[]) => {
    const translated = gamepool
      .map(translateRace)
      .filter((x): x is { game: string; race: RaceData } => x !== null)

    if (translated.length === 0) return

    const byGame: Record<string, RaceData[]> = {}
    for (const { game, race } of translated) {
      ;(byGame[game] ||= []).push(race)
    }

    setGamepoolMap(prev => {
      const next = { ...prev }
      for (const [game, incoming] of Object.entries(byGame)) {
        const existing = next[game] || []
        const byId = new Map<string, RaceData>()
        for (const r of existing) byId.set(r.raceId, r)
        for (const r of incoming) byId.set(r.raceId, r) // incoming wins (fresh odds)
        next[game] = Array.from(byId.values()).sort((a, b) => {
          const ta = new Date(a.videoStartDt.replace(' ', 'T') + 'Z').getTime()
          const tb = new Date(b.videoStartDt.replace(' ', 'T') + 'Z').getTime()
          return ta - tb
        })
      }
      return next
    })

    // Odds history: one entry per race number (deduped).
    setOddsHistoryMap(prev => {
      const next = { ...prev }
      for (const { game, race } of translated) {
        if (!race.odds || race.odds.length === 0) continue
        const existing = next[game] || []
        if (existing.some(o => o.raceNumber === race.raceNumber)) continue
        next[game] = [{ raceNumber: race.raceNumber, odds: race.odds }, ...existing].slice(0, 20)
      }
      return next
    })

    // Finished races in the pool seed results history (e.g. after reconnect /
    // initial replay) so the Results panel isn't empty until the next finish.
    for (const v of gamepool) {
      if (!v.finish || Object.keys(v.finish).length === 0) continue
      const r = translateResult(v)
      if (!r) continue
      const raceNumber = raceNumberFromId(v.id)
      const stored: StoredRaceResult = { ...r.result, raceNumber, videoStartDt: v.videoStartDt }
      setResultsHistoryMap(prev => {
        const existing = prev[r.game] || []
        if (existing.some(e => e.raceId === r.result.raceId)) return prev
        return { ...prev, [r.game]: [stored, ...existing].slice(0, 50) }
      })
    }
  }, [])

  // Ingest a gameResult broadcast → latest result + delayed results history.
  const ingestGameResult = useCallback((gr: VendorRace) => {
    const translated = translateResult(gr)
    if (!translated) return
    const { game, result } = translated
    console.log(`[useRealRaceData] gameResult ${game} #${raceNumberFromId(gr.id)}`)

    setResultMap(prev => ({ ...prev, [game]: result }))

    // Delay adding to resultsHistory until videoEndDt passes — vendor POS only
    // shows results after the race video finishes, not when gameResult arrives.
    const races = gamepoolMapRef.current[game] || []
    const race = races.find(r => r.raceId === result.raceId)
    const raceNumber = race?.raceNumber || raceNumberFromId(result.raceId)
    const storedResult: StoredRaceResult = {
      ...result,
      raceNumber,
      videoStartDt: race?.videoStartDt,
    }

    const addToHistory = () => {
      setResultsHistoryMap(prev => {
        const existing = prev[game] || []
        if (existing.some(r => r.raceId === result.raceId)) return prev
        return { ...prev, [game]: [storedResult, ...existing].slice(0, 50) }
      })
      console.log(`[useRealRaceData] Race ended: ${game} #${raceNumber}`)
    }

    const endDt = race?.videoEndDt || gr.videoEndDt
    if (endDt) {
      const delay = new Date(endDt.replace(' ', 'T') + 'Z').getTime() - Date.now()
      if (delay > 0) setTimeout(addToHistory, delay)
      else addToHistory()
    } else {
      addToHistory()
    }
  }, [])

  // Reference to posConnection so staleness/connected can poll socket health
  // (the /pos-go-ds socket stays open between sparse broadcast bursts).
  const connectionRef = useRef<ReturnType<typeof getPOSConnection> | null>(null)

  // Subscribe to posConnection's race broadcasts (single authenticated socket).
  useEffect(() => {
    let connection
    try {
      connection = getPOSConnection()
    } catch {
      // posConnection not initialized yet — Dashboard always mounts it first,
      // but guard so the hook never throws if used standalone.
      console.warn('[useRealRaceData] posConnection not initialized; no race feed')
      return
    }

    connectionRef.current = connection
    setConnected(true)
    setConnectionMessage('Subscribed to /pos-go-ds broadcasts')

    const handle = (b: RaceBroadcast) => {
      try {
        // serverTime → timeSync reference (used for the on-screen clock).
        const serverTime = (b.msg as PosGoDsMessage).serverTime as string | undefined
        if (serverTime) {
          const serverMs = new Date(serverTime.replace(' ', 'T') + 'Z').getTime()
          if (Number.isFinite(serverMs)) {
            serverTimeRef.current = { serverUnix: serverMs, localWhen: Date.now() }
            setLastTimeSyncReceived(Date.now())
          }
        }

        if (b.kind === 'gameRound') {
          const gp = (b.msg as { gamepool?: unknown }).gamepool
          if (Array.isArray(gp)) {
            console.log(`[useRealRaceData] gameRound broadcast: ${gp.length} races`)
            ingestGameRound(gp as VendorRace[])
          }
        } else {
          const gr = (b.msg as { gameresult?: unknown }).gameresult
          if (gr && typeof gr === 'object') ingestGameResult(gr as VendorRace)
        }
      } catch (err) {
        console.error('[useRealRaceData] broadcast handler error', err)
      }
    }

    const unsubscribe = connection.onRaceBroadcast(handle)
    return () => { unsubscribe() }
  }, [ingestGameRound, ingestGameResult])

  // Local time ticker - updates every second to refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Manage running race state - auto-switch based on time
  useEffect(() => {
    for (const [game, races] of Object.entries(gamepoolMap)) {
      if (races.length === 0) continue

      const now = Date.now()
      const runningRace = runningRaceMap[game]

      // Find race that should be running (videoStartDt passed, videoEndDt not passed)
      let raceToRun: RaceData | null = null
      for (const race of races) {
        const startTime = new Date(race.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        const endTime = new Date(race.videoEndDt.replace(' ', 'T') + 'Z').getTime()

        if (now >= startTime && now < endTime) {
          raceToRun = race
          break
        }
      }

      // Update running race state
      if (raceToRun) {
        // Should be running - set if different from current
        if (!runningRace || runningRace.raceId !== raceToRun.raceId) {
          console.log(`[React] Race started: ${game} #${raceToRun.raceNumber}`)
          setRunningRaceMap(prev => ({ ...prev, [game]: raceToRun! }))
        }
      } else if (runningRace) {
        // Check if current running race has ended
        if (hasVideoEnded(runningRace.videoEndDt)) {
          console.log(`[React] Race ended: ${game} #${runningRace.raceNumber}`)
          setRunningRaceMap(prev => {
            const newMap = { ...prev }
            delete newMap[game]
            return newMap
          })
        }
      }
    }
  }, [gamepoolMap, runningRaceMap, tick])

  // Get data for a specific game
  const getGameData = useCallback((game: string): GameRaceData => {
    const races = gamepoolMap[game] || []
    const runningRace = runningRaceMap[game]
    const result = resultMap[game]

    // Calculate current server time from reference (updates every tick)
    let displayTime: string
    if (serverTimeRef.current) {
      // Calculate elapsed time since we received the reference
      const elapsed = Date.now() - serverTimeRef.current.localWhen
      // Add elapsed to server time to get current server time
      const currentServerTime = new Date(serverTimeRef.current.serverUnix + elapsed)
      displayTime = currentServerTime.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: displayTimezone
      })
    } else {
      // Fallback to local time if no server time received yet
      displayTime = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: displayTimezone
      })
    }

    // Find the current race to display info for (next upcoming race based on time)
    const now = Date.now()
    let currentRace: RaceData | null = null
    let nextRaceForCountdown: RaceData | null = null

    // Find first race that hasn't started yet (for countdown display)
    // AND first race that hasn't ended yet (for other data when running)
    for (const race of races) {
      const startTime = new Date(race.videoStartDt.replace(' ', 'T') + 'Z').getTime()
      const endTime = new Date(race.videoEndDt.replace(' ', 'T') + 'Z').getTime()

      // First race that hasn't ended - use for current race data
      if (!currentRace && now < endTime) {
        currentRace = race
      }

      // First race with positive countdown (at least 1 second until start)
      // This ensures we skip races that are about to start or just started
      if (!nextRaceForCountdown && startTime > now) {
        nextRaceForCountdown = race
      }

      // If we found both, we can stop
      if (currentRace && nextRaceForCountdown) break
    }

    // If no future race found, use the last one (or null if empty)
    if (!currentRace && races.length > 0) {
      currentRace = races[races.length - 1]
    }

    // Use next race for countdown if available, otherwise current
    const raceForCountdown = nextRaceForCountdown || currentRace

    if (!currentRace) {
      // Return default data when no races available
      return {
        raceNumber: '----',
        raceId: '',
        countdown: 0,
        roundInterval: 240, // Default 4 minutes
        serverTime: displayTime,
        raceStartTime: '--:--:--',
        raceState: 'betting',
        runningRaceNumber: null,
        runningRaceId: null,
        odds: [],
        competitors: {},
        lastResult: null
      }
    }

    // Calculate countdown from the next race that hasn't started
    // If no next race in gamepool, estimate based on roundInterval
    let countdown = 0
    if (raceForCountdown) {
      countdown = calculateCountdown(raceForCountdown.videoStartDt)

      // If countdown is 0 (race started) and we don't have the next race yet,
      // estimate countdown based on roundInterval
      if (countdown === 0 && currentRace) {
        const roundInterval = currentRace.roundInterval || 240
        const currentStartTime = new Date(currentRace.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        const nextStartTime = currentStartTime + (roundInterval * 1000)
        const estimatedCountdown = Math.floor((nextStartTime - Date.now()) / 1000)
        countdown = Math.max(0, estimatedCountdown)
      }
    }

    // Determine race state based on countdown and running race
    let raceState: RaceState = 'betting'
    if (countdown <= 3 && countdown > 0) {
      // Last 3 seconds - closing state (modal "no más apuestas")
      raceState = 'closing'
    } else if (runningRace && countdown >= 205) {
      // Race is running and countdown above 205 — show overlay with animation
      raceState = 'running'
    } else if (countdown <= 0) {
      // Countdown just hit 0, runningRace not detected yet — go straight to running
      raceState = 'running'
    }

    // The overlay shows the RUNNING race number (not the current)
    const runningRaceNumber = runningRace ? runningRace.raceNumber : null
    const runningRaceId = runningRace ? runningRace.raceId : null

    // When running, show next race info; otherwise show current race info
    const displayRace = raceForCountdown || currentRace

    return {
      raceNumber: displayRace.raceNumber,  // Race number for countdown display
      raceId: displayRace.raceId,          // Full race ID for ticket submission
      countdown,
      roundInterval: displayRace.roundInterval || 240,
      serverTime: displayTime,
      raceStartTime: formatTime(displayRace.videoStartDt, displayTimezone),
      raceState,
      runningRaceNumber,  // Overlay title from running race
      runningRaceId,      // Full raceId of running race
      odds: displayRace.odds,  // Odds from next race when running
      competitors: displayRace.competitors,  // Competitors from next race when running
      lastResult: result || null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamepoolMap, runningRaceMap, resultMap, tick, displayTimezone])

  // Get last result for a specific game
  const lastResult = useCallback((game: string): RaceResult | null => {
    return resultMap[game] || null
  }, [resultMap])

  // Get odds for a specific game: gamepool (current) + history (past), deduplicated
  const getGameOdds = useCallback((game: string): RaceOddsData[] => {
    const races = gamepoolMap[game] || []
    const history = oddsHistoryMap[game] || []
    // Deduplicate by raceNumber using Map (gamepool takes priority)
    const oddsMap = new Map<string, RaceOddsData>()
    // History first (lower priority)
    for (const h of history) oddsMap.set(h.raceNumber, h)
    // Gamepool overwrites (higher priority - current data)
    for (const r of races) oddsMap.set(r.raceNumber, { raceNumber: r.raceNumber, odds: r.odds })
    // Sort newest first — handles day rollover where today's low numbers (e.g. 25)
    // are newer than yesterday's high numbers (e.g. 360)
    return Array.from(oddsMap.values()).sort((a, b) => sortRacesByRecency(a.raceNumber, b.raceNumber))
  }, [gamepoolMap, oddsHistoryMap])

  // Get formatted results for the Results component (newest first)
  const getGameResults = useCallback((game: string): FormattedRaceResult[] => {
    const results = resultsHistoryMap[game] || []
    // Anchor = any race in this game's gamepool (has videoStartDt + raceNumber).
    // Used to derive start times for historical results that don't carry their own.
    const anchor = (gamepoolMap[game] || [])[0]
    return results
      .map(result => {
        // Extract first and second place from finish object
        // finish: { "1": { competitorIndex: 2, time: ... }, "2": { competitorIndex: 5, time: ... } }
        const first = result.finish?.['1']?.competitorIndex ?? 0
        const second = result.finish?.['2']?.competitorIndex ?? 0

        const startTime = result.videoStartDt
          ? formatDateTime(result.videoStartDt, displayTimezone)
          : computeStartTimeFromAnchor(result.raceNumber, anchor, displayTimezone)

        // Only include multiplier if bonus > 1
        const formatted: FormattedRaceResult = {
          raceNumber: result.raceNumber,
          first,
          second,
          startTime
        }

        if (result.bonus && result.bonus > 1) {
          formatted.multiplier = result.bonus
        }

        return formatted
      })
      .sort((a, b) => sortRacesByRecency(a.raceNumber, b.raceNumber))
  }, [resultsHistoryMap, gamepoolMap, displayTimezone])

  // Whether we have ever ingested a usable gamepool (any game with races).
  const hasGamepool = Object.values(gamepoolMap).some(list => list.length > 0)

  // Staleness on /pos-go-ds is NOT broadcast-recency based.
  //
  // Unlike the old relay (which streamed a steady timeSync every few seconds),
  // /pos-go-ds delivers the FULL gamepool window at init and then emits
  // gameRound/gameResult broadcasts in sparse bursts (verified: a burst right
  // after login, then quiet for the rest of the round). The hook advances the
  // running race purely from the local clock + the init gamepool, so the feed
  // stays fully usable for minutes without any new broadcast. Keying staleness
  // off broadcast recency therefore produced a false "RECONECTANDO (Relay)"
  // overlay ~25s after every login.
  //
  // The feed is "stale" only when the underlying authenticated socket is
  // actually down OR we never received a gamepool. While the socket is open
  // and we hold gamepool data, we are NOT stale regardless of broadcast gaps.
  const isDataStale = useCallback((_thresholdMs: number = 30000): boolean => {
    if (!hasGamepool) return false   // nothing loaded yet → not "stale", just empty
    const socketOpen = connectionRef.current?.isConnected() ?? false
    return !socketOpen
  // tick keeps this re-evaluating each second so the overlay clears/appears
  // promptly when the socket flips.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGamepool, tick])

  const availableGames = Object.keys(gamepoolMap).filter(k => gamepoolMap[k].length > 0)

  return {
    connected,
    connectionMessage,
    availableGames,
    getGameData,
    getGameOdds,
    getGameResults,
    lastResult,
    lastTimeSyncReceived,
    isDataStale,
    sourceMode
  }
}

export default useRealRaceData
