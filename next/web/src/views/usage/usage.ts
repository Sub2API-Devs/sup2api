import type { UsageLog } from '@/api/types'
import { isConvertedGrade } from '@/utils/conversion'

/** Usage row/detail with the extra fields the billing module returns. */
export type UsageRow = UsageLog & {
  api_key_name?: string
  user_name?: string
  price?: { id: number; model: string; source: string } | null
  metrics?: Record<string, unknown> | null
  /** Detail only: the account a CCGateway request log is filed under, sent to callers who may read that log (also without account:read). */
  request_log_account_id?: number
}

export type UsageTokenFacts = Partial<Pick<UsageRow, 'input_tokens' | 'output_tokens' | 'cache_read_tokens' | 'cache_creation_tokens' | 'cache_creation_1h_tokens'>>

const replacementTokenFields = {
  input_tokens: 'Input', output_tokens: 'Output', cache_read_tokens: 'CacheRead',
  cache_creation_tokens: 'CacheCreation', cache_creation_1h_tokens: 'CacheCreation1h'
} as const

/** Recorded rounds are partial evidence, never a replacement request total. */
export function knownUsageRounds(row: UsageRow): Array<{ round: number; tokens: UsageTokenFacts; metrics?: unknown }> {
  if (row.success || Object.keys(replacementTokenFields).some(key => Number(row[key as keyof UsageTokenFacts]) > 0)) return []
  const replacement: unknown = row.billing_detail?.inputs?.replacement
  if (!Array.isArray(replacement)) return []
  return replacement.flatMap((item, index) => {
    const facts: unknown = item?.Tokens
    if (!facts || typeof facts !== 'object') return []
    const tokens: UsageTokenFacts = {}
    for (const [field, source] of Object.entries(replacementTokenFields)) {
      const value = (facts as Record<string, unknown>)[source]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) tokens[field as keyof UsageTokenFacts] = value
    }
    return Object.keys(tokens).length ? [{ round: index + 1, tokens, metrics: item.Metrics }] : []
  })
}

/** "#12 name" for the upstream account a request used ("#12" once the account is gone, "" without one). */
export function accountLabel(u: Pick<UsageLog, 'account_id' | 'account_name'>): string {
  if (!u.account_id) return u.account_name || ''
  return u.account_name ? `#${u.account_id} ${u.account_name}` : `#${u.account_id}`
}

/** Platform a request reached its upstream account on, read off the upstream protocol: an
 *  endpoint's protocol is "<platform id>.<name>" (CONTRACTS §13). '' when the record has no
 *  such protocol: none recorded, or "local" (a count_tokens the core answered itself), where
 *  the client endpoint's platform need not be the account's. */
export function accountPlatform(u: Pick<UsageLog, 'upstream_protocol'>): string {
  const protocol = u.upstream_protocol || ''
  const dot = protocol.indexOf('.')
  return dot > 0 && dot < protocol.length - 1 ? protocol.slice(0, dot) : ''
}

/** One account (or one failed plugin batch) of a model availability trace (anomalies.availability). */
export interface AvailabilitySample {
  /** Missing when the caller lacks account:read, and on a whole-batch fail-open sample. */
  account_id?: number
  /** Filled by the API for callers with account:read. */
  account_name?: string
  plugin?: string
  model?: string
  /** block | fail_open */
  decision: string
  /** Reason code; a plugin reason follows the first ':' ("unavailable:quota_rejected:7d_fable"). */
  reason: string
  /** Unix seconds. */
  retry_at?: number
  /** Guard samples only. */
  attempt?: number
  /** The one sample of a whole plugin batch that failed open (no account). */
  batch?: boolean
}

/** The model availability precheck of one request (MODEL-AVAILABILITY-PRECHECK-DESIGN.md §6.1). */
export interface AvailabilityTrace {
  v: number
  /** blocked_all | partial | fail_open | pass (precheck admitted all, only the guard blocked) */
  outcome: string
  candidates: number
  admitted: number
  /** Reason code -> accounts. */
  counts: Record<string, number>
  /** Unix seconds: the earliest retry among the blocked accounts. */
  retry_at?: number
  samples: AvailabilitySample[]
  omitted?: number
  guard?: AvailabilitySample[]
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

function availabilitySamples(value: unknown, max: number): AvailabilitySample[] {
  if (!Array.isArray(value)) return []
  const out: AvailabilitySample[] = []
  for (const item of value.slice(0, max)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const s = item as Record<string, unknown>
    const reason = text(s.reason, 200)
    if (!reason) continue
    const sample: AvailabilitySample = { decision: text(s.decision, 32), reason }
    if (count(s.account_id) > 0) sample.account_id = count(s.account_id)
    if (text(s.account_name, 200)) sample.account_name = text(s.account_name, 200)
    if (text(s.plugin, 100)) sample.plugin = text(s.plugin, 100)
    if (text(s.model, 200)) sample.model = text(s.model, 200)
    if (count(s.retry_at) > 0) sample.retry_at = count(s.retry_at)
    if (count(s.attempt) > 0) sample.attempt = count(s.attempt)
    if (s.batch === true) sample.batch = true
    out.push(sample)
  }
  return out
}

/** The recorded availability trace of a request, or null when absent or malformed.
 *  Defensive: the record is free-form JSON, so every field is type-checked and lists are capped. */
export function availabilityTrace(u: Pick<UsageLog, 'anomalies'>): AvailabilityTrace | null {
  const raw: unknown = u.anomalies?.availability
  let value: unknown = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { return null }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  const outcome = text(o.outcome, 32)
  if (!outcome) return null
  const counts: Record<string, number> = {}
  if (o.counts && typeof o.counts === 'object' && !Array.isArray(o.counts)) {
    for (const [k, v] of Object.entries(o.counts).slice(0, 32)) if (count(v) > 0) counts[k.slice(0, 200)] = count(v)
  }
  const trace: AvailabilityTrace = {
    v: count(o.v),
    outcome,
    candidates: count(o.candidates),
    admitted: count(o.admitted),
    counts,
    samples: availabilitySamples(o.samples, 50)
  }
  if (count(o.retry_at) > 0) trace.retry_at = count(o.retry_at)
  if (count(o.omitted) > 0) trace.omitted = count(o.omitted)
  const guard = availabilitySamples(o.guard, 10)
  if (guard.length) trace.guard = guard
  return trace
}

/** Badge tone of a trace outcome. */
export function availabilityOutcomeTone(outcome: string): 'danger' | 'warning' | 'info' | 'gray' {
  return outcome === 'blocked_all' ? 'danger' : outcome === 'partial' ? 'warning' : outcome === 'fail_open' ? 'info' : 'gray'
}

type OptionalT = (key: string, params?: Record<string, unknown>, fallback?: string) => string

/** A plugin's own reason: "quota_rejected:7d_fable" -> "Quota window 7d_fable exhausted"; unknown ones as they are. */
function pluginReasonLabel(tr: OptionalT, reason: string): string {
  const i = reason.indexOf(':')
  const code = i < 0 ? reason : reason.slice(0, i)
  const arg = i < 0 ? '' : reason.slice(i + 1)
  // quota_rejected names its window; the others carry no argument.
  if (code === 'quota_rejected') return arg ? tr('usage.availability.pluginReasons.quota_rejected', { window: arg }, reason) : reason
  return arg ? reason : tr(`usage.availability.pluginReasons.${code}`, undefined, reason)
}

/** Text of an availability reason code. The part after the first ':' is the plugin's reason
 *  ("unavailable:quota_rejected:7d_fable"); codes the console does not know show as recorded.
 *  tr is useOptionalT(). */
export function availabilityReasonLabel(tr: OptionalT, reason: string): string {
  const i = reason.indexOf(':')
  const code = i < 0 ? reason : reason.slice(0, i)
  const detail = i < 0 ? '' : reason.slice(i + 1)
  const label = tr(`usage.availability.reasons.${code}`, undefined, '')
  if (!label) return pluginReasonLabel(tr, reason)
  return detail ? tr('usage.availability.reasonWithDetail', { reason: label, detail: pluginReasonLabel(tr, detail) }) : label
}

/** True when the core converted the request to another upstream protocol. */
export function isConverted(u: Pick<UsageLog, 'protocol' | 'upstream_protocol'>): boolean {
  return !!u.upstream_protocol && !!u.protocol && u.upstream_protocol !== u.protocol
}

/** The recorded grade of a converted or locally estimated request; '' when native or not recorded. */
export function convertedGrade(u: Pick<UsageLog, 'conversion'>): string {
  const g = u.conversion?.grade
  return isConvertedGrade(g) ? g : ''
}

export type SpeedTone = 'success' | 'warning' | 'danger'

/** Colour of a first-token latency: under 5 s fine, under 10 s slow. */
export function firstTokenTone(ms: number): SpeedTone {
  return ms < 5000 ? 'success' : ms < 10000 ? 'warning' : 'danger'
}

/** The upload time worth showing (from 0.1 s): the body's arrival, part of the first token. */
export const shownUploadMs = (u: Pick<UsageLog, 'upload_ms'>) => ((u.upload_ms || 0) >= 100 ? u.upload_ms! : 0)

/** Output tokens per second, timed from the first token on a stream; null without output. */
export function tokensPerSecond(u: Pick<UsageLog, 'output_tokens' | 'latency_ms' | 'first_token_ms' | 'stream'>): number | null {
  const out = u.output_tokens || 0
  let ms = u.latency_ms || 0
  // A stream's first token waits on the prompt; the rest is generation.
  if (u.stream && u.first_token_ms && ms - u.first_token_ms >= 1000) ms -= u.first_token_ms
  return out > 0 && ms > 0 ? (out * 1000) / ms : null
}

/** Colour of a total latency: by throughput once there is enough output, else by duration. */
export function latencyTone(u: Pick<UsageLog, 'output_tokens' | 'latency_ms'>): SpeedTone {
  const s = (u.latency_ms || 0) / 1000
  if ((u.output_tokens || 0) < 100 || s <= 0) return s < 10 ? 'success' : s < 30 ? 'warning' : 'danger'
  const tps = (u.output_tokens || 0) / s
  return tps >= 30 ? 'success' : tps >= 15 ? 'warning' : 'danger'
}

const HASH_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-fuchsia-500', 'bg-lime-600']

/** A fill colour picked by the text, stable across renders (user avatars). */
export function hashColor(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return HASH_COLORS[Math.abs(h) % HASH_COLORS.length]
}

export function billingTone(s: string): 'success' | 'warning' | 'danger' | 'gray' {
  if (s === 'billed') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'failed') return 'danger'
  return 'gray'
}

const BLOCK_DECISIONS = ['deny', 'reject', 'block', 'blocked']

/** A free-form fact value as text: '—' when missing, JSON for objects. */
export function factText(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** Badge tone of a hook decision. */
export function hookTone(decision: string): 'danger' | 'success' | 'gray' {
  if (BLOCK_DECISIONS.includes(decision)) return 'danger'
  return decision === 'allow' ? 'success' : 'gray'
}

/** True when a gateway hook rejected the request. */
export function isBlocked(u: UsageRow): boolean {
  if (/hook|blocked/i.test(u.error_type || '')) return true
  return (u.hook_decisions || []).some((h) => BLOCK_DECISIONS.includes(h.decision))
}

/** The blocking hook decision (plugin + note), if any. */
export function blockingHook(u: UsageRow) {
  return (u.hook_decisions || []).find((h) => BLOCK_DECISIONS.includes(h.decision)) || null
}

/** A failed request's error as one string, like new-api's log content:
 *  "status_code=503, <message>"; the hook note or error type when there is no
 *  message. Empty for successes. */
export function errorText(u: UsageRow): string {
  if (u.success) return ''
  const message = u.error_message || blockingHook(u)?.note || u.error_type || ''
  if (!u.status_code) return message
  return message ? `status_code=${u.status_code}, ${message}` : `status_code=${u.status_code}`
}

