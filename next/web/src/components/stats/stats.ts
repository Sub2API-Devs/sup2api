// Statistics helpers shared by the dashboard and the usage pages (design:
// docs/USAGE-STATS-AND-USER-CONSOLE-DESIGN.md §5). Colors are the validated
// categorical palette of §5.1, stepped separately for the dark surface;
// series colors follow the entity (a model keeps its color in every chart),
// never its rank. Buckets are calendar days / hours in the browser's time
// zone, which is what the summary is asked for (tz=).
import type { UsageSummaryRow } from '@/api/types'

export type Granularity = 'day' | 'hour'

const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
}
const OTHER = { light: '#94a3b8', dark: '#64748b' }
const STATUS = { ok: { light: '#059669', dark: '#34d399' }, bad: { light: '#dc2626', dark: '#f87171' } }
const SURFACE = { light: '#ffffff', dark: '#0f172a' }

type Mode = 'light' | 'dark'
const mode = (dark: boolean): Mode => (dark ? 'dark' : 'light')

/** Categorical slot i (0-based) of the palette. */
export function seriesColor(i: number, dark: boolean): string {
  return SERIES[mode(dark)][i % 8]
}
export const otherColor = (dark: boolean) => OTHER[mode(dark)]
export const statusColor = (s: 'ok' | 'bad', dark: boolean) => STATUS[s][mode(dark)]
export const surfaceColor = (dark: boolean) => SURFACE[mode(dark)]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Colors for a set of entities: each takes the slot its name hashes to, or
 * the next free one. Keys are placed in name order, so the assignment does
 * not depend on their rank and a filter that drops one does not repaint the
 * others unless they had collided with it.
 */
export function entityColors(keys: string[], dark: boolean): Map<string, string> {
  const out = new Map<string, string>()
  const used = new Set<number>()
  for (const k of [...new Set(keys)].sort()) {
    let slot = hash(k) % 8
    for (let n = 0; n < 8 && used.has(slot); n++) slot = (slot + 1) % 8
    used.add(slot)
    out.set(k, SERIES[mode(dark)][slot])
  }
  return out
}

/** The browser's IANA time zone, sent as tz= so the server's buckets match ours. */
export function browserTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const p2 = (x: number) => String(x).padStart(2, '0')
/** The summary's key of the bucket holding d (local time). */
export function bucketKey(d: Date, g: Granularity): string {
  const day = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  return g === 'day' ? day : `${day} ${p2(d.getHours())}:00`
}

/** Hours up to a day, days beyond (the summary refuses hours over 31 days). */
export function autoGranularity(from: string, to: string): Granularity {
  if (!from) return 'day'
  const span = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()
  return span <= 24 * 3600_000 + 60_000 ? 'hour' : 'day'
}

/** Whether hourly buckets are allowed for the range (≤ 31 days). */
export function hourAllowed(from: string, to: string): boolean {
  if (!from) return false
  return (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime() <= 31 * 24 * 3600_000
}

/**
 * Every bucket of [from, to) in order, so a quiet day shows as zero instead
 * of disappearing from the axis. Without a lower bound, the buckets the rows
 * have.
 */
export function bucketKeys(from: string, to: string, g: Granularity, rows: UsageSummaryRow[] = []): string[] {
  if (!from) return [...new Set(rows.map((r) => r.key))].sort()
  const end = to ? new Date(to) : new Date()
  const d = new Date(from)
  if (g === 'day') d.setHours(0, 0, 0, 0)
  else d.setMinutes(0, 0, 0)
  const keys: string[] = []
  while (d < end && keys.length < 800) {
    keys.push(bucketKey(d, g))
    if (g === 'day') d.setDate(d.getDate() + 1)
    else d.setHours(d.getHours() + 1)
  }
  return keys
}

/** Axis label of a bucket key: MM-DD for days; HH:00, or MM-DD HH:00 across days. */
export function bucketLabel(key: string, g: Granularity, multiDay: boolean): string {
  if (g === 'day') return key.slice(5)
  return multiDay ? key.slice(5) : key.slice(11)
}

export const num = (v: unknown) => Number(v) || 0

/** Tokens of a row: input + output + cache read + cache write. */
// A usage record reports the 1-hour cache writes apart; a summary row has them in cache_creation_tokens.
type TokenCounts = { input_tokens?: number; output_tokens?: number; cache_read_tokens?: number; cache_creation_tokens?: number; cache_creation_1h_tokens?: number }
export function rowTokens(r: TokenCounts): number {
  return num(r.input_tokens) + num(r.output_tokens) + num(r.cache_read_tokens) + num(r.cache_creation_tokens) + num(r.cache_creation_1h_tokens)
}

/** Cache read ÷ the whole prompt (prompt_tokens counts cached input once); null when unknown. */
export function hitRate(r: Partial<UsageSummaryRow> | undefined): number | null {
  if (!r || r.prompt_tokens == null || !num(r.prompt_tokens)) return null
  return num(r.cache_read_tokens) / num(r.prompt_tokens)
}

/** "850 ms", "1.8 s", "2 m 05 s". */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)} m ${p2(s % 60)} s`
}

/** 1234 -> 1.2K, 3_200_000 -> 3.20M, 4.1e9 -> 4.10B. */
export function formatTokens(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(Math.round(n))
}

/** Money on an axis or in a tooltip: fewer decimals for larger amounts. */
export function formatCostShort(v: number): string {
  const a = Math.abs(v)
  if (a >= 1000) return '$' + (v / 1000).toFixed(1) + 'K'
  if (a >= 1) return '$' + v.toFixed(2)
  if (a >= 0.01) return '$' + v.toFixed(3)
  return '$' + v.toFixed(a ? 4 : 0)
}

/** The top n rows by `metric`, the rest folded into one "other" row (key ''). */
export function topWithOther(rows: UsageSummaryRow[], metric: (r: UsageSummaryRow) => number, n = 7): { top: UsageSummaryRow[]; other: UsageSummaryRow | null; otherCount: number } {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a))
  const top = sorted.slice(0, n)
  const rest = sorted.slice(n)
  if (!rest.length) return { top, other: null, otherCount: 0 }
  const other: UsageSummaryRow = { key: '', requests: 0, success: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0, total_cost: '0' }
  let cost = 0
  for (const r of rest) {
    other.requests += num(r.requests)
    other.success = num(other.success) + num(r.success)
    other.input_tokens = num(other.input_tokens) + num(r.input_tokens)
    other.output_tokens = num(other.output_tokens) + num(r.output_tokens)
    other.cache_read_tokens = num(other.cache_read_tokens) + num(r.cache_read_tokens)
    other.cache_creation_tokens = num(other.cache_creation_tokens) + num(r.cache_creation_tokens)
    cost += num(r.total_cost)
  }
  other.total_cost = String(cost)
  return { top, other, otherCount: rest.length }
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
/** Text for an echarts tooltip formatter, which renders HTML: model names come from clients. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}
