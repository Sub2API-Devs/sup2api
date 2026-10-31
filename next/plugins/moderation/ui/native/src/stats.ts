import { useModHost } from './host'
import type { CostSummary, Trend, VerdictCounts, Watch, WatchLevel, Runtime, Mode } from './host'

// P3 statistics, watch list and settings API (CONTRACTS §72.14). Shapes
// follow new-api; times are RFC3339 UTC. Every statistics call passes the
// browser's time zone so "today" and day buckets match the user's day.

const api = () => useModHost().pluginApi

/** Minutes east of UTC of the browser. */
export const browserTZ = () => -new Date().getTimezoneOffset()

// ------------------------------------------------------------------ GET /status

export interface HealthRow {
  id: number
  audited: number
  calls: number
  hits: number
  errors: number
  error_rate: number
  hit_rate: number
  flagged: boolean
  skipped_no_text?: number
}

export interface FunnelStage {
  stage: number
  received: number
  hit: number
  passed: number
}

export interface Funnel {
  flow_id: number
  name: string
  stages: FunnelStage[]
  suspicious: number
  blocked: number
}

export interface CostRef {
  id: number
  cost: CostSummary
}

export interface Status {
  mode: Mode
  enabled: boolean
  error_rate_alert_percent: number
  runtime: Runtime
  status_line: { enabled_flows: number; bound_groups: number[]; stale_groups: number[]; disabled_channels: number; analysis_channel: boolean }
  today: {
    audited: number
    suspicious: number
    blocked: number
    overturned: number
    errors: number
    cache_skipped: number
    auditor_calls: number
    tokens_in: number
    tokens_out: number
    analyses: number
    analyses_failed: number
    analysis_tokens_in: number
    analysis_tokens_out: number
  }
  ai_review: { reviewed: number; violation: number; false_positive: number; unsure: number }
  watch: { watching: number; watching_with_new: number; blocking: number; analysis_every_violations: number }
  attention: Array<{ user_id: number; level: WatchLevel; hits_since_seen: number; hit_count: number; last_hit_at: string | null; latest_trend: Trend | '' }>
  auditors: HealthRow[]
  channels: HealthRow[]
  funnels: Funnel[]
  queue: {
    post_queue: number
    post_queue_cap: number
    dropped_post_full: number
    price_queue: number
    price_queue_cap: number
    dropped_costs: number
    analysis_pending: number
    analysis_running: number
    analysis_concurrency: number
  }
  costs: { total: CostSummary; audit: CostSummary; analysis: CostSummary; manual: CostSummary; channels: CostRef[]; auditors: CostRef[] }
}

export const fetchStatus = () => api().get<Status>('/status', { tz: browserTZ() })

// ------------------------------------------------------------------ trends

export type Granularity = 'hour' | 'day'

export interface StatsQuery {
  granularity?: Granularity
  from?: string
  to?: string
  flow_id?: number
  group_id?: number
}

export interface FlowPoint {
  ts: string
  audited: number
  cache_skipped: number
  hit: number
  blocked: number
  overturned: number
  errors: number
  suspicious_rate: number
  pre_avg_ms: number
  pre_p95_ms: number
  post_avg_ms: number
  post_p95_ms: number
}

export interface TrendResult {
  granularity: Granularity
  from: string
  to: string
  flows: Array<{ flow_id: number; name: string; points: FlowPoint[] }>
  auditors: Array<{ flow_id: number; stage: number; auditor_id: number; points: Array<{ ts: string; audited: number; hit: number; errors: number; hit_rate: number; error_rate: number }> }>
}

export interface LatencySummary {
  count: number
  avg_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  /** 9 buckets: ≤50, 100, 200, 500, 1000, 2000, 5000, 10000 ms, more */
  buckets: number[]
}

export interface PerformanceResult {
  granularity: Granularity
  from: string
  to: string
  summary: LatencySummary
  points: Array<LatencySummary & { ts: string }>
  auditors: Array<LatencySummary & { auditor_id: number }>
}

export interface CategoryStats {
  suspicious_requests: number
  category_hits: number
  truncated: boolean
  items: Array<{ category: string; count: number }>
}

/** Upper bounds (ms) of the first 8 latency buckets. */
export const LATENCY_BOUNDS = [50, 100, 200, 500, 1000, 2000, 5000, 10000]

const withTZ = (q: StatsQuery) => ({ ...q, tz: browserTZ() })
export const fetchTrend = (q: StatsQuery) => api().get<TrendResult>('/stats/trend', withTZ(q))
export const fetchPerformance = (q: StatsQuery) => api().get<PerformanceResult>('/stats/performance', withTZ(q))
export const fetchCategoryStats = () => api().get<CategoryStats>('/stats/categories', { tz: browserTZ() })

// ------------------------------------------------------------------ list figures

export interface ChannelHealth {
  calls_1h: number
  error_rate_1h: number
  tokens_today: number
  cost_1h: CostSummary
  cost_today: CostSummary
  cost_today_sources: Record<string, CostSummary>
}

// ------------------------------------------------------------------ watch list

export type WatchSort = 'new' | 'last_hit' | 'severity' | 'total'

export interface WatchQuery {
  level?: WatchLevel
  with_new?: boolean
  trend?: Trend | 'none'
  category?: string
  q?: string
  sort?: WatchSort
  page?: number
  page_size?: number
}

export interface WatchItem extends Watch {
  suspicious_total: number
  severity: { high: number; medium: number; low: number }
  top_categories: Array<{ category: string; count: number }>
  other_categories: number
  groups: number[]
  ai_counts: VerdictCounts | null
}

export const fetchWatchList = (q: WatchQuery) =>
  api().list<WatchItem>('/watchlist', { ...q, with_new: q.with_new ? 1 : undefined })

// ------------------------------------------------------------------ settings

/**
 * Plugin settings through the core (GET/PUT /plugins/moderation/settings;
 * writing needs plugin:manage). saveSettings changes only the given keys and
 * sends every other value back as it was.
 */
export async function fetchSettings(): Promise<Record<string, unknown>> {
  const h = useModHost()
  const r = await h.api.get<{ values: Record<string, unknown> }>(`/plugins/${encodeURIComponent(h.plugin.key)}/settings`)
  return r.values || {}
}

export async function saveSettings(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const h = useModHost()
  const values = { ...(await fetchSettings()), ...patch }
  await h.api.put(`/plugins/${encodeURIComponent(h.plugin.key)}/settings`, { values })
  return values
}
