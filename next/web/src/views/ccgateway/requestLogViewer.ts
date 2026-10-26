// Reading an account's request logs (REQUEST-LOG-VIEWER-DESIGN.md §6/§8):
// list, one request's summary, and content files in 1 MiB chunks. Content is
// fetched as bytes (the console client only speaks JSON) and shown as text.
import { ApiError, api, apiBase, session } from '@sub2api/host'

export type LogLevel = 'summary' | 'full'
export type LogMode = 'direct' | 'build'

export interface RequestLogItem {
  id: string
  request_id: string
  time: string
  duration_ms: number
  status: number
  stage: string
  model?: string
  stream?: boolean
  log_level: LogLevel
  error_type?: string
  error?: string
  log_status: string
  test: boolean
  attempt?: number
  has_content: boolean
  bytes: number
  // Final upstream request (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3); absent
  // in logs written before it.
  mode?: LogMode
  client_session_id?: string
  upstream_session_id?: string
  body_sha256?: string
  upstream_body_sha256?: string
  /** Only when both hashes are known. */
  body_changed?: boolean
  upstream_captured?: boolean
}

export interface RequestLogActive { request_id: string; started: string; stage: string }

export interface RequestLogPage { items: RequestLogItem[]; next: string | null; active: RequestLogActive[] }

export interface RequestLogFile { name: string; bytes: number; kind: string }

export interface RequestLogDetail {
  metadata: Record<string, unknown>
  events: Record<string, unknown>[]
  events_truncated: boolean
  request_headers: Record<string, string[]> | null
  response_headers: Record<string, string[]> | null
  files: RequestLogFile[]
  /** The caller may read the files (settings:manage). */
  content: boolean
  /** upstream-request.json as the CLI wrote it, secret headers masked; absent when not captured. */
  upstream_request?: Record<string, unknown> | null
}

export interface RequestLogQuery {
  limit?: number
  before?: string
  request_id?: string
  status?: 'ok' | 'error'
  model?: string
  level?: LogLevel
  since?: string
  mode?: LogMode
  session_id?: string
  sha256?: string
  changed?: 'true' | 'false'
}

// The shapes the core and the Worker accept (design §3/§4).
export const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/
export const SHA256_RE = /^[0-9a-f]{64}$/

export interface SearchFilters { mode: '' | LogMode; session: string; sha256: string; changed: '' | 'true' | 'false' }
export type SearchField = 'session_id' | 'sha256'

/**
 * The search part of the list query. Only sent when the Worker offers it
 * (`viewer_search`): an older one refuses unknown keys. A malformed value is
 * reported and the list must not be requested.
 */
export function searchQuery(f: SearchFilters, enabled: boolean): { query: Partial<RequestLogQuery>; invalid: SearchField[] } {
  const query: Partial<RequestLogQuery> = {}
  const invalid: SearchField[] = []
  if (!enabled) return { query, invalid }
  if (f.mode === 'direct' || f.mode === 'build') query.mode = f.mode
  if (f.changed === 'true' || f.changed === 'false') query.changed = f.changed
  const session = f.session.trim()
  if (session) {
    if (SESSION_ID_RE.test(session)) query.session_id = session
    else invalid.push('session_id')
  }
  const sha = f.sha256.trim().toLowerCase()
  if (sha) {
    if (SHA256_RE.test(sha)) query.sha256 = sha
    else invalid.push('sha256')
  }
  return { query, invalid }
}

/** A log written with the capture whose upstream request was not recorded (older logs have no `mode`). */
export const upstreamMissing = (item: Pick<RequestLogItem, 'mode' | 'upstream_captured'>) => item.upstream_captured === false && !!item.mode

/**
 * The "rewritten" badge: only direct requests. A build request is assembled
 * again, so its body always differs and the badge would say nothing.
 */
export const rewritten = (item: Pick<RequestLogItem, 'mode' | 'body_changed'>) => item.mode === 'direct' && item.body_changed === true

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const count = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) ? v : null)
const bool = (v: unknown) => (typeof v === 'boolean' ? v : null)

export interface UpstreamFacts {
  method: string
  url: string
  attempts: number | null
  sentAt: string
  encoding: string
  /** -1: a streamed body whose size is unknown. */
  bodyBytes: number | null
  bodySha256: string
  /** The hash of the body that entered the gateway, for comparison. */
  inputSha256: string
  changed: boolean | null
  model: string
  stream: boolean | null
  betas: string[]
  session: string
  requestClass: string
  headers: { k: string; v: string; redacted: boolean }[]
}

/**
 * The upstream request of a detail, every field type-checked. The headers
 * come from `upstream_request`; betas, session and class fall back to them
 * when metadata does not carry the flat fields. Null when not captured.
 */
export function upstreamFacts(d: Pick<RequestLogDetail, 'metadata' | 'upstream_request'>): UpstreamFacts | null {
  const u = d.upstream_request
  if (!u || typeof u !== 'object' || Array.isArray(u)) return null
  const m = d.metadata ?? {}
  const raw = u.headers && typeof u.headers === 'object' && !Array.isArray(u.headers) ? (u.headers as Record<string, unknown>) : {}
  // The CLI writes name → string (repeated values already joined); name →
  // string[] (the shape of request_headers) is read too.
  const headerValue = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) && v.length && v.every(x => typeof x === 'string') ? v.join(', ') : null)
  const headers = Object.entries(raw).flatMap(([k, v]) => {
    const value = headerValue(v)
    const redacted = typeof v === 'string' ? v === '[REDACTED]' : Array.isArray(v) && v.every(x => x === '[REDACTED]')
    return value === null ? [] : [{ k: k.toLowerCase(), v: value, redacted }]
  }).sort((a, b) => a.k.localeCompare(b.k))
  const header = (name: string) => headers.find(h => h.k === name)?.v ?? ''
  const betas = Array.isArray(m.upstream_betas) && m.upstream_betas.every(b => typeof b === 'string')
    ? (m.upstream_betas as string[])
    : header('anthropic-beta').split(',').map(b => b.trim()).filter(Boolean)
  const sha = str(u.body_sha256).toLowerCase()
  return {
    method: str(u.method), url: str(u.url), attempts: count(u.attempts), sentAt: str(u.sent_at),
    encoding: str(u.body_encoding), bodyBytes: count(u.body_bytes), bodySha256: SHA256_RE.test(sha) ? sha : '',
    inputSha256: SHA256_RE.test(str(m.body_sha256)) ? str(m.body_sha256) : '',
    changed: bool(m.body_changed),
    model: str(u.model), stream: bool(u.stream), betas,
    session: str(m.upstream_session_id) || header('x-claude-code-session-id'),
    requestClass: str(m.upstream_request_class) || header('x-claude-code-request-class'),
    headers
  }
}

export const CHUNK_BYTES = 1 << 20

const base = (account: number) => `/system/ccgateway/accounts/${account}/request-logs/requests`

export function listRequestLogs(account: number, query: RequestLogQuery, signal?: AbortSignal): Promise<RequestLogPage> {
  const q: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') q[k] = v as string | number
  return api.get<RequestLogPage>(base(account), q, { signal })
}

export function requestLogDetail(account: number, log: string, signal?: AbortSignal): Promise<RequestLogDetail> {
  return api.get<RequestLogDetail>(`${base(account)}/${encodeURIComponent(log)}`, undefined, { signal })
}

export interface RequestLogChunk { bytes: Uint8Array; size: number; offset: number }

/**
 * One file read with the session token. A 401 lets the shared client renew
 * the session (reading the detail), then the read is sent once more.
 */
async function readFile(account: number, log: string, name: string, query: string, signal?: AbortSignal): Promise<Response> {
  const path = `${base(account)}/${encodeURIComponent(log)}/files/${encodeURIComponent(name)}${query}`
  const send = () => {
    const headers: Record<string, string> = {}
    const token = session.get()?.access_token
    if (token) headers.Authorization = 'Bearer ' + token
    return fetch(apiBase() + path, { headers, signal })
  }
  let res = await send()
  if (res.status === 401) {
    await requestLogDetail(account, log, signal)
    res = await send()
  }
  if (!res.ok) {
    let body: any = null
    try { body = await res.json() } catch { /* not JSON */ }
    throw new ApiError(res.status, body?.error || { code: 'unavailable', message: res.statusText || 'request failed' })
  }
  return res
}

export async function readChunk(account: number, log: string, name: string, offset: number, signal?: AbortSignal): Promise<RequestLogChunk> {
  const res = await readFile(account, log, name, `?offset=${offset}`, signal)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const size = Number(res.headers.get('X-Log-File-Size'))
  if (!Number.isSafeInteger(size) || size < offset + bytes.length) throw new Error('invalid request log chunk')
  return { bytes, size, offset }
}

/** Saves the whole file through a temporary object URL. */
export async function downloadFile(account: number, log: string, name: string, filename: string): Promise<void> {
  const res = await readFile(account, log, name, '?download=1')
  const url = URL.createObjectURL(await res.blob())
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function joinBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/** How a file is shown: formatted JSON, one block per JSONL line, SSE events, text or bytes. */
export type FileView = 'json' | 'jsonl' | 'sse' | 'text' | 'binary'

/** The loaded bytes as text; a cut multi-byte character at the end is not shown. */
export function textOf(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

export function looksBinary(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 4096)
  let odd = 0
  for (const b of sample) if (b === 0 || (b < 9) || (b > 13 && b < 32)) odd++
  return sample.length > 0 && odd / sample.length > 0.02
}

export function viewOf(name: string, text: string, bytes: Uint8Array): FileView {
  if (looksBinary(bytes)) return 'binary'
  const head = text.trimStart()
  if (name.endsWith('.jsonl')) return 'jsonl'
  if (/^(event|data):/m.test(head.slice(0, 2048)) && /\n\n/.test(text)) return 'sse'
  if (name.endsWith('.json') || head.startsWith('{') || head.startsWith('[')) return 'json'
  return 'text'
}

/** Formatted JSON, or null when the text is not one JSON value. */
export function prettyJSON(text: string): string | null {
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return null }
}

export interface Block { title: string; body: string }

/** JSONL lines, each formatted when it parses. */
export function jsonlBlocks(text: string): Block[] {
  return text.split('\n').filter(l => l.trim()).map((line, i) => {
    let title = `#${i + 1}`
    let body = line
    try {
      const v = JSON.parse(line)
      body = JSON.stringify(v, null, 2)
      if (v && typeof v === 'object' && typeof v.type === 'string') title += ` ${v.type}${typeof v.subtype === 'string' ? '/' + v.subtype : ''}`
      else if (v && typeof v === 'object' && typeof v.event === 'string') title += ` ${v.event}`
    } catch { /* shown as written */ }
    return { title, body }
  })
}

/** Server-sent events, each with its data formatted when it is JSON. */
export function sseBlocks(text: string): Block[] {
  return text.split(/\r?\n\r?\n/).filter(e => e.trim()).map((event) => {
    let name = 'message'
    const data: string[] = []
    for (const line of event.split(/\r?\n/)) {
      if (line.startsWith('event:')) name = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      else if (line.trim()) data.push(line)
    }
    const raw = data.join('\n')
    return { title: name, body: prettyJSON(raw) ?? raw }
  })
}

export function hexPreview(bytes: Uint8Array, limit = 4096): string {
  const rows: string[] = []
  for (let i = 0; i < Math.min(bytes.length, limit); i += 16) {
    const row = bytes.subarray(i, i + 16)
    const hex = Array.from(row, b => b.toString(16).padStart(2, '0')).join(' ')
    const ascii = Array.from(row, b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')
    rows.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(47)}  ${ascii}`)
  }
  return rows.join('\n')
}

export const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id)

export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1 << 20) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1 << 20)).toFixed(1)} MiB`
}

export function durationText(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`
}

/**
 * Groups content files by kind, in reading order. The engine keeps `cli` for
 * logs written up to plugin 0.1.86 (its traceReader wrote `cli-stdout.jsonl`);
 * both `cli` and `upstream` stay until those logs age out. `other` collects
 * every kind this list does not know.
 */
export const FILE_KINDS = ['request', 'build', 'history', 'cli', 'upstream', 'response', 'other'] as const
