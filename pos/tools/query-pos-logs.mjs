#!/usr/bin/env node
/**
 * Query POS logs from Elasticsearch.
 *
 * Usage:
 *   node tools/query-pos-logs.mjs                            # last 1h, all devices
 *   node tools/query-pos-logs.mjs --device <deviceId>         # single device
 *   node tools/query-pos-logs.mjs --since 2026-05-14T10:00    # ISO datetime
 *   node tools/query-pos-logs.mjs --hours 6                   # last N hours
 *   node tools/query-pos-logs.mjs --days 7                    # last N days
 *   node tools/query-pos-logs.mjs --event ticket_pay_failed   # filter by event
 *   node tools/query-pos-logs.mjs --level error               # filter by level
 *   node tools/query-pos-logs.mjs --limit 200                 # max docs (default 100)
 *   node tools/query-pos-logs.mjs --summary                   # group by deviceId+event count
 *
 * Reads VITE_ELASTICSEARCH_API_KEY from apps/pos/.env (or env var).
 * Cluster URL is hardcoded to match vite.config.ts.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ES_URL = 'https://ae319f18a66e435b83902ee29c5b66aa.westus2.azure.elastic-cloud.com:443'
// Read index from .env (matches what the POS sends to). Production = pos-v2-logs.
function loadEnvIndex() {
  if (process.env.VITE_ELASTICSEARCH_LOGS_INDEX) return process.env.VITE_ELASTICSEARCH_LOGS_INDEX
  try {
    const env = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    const m = env.match(/^VITE_ELASTICSEARCH_LOGS_INDEX=(.+)$/m)
    return m ? m[1].trim() : 'pos-v2-logs'
  } catch { return 'pos-v2-logs' }
}
const ES_INDEX = loadEnvIndex()

// Read API key from .env if not in environment
function loadEnvKey() {
  if (process.env.VITE_ELASTICSEARCH_API_KEY) return process.env.VITE_ELASTICSEARCH_API_KEY
  try {
    const env = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    const match = env.match(/^VITE_ELASTICSEARCH_API_KEY=(.+)$/m)
    return match ? match[1].trim() : null
  } catch { return null }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { limit: 100 }
  for (let i = 0; i < args.length; i++) {
    const k = args[i]
    if (k === '--device') out.device = args[++i]
    else if (k === '--since') out.since = args[++i]
    else if (k === '--hours') out.hours = Number(args[++i])
    else if (k === '--days') out.days = Number(args[++i])
    else if (k === '--event') out.event = args[++i]
    else if (k === '--level') out.level = args[++i]
    else if (k === '--limit') out.limit = Number(args[++i])
    else if (k === '--summary') out.summary = true
    else if (k === '-h' || k === '--help') { out.help = true }
  }
  return out
}

function help() {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(2, 18).join('\n').replace(/^ \* ?/gm, ''))
}

async function main() {
  const args = parseArgs()
  if (args.help) return help()

  const apiKey = loadEnvKey()
  if (!apiKey) {
    console.error('ERROR: VITE_ELASTICSEARCH_API_KEY missing in apps/pos/.env or env var')
    process.exit(1)
  }

  // Compute since
  let sinceIso
  if (args.since) sinceIso = args.since
  else if (args.days) sinceIso = new Date(Date.now() - args.days * 86400_000).toISOString()
  else if (args.hours) sinceIso = new Date(Date.now() - args.hours * 3600_000).toISOString()
  else sinceIso = new Date(Date.now() - 3600_000).toISOString() // default 1h

  const must = [
    { range: { '@timestamp': { gte: sinceIso } } }
  ]
  if (args.device) must.push({ term: { 'deviceId.keyword': args.device } })
  if (args.event) must.push({ term: { 'event.keyword': args.event } })
  if (args.level) must.push({ term: { 'level.keyword': args.level } })

  let query
  if (args.summary) {
    query = {
      size: 0,
      query: { bool: { must } },
      aggs: {
        by_device: {
          terms: { field: 'deviceId.keyword', size: 50 },
          aggs: { by_event: { terms: { field: 'event.keyword', size: 30 } } }
        }
      }
    }
  } else {
    query = {
      size: args.limit,
      sort: [{ '@timestamp': 'desc' }],
      query: { bool: { must } }
    }
  }

  const res = await fetch(`${ES_URL}/${ES_INDEX}/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `ApiKey ${apiKey}`
    },
    body: JSON.stringify(query)
  })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(2)
  }

  const data = await res.json()

  if (args.summary) {
    const buckets = data.aggregations?.by_device?.buckets || []
    console.log(`\n=== Summary since ${sinceIso} (${buckets.length} devices) ===\n`)
    for (const d of buckets) {
      console.log(`📱 ${d.key}  (${d.doc_count} events)`)
      for (const e of d.by_event.buckets) {
        console.log(`    ${e.doc_count.toString().padStart(5)}  ${e.key}`)
      }
    }
    return
  }

  const hits = data.hits?.hits || []
  console.log(`\n=== ${hits.length} hits since ${sinceIso} ===\n`)
  for (const h of hits) {
    const s = h._source
    const t = (s['@timestamp'] || s.clientTimestamp || '').replace('T', ' ').slice(0, 19)
    const dev = (s.deviceId || '').slice(0, 8)
    const ms = s.data?.durationMs ? ` (${s.data.durationMs}ms)` : ''
    const op = s.data?.operatorId || s.operatorId || ''
    console.log(`${t}  ${dev}  ${(s.level || '').padEnd(5)}  ${(s.event || '').padEnd(28)}  ${s.message || ''}${ms}${op ? '  op=' + op : ''}`)
  }
  console.log(`\nTotal matched: ${data.hits?.total?.value ?? hits.length}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
