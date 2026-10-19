import type { UsageLog, UsageSummaryRow } from '@/api/types'

/** Usage row/detail with the extra fields the billing module returns. */
export type UsageRow = UsageLog & {
  api_key_name?: string
  user_name?: string
  price?: { id: number; model: string; source: string } | null
  metrics?: Record<string, unknown> | null
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

/** True when the core converted the request to another upstream protocol. */
export function isConverted(u: Pick<UsageLog, 'protocol' | 'upstream_protocol'>): boolean {
  return !!u.upstream_protocol && !!u.protocol && u.upstream_protocol !== u.protocol
}

export type SpeedTone = 'success' | 'warning' | 'danger'

/** Colour of a first-token latency: under 5 s fine, under 10 s slow. */
export function firstTokenTone(ms: number): SpeedTone {
  return ms < 5000 ? 'success' : ms < 10000 ? 'warning' : 'danger'
}

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

/** A fill colour picked by the text, stable across renders (model dots, user avatars). */
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

/** Chart option over per-day summary rows: requests (bars) + cost (line). */
export function dailyChartOption(rows: UsageSummaryRow[], labels: { requests: string; cost: string }) {
  const points = [...rows].sort((a, b) => a.key.localeCompare(b.key)).map((r) => ({ key: r.key, requests: Number(r.requests) || 0, cost: Number(r.total_cost) || 0 }))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: [labels.requests, labels.cost], top: 0 },
    grid: { left: 48, right: 56, top: 32, bottom: 28 },
    xAxis: { type: 'category', data: points.map((p) => p.key.slice(5)) },
    yAxis: [
      { type: 'value', minInterval: 1 },
      { type: 'value', axisLabel: { formatter: (v: number) => '$' + v }, splitLine: { show: false } }
    ],
    series: [
      { name: labels.requests, type: 'bar', data: points.map((p) => p.requests), barMaxWidth: 24 },
      { name: labels.cost, type: 'line', yAxisIndex: 1, smooth: true, data: points.map((p) => Number(p.cost.toFixed(6))) }
    ]
  }
}
