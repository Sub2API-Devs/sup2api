import { requestRaw, type ApiClient, type ListResult, type PluginHost, type Query } from '@sub2api/host'
import type { Tone } from '@sub2api/ui'

// Plugin-scoped host handed to register(); shared by all moderation components.
// All API shapes (CONTRACTS §72.11) live in this file so they are easy to adjust.
let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useModHost(): PluginHost {
  if (!host) throw new Error('moderation UI used before register(host)')
  return host
}

/** Manifest userPermission (host.can prefixes it with plugin.moderation:). */
export function canManage(): boolean {
  return useModHost().can('moderation:manage')
}

export function canManageSettings(): boolean {
  const h = useModHost()
  return h.permissions.superuser() || h.permissions.has('plugin:manage')
}

// ------------------------------------------------------------------ types

export type Mode = 'off' | 'observe' | 'enforce'
export type Result = 'block' | 'hit' | 'overturned' | 'error' | 'pass'
export type ReviewStatus = 'pending' | 'false_positive' | 'confirmed'
export type WatchLevel = 'observe' | 'enforce'
export type ChannelType = 'openai_moderation' | 'typesafe' | 'llm'
export type AuditorType = 'openai_moderation' | 'typesafe' | 'llm_verdict'

/** Runtime state of the node that served the request. */
export interface Runtime {
  mode: Mode
  /** a flow is bound to a group */
  configured: boolean
  config_version: number
  flows: number
  auditors: number
  queue_len: number
  queue_cap: number
  dropped: number
  inflight: number
  calls: number
  errors: number
  cache_hits: number
  cache_entries: number
  avg_latency_ms: number
  blocked_users: number
  watched_users: number
  /** P2 (§72.13.4); absent on 0.2 */
  analysis?: { channel_configured: boolean; pending: number; running: number }
}

/** Row of GET /events (no `text`, has `text_excerpt`). */
export interface ModEvent {
  id: number
  created_at: string
  request_id: string
  user_id: number
  api_key_id: number
  group_id: number
  model: string
  protocol: string
  mode: string
  timing: 'pre' | 'post' | ''
  result: Result | ''
  flow_id: number
  flow_version: number
  severity: string
  hit_categories: string[]
  highest_category: string
  highest_score: number
  review_status: ReviewStatus
  reviewed_by: number | null
  reviewed_at: string | null
  counted: boolean
  input_format: string
  text_chars: number
  image_count: number
  input_message_size: number
  latency_ms: number
  queue_ms: number
  keep_until: string | null
  /** 0.1 records only */
  verdict: string
  reason: string
  error: string
  llm_model: string
  text_excerpt?: string
  /** per-stage trace (list and detail; null on 0.1 records) */
  trace?: Trace | null
  /** P2 AI verdict (§72.13.4); empty / absent until an analysis reviewed the record */
  ai_verdict?: AIVerdict | '' | null
  ai_severity?: string | null
  ai_category?: string | null
  ai_evidence?: string | null
  ai_reason?: string | null
  ai_analysis_id?: number | null
}

export interface HitCategory {
  category: string
  label?: string
  score: number
  threshold: number
  stage?: number
  auditor?: number
}

export interface Outcome {
  auditor_id: number
  channel_id?: number
  scores?: Record<string, number>
  usage?: { input_tokens?: number; output_tokens?: number }
  model?: string
  rules_version?: string
  sent_images?: number
  skipped_images?: number
  reason?: string
  calls: number
  hit: boolean
  top_category?: string
  top_score: number
  hits?: HitCategory[]
  latency_ms: number
  skipped?: boolean
  err?: string
  status?: number
}

export interface StageTrace {
  outcomes: Outcome[] | null
  result: 'hit' | 'pass' | 'skipped'
  errored?: boolean
  skipped?: boolean
}

export interface Trace {
  stages: StageTrace[] | null
  final: 'hit' | 'pass'
  decider: number
  overturned?: boolean
  errored?: boolean
  skipped?: boolean
  truncated_run?: boolean
  /** the input message was not stored ("save_failed") */
  input_message_dropped?: string
  latency_ms: number
}

/** Another record of the same request (GET /events/:id related[]). */
export interface RelatedEvent {
  id: number
  created_at: string
  timing: ModEvent['timing']
  result: Result | ''
  flow_id: number
  flow_version: number
  severity: string
}

/** The record user's moderation state now. */
export interface UserState {
  watch: Watch | null
  exempt: boolean
  staff: boolean
  blocked: boolean
  blocked_until: string | null
}

/** GET /events/:id */
export interface ModEventDetail extends ModEvent {
  text: string | null
  trace: Trace | null
  flow_name?: string
  flow_current_version?: number
  flow_snapshot?: FlowVersionDetail | null
  related?: RelatedEvent[]
  user_state?: UserState
  /** full text of the saved input message */
  input_text?: string
  ai_analyzed_at?: string | null
}

/** One segment of the saved input message (GET /events/:id/input parts[]). */
export interface InputPart {
  role?: string
  type: 'text' | 'image'
  text?: string
  src?: string
  kind?: string
  mime?: string
}

export interface EventInput {
  id: number
  format: string
  messages: unknown
  parts: InputPart[] | null
}

export interface Block {
  user_id: number
  reason?: string
  violations?: number
  source: 'auto' | 'manual' | string
  created_at: string
  expires_at?: string | null
  created_by?: number | null
}

export interface Watch {
  user_id: number
  level: WatchLevel
  source: 'auto' | 'manual' | 'analysis' | string
  since_at: string
  expires_at: string | null
  hit_count: number
  violation_count: number
  last_hit_at: string | null
  /** suspicious records since an administrator last opened the entry */
  hits_since_seen?: number
  note: string
  updated_at: string
  /** P2 analysis queue and latest result (§72.13.4) */
  analysis_requested_at?: string | null
  analysis_source?: 'auto' | 'manual' | '' | null
  /** a node holds a live claim on the queued analysis */
  analysis_running?: boolean
  latest_analysis_id?: number | null
  latest_analysis_status?: AnalysisStatus | '' | null
  latest_trend?: Trend | '' | null
  latest_suggestion?: Suggestion | '' | null
  analyzed_at?: string | null
}

export interface SeverityCounts {
  high: number
  medium: number
  low: number
}

/** Row of GET /watchlist: the entry plus aggregates of the user's suspicious records. */
export interface WatchItem extends Watch {
  /** group of the latest record; 0 when none in the last 30 days */
  group_id: number
  other_groups: number[]
  /** flow bound to group_id now */
  flow: { flow_id: number; name?: string; version: number } | null
  suspicious_total: number
  by_severity: SeverityCounts
  top_categories: Array<{ category: string; count: number }>
  top_other: number
  /** verdict counts of the latest successful analysis */
  ai_counts: VerdictCounts | null
}

export interface WatchCounts {
  watching: number
  watching_with_new: number
  blocking: number
}

/** Envelope members of GET /watchlist besides data and page. */
export interface WatchListMeta {
  counts: WatchCounts
  analysis_every_violations: number
}

export interface WatchEvent {
  id: number
  user_id: number
  action: string
  from_level: string
  to_level: string
  reason: string
  operator_id: number | null
  analysis_id?: number | null
  created_at: string
}

/** Suspicious records by AI verdict (none = not analysed yet). */
export interface AIVerdictCounts {
  violation: number
  false_positive: number
  unsure: number
  none: number
}

/** All suspicious records of a user. */
export interface UserSummary {
  total: number
  pending: number
  confirmed: number
  false_positive: number
  by_severity: SeverityCounts
  ai_verdicts: AIVerdictCounts
}

/** One "group → flow@version" the user's suspicious records of the last 30 days came through. */
export interface ContextSource {
  group_id: number
  flow_id: number
  flow_name: string
  version: number
  count: number
  ai_verdicts: AIVerdictCounts
  /** the group's flow version now */
  current: boolean
}

/** One user_daily row (day is a UTC date, YYYY-MM-DD). */
export interface UserDay {
  day: string
  group_id: number
  audited: number
  suspicious: number
  high: number
  errors: number
  last_hit_at: string | null
}

/** GET /users/:user_id: the user detail drawer, for any user id. */
export interface UserDetail extends UserState {
  user_id: number
  summary: UserSummary
  context: {
    /** group of the latest record; null when the user has none */
    group_id: number | null
    flow: FlowRef | null
    sources: ContextSource[]
  }
  /** last 30 UTC days */
  daily: UserDay[]
  latest_analysis: Analysis | null
  analysis: { running: boolean; queued: boolean; violations_since_analysis: number; every: number }
}

export type Protocol = 'openai_chat' | 'openai_responses' | 'anthropic'

/** Cost summary of a set of calls (§72.13.3); cost is a decimal USD string. */
export interface CostSummary {
  cost: string
  calls: number
  priced_calls: number
  unpriced_calls: number
  unpriced_tokens: number
  free_calls: number
  tokens_in: number
  tokens_out: number
}

export interface PriceState {
  priced: boolean
  free: boolean
  reason?: string
  billing_model?: string
}

export interface Channel {
  id: number
  type: ChannelType
  protocol: string
  name: string
  base_url: string
  api_key_tail: string
  has_key: boolean
  has_proxy: boolean
  model: string
  /** P2: model name used for pricing; empty = model */
  billing_model?: string
  price_state?: PriceState | null
  cost_30d?: CostSummary | null
  timeout_ms: number
  enabled: boolean
  /** proxy URL with the password redacted; '' = none */
  proxy?: string
  stats?: ChannelStats | null
  used_by?: Array<{ id: number; name: string }>
  /** the AI analysis channel */
  analysis?: boolean
  created_at: string
  updated_at: string
}

/** Last-hour health and today's cost of a channel (GET /channels stats). */
export interface ChannelStats {
  calls_1h: number
  errors_1h: number
  /** 0–1 */
  error_rate_1h: number
  tokens_today: number
  cost_1h: CostSummary
  cost_today: CostSummary
  cost_today_sources: Record<string, CostSummary>
}

export type CostSource = 'audit' | 'analysis' | 'test' | 'try' | 'simulate'

export interface Costs {
  range: string
  from: string
  to: string
  bucket: string
  totals: CostSummary
  by_channel: Array<{ channel_id: number; name: string; type: ChannelType; model: string; billing_model?: string; deleted?: boolean; summary: CostSummary }>
  by_source: Array<{ source: CostSource | string; summary: CostSummary }>
  trend: Array<{ bucket: string; cost: string }>
}

// ---- statistics (§72.14): GET /status and /stats/*

export type Granularity = 'hour' | 'day'

export interface TodayCounts {
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

export interface AIReviewCounts {
  reviewed: number
  violation: number
  false_positive: number
  unsure: number
}

/** Last-hour health of an auditor or a channel; rates are 0–1. */
export interface HealthRow {
  id: number
  audited: number
  calls: number
  hits: number
  errors: number
  error_rate: number
  hit_rate: number
  /** enough samples and the error rate is above the alert threshold */
  flagged: boolean
  skipped_no_text: number
}

export interface Funnel {
  flow_id: number
  name: string
  stages: Array<{ stage: number; received: number; hit: number; passed: number }>
  suspicious: number
  blocked: number
}

export interface QueueStatus {
  name: string
  length: number
  capacity: number
  dropped: number
}

export interface CostRef {
  id: number
  cost: CostSummary
}

export interface Status {
  enabled: boolean
  running: boolean
  mode: Mode
  error_rate_alert_percent: number
  today: TodayCounts
  today_from: string
  ai_review: AIReviewCounts
  watch: WatchCounts
  auditors: HealthRow[]
  channels: HealthRow[]
  funnels: Funnel[]
  queue: QueueStatus[]
  costs: { total: CostSummary; audit: CostSummary; analysis: CostSummary; manual: CostSummary; channels: CostRef[]; auditors: CostRef[] }
  runtime: Runtime
}

export interface FlowPoint {
  ts: string
  audited: number
  cache_skipped: number
  hit: number
  blocked: number
  overturned: number
  errors: number
  /** 0–1 */
  suspicious_rate: number
  pre_avg_ms: number
  pre_p95_ms: number
  post_avg_ms: number
  post_p95_ms: number
}

export interface AuditorPoint {
  ts: string
  audited: number
  hit: number
  errors: number
  hit_rate: number
  error_rate: number
}

export interface TrendResult {
  granularity: Granularity
  from: string
  to: string
  error_rate_alert_percent: number
  flows: Array<{ flow_id: number; name: string; points: FlowPoint[] }>
  auditors: Array<{ flow_id: number; stage: number; auditor_id: number; points: AuditorPoint[] }>
}

/** Latency distribution; quantiles approximate the 9 buckets (≤50 … >10000 ms). */
export interface LatencySummary {
  count: number
  avg_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
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
  from: string
  suspicious_requests: number
  category_hits: number
  truncated: boolean
  items: Array<{ category: string; count: number }>
}

export interface StatsQuery {
  granularity?: Granularity
  flow_id?: number | ''
  group_id?: number | ''
}

// ---- AI analysis (§72.13.4)

export type AIVerdict = 'violation' | 'false_positive' | 'unsure'
export type Trend = 'occasional' | 'persistent' | 'escalating' | 'likely_false_positive'
export type Suggestion = 'release' | 'observe' | 'block'
export type AnalysisStatus = 'ok' | 'failed' | 'stale'

export interface VerdictCounts {
  violation: number
  false_positive: number
  unsure: number
  high?: number
  medium?: number
  low?: number
}

export interface RecordVerdict {
  record_id: number
  verdict: AIVerdict
  severity?: string
  category?: string
  evidence?: string
  reason?: string
}

export interface FlowRef {
  flow_id: number
  name?: string
  version: number
  via?: string
  historical?: boolean
  deleted?: boolean
}

export interface AnalysisStep {
  step: number
  tool?: string
  /** argument digest */
  args?: string
  latency_ms: number
  tokens_in?: number
  tokens_out?: number
  result_bytes?: number
  truncated?: boolean
  error?: string
  notes?: Array<{ kind: string; record_id?: number }>
}

/** Row of GET /watchlist/:user_id/analyses (no trace, no record_verdicts). */
export interface Analysis {
  id: number
  user_id: number
  source: 'auto' | 'manual' | string
  status: AnalysisStatus | string
  error?: string
  trend?: Trend | ''
  suggestion?: Suggestion | ''
  summary?: string
  main_problems?: string[] | null
  verdict_counts?: VerdictCounts | null
  flows_seen?: FlowRef[] | null
  model?: string
  steps: number
  tokens_in: number
  tokens_out: number
  /** user_analyses.cost: USD decimal string; null when no call was priced */
  cost?: string | null
  unpriced_calls?: number
  duration_ms: number
  created_at: string
}

/** GET /analyses/:id */
export interface AnalysisDetail extends Analysis {
  record_verdicts?: RecordVerdict[] | null
  trace?: AnalysisStep[] | null
}

export interface CategoryDef {
  category: string
  name?: string
  source?: string
  stage?: number
  auditor?: string
  from?: string
  definition?: string
}

export interface AnalysisPrompt {
  group_id?: number
  flow: FlowVersionDetail | null
  dict: CategoryDef[] | null
  prompt: string
  bytes?: number
}

export interface AnalysisTool {
  name: string
  purpose?: string
  args?: string
  returns?: string
  kind?: 'read' | 'end' | string
}

// ---- flow versions (§72.13.5)

export interface FlowVersionItem {
  version: number
  published_at: string
  published_by: number | null
  current: boolean
}

/** An auditor of a flow version as it ran (thresholds / questions / categories of the snapshot). */
export interface FlowVersionAuditor {
  auditor_id: number
  name: string
  type?: AuditorType | string
  channel_name?: string
  model?: string
  thresholds?: Record<string, number>
  questions?: JevQuestions | null
  categories?: Category[]
  deleted?: boolean
}

export interface FlowVersionStage {
  stage: number
  role?: string
  combine?: string
  n?: number
  auditors: FlowVersionAuditor[]
}

export interface FlowVersionDetail {
  flow_id: number
  name?: string
  version: number
  current: boolean
  current_version?: number
  historical?: boolean
  deleted?: boolean
  note?: string
  bound_groups?: number[]
  published_at?: string
  spec?: Spec
  stages?: FlowVersionStage[]
}

export interface Category {
  id: string
  description: string
}

export interface JevQuestion {
  category: string
  label?: string
  question: string
  answer_yes?: string
  answer_no?: string
  threshold: number
}

export interface JevQuestions {
  preamble: string
  items: JevQuestion[]
}

/** A question table as sent: thresholds edited as text become numbers. */
export const jevPayload = (q: JevQuestions): JevQuestions => ({ preamble: q.preamble, items: q.items.map((x) => ({ ...x, threshold: Number(x.threshold) })) })

export interface AuditorConfig {
  thresholds?: Record<string, number>
  questions?: JevQuestions | null
  review_images?: boolean | null
  system_prompt?: string
  categories?: Category[]
  tool_choice?: string
  max_turns?: number
  temperature?: number
  max_tokens?: number
  flag_as_hit?: boolean
}

export interface Auditor {
  id: number
  name: string
  type: AuditorType
  channel_id: number
  config: AuditorConfig
  rules_version?: string
  usable: boolean
  /** channel fields joined by the list (optional; the UI falls back to GET /channels) */
  channel_name?: string
  channel_enabled?: boolean
  channel_timeout_ms?: number
  channel_type?: string
  /** list only: today's calls and cost */
  today?: { calls: number; cost: CostSummary } | null
  created_at: string
  updated_at: string
}

export interface Stage {
  auditors: number[]
  combine: 'any' | 'all' | 'at_least'
  n?: number
}

export interface Spec {
  model_filter: { type: 'all' | 'only' | 'exclude'; models: string[] }
  sample_rate: number
  total_timeout_ms: number
  stages: Stage[]
}

export interface Flow {
  id: number
  name: string
  enabled: boolean
  draft: Spec
  published: Spec | null
  version: number
  published_at: string | null
  published_by: number | null
  groups: number[]
  /** the draft differs from the published spec */
  dirty: boolean
  /** same meaning as dirty (newer backends); dirty is the fallback */
  has_draft_changes?: boolean
  /** automatic total timeout of the draft: Σ of each stage's slowest channel timeout */
  stage_timeout_sum_ms?: number
  /** last 24 hours, summed over all nodes */
  stats_24h?: FlowStats24h | null
  created_at: string
  updated_at: string
}

export interface FlowStats24h {
  audited: number
  suspicious: number
  /** 0–1 */
  suspicious_rate: number
  pre_avg_ms: number
}

export interface GroupConflict {
  group_id: number
  flow_id: number
}

export interface Defaults {
  builtin: JevQuestions
  builtin_version: string
  default: JevQuestions
  default_version: string
  custom: boolean
  openai_categories: string[]
  openai_thresholds: Record<string, number>
  llm_system_prompt: string
  llm_categories: Category[]
}

export interface TestResult {
  flow_id: number
  flow_version: number
  result: Result
  severity?: string
  categories: HitCategory[]
  trace: Trace
  /** P2: price of all calls of this run; absent on 0.2 */
  cost?: CallCost | null
  /** simulation only: the timing it ran as and whether a request would have been refused */
  timing?: 'pre' | 'post'
  refused?: boolean
}

export interface TryResult extends Outcome {
  error?: string
  cost?: CallCost | null
}

export interface ChannelTestResult {
  ok: boolean
  status?: number
  error?: string
  message?: string
  model?: string
  /** the endpoint that was called */
  url?: string
  latency_ms: number
  cost?: CallCost | null
}

/** Price of one call or of the calls of one run (§72.13.3). */
export interface CallCost {
  mode: 'priced' | 'unpriced' | 'free' | string
  /** USD decimal string; empty when not priced */
  cost?: string
  reason?: string
  billing_model?: string
  tokens_in: number
  tokens_out: number
}

export interface Group {
  id: number
  name: string
}

// ------------------------------------------------------------------ API

const api = () => useModHost().pluginApi

export const fetchEvent = (id: number) => api().get<ModEventDetail>(`/events/${id}`)
export const fetchEventInput = (id: number) => api().get<EventInput>(`/events/${id}/input`)
export const deleteEvent = (id: number) => api().del(`/events/${id}`)
export const reviewEvents = (ids: number[], status: ReviewStatus) => api().post<{ updated: number }>('/events/review', { ids, status })

export async function fetchBlocks(): Promise<Block[]> {
  const r = await api().get<Block[] | null>('/blocks')
  return Array.isArray(r) ? r : []
}
export const createBlock = (body: { user_id: number; reason?: string; duration_hours?: number }) => api().post('/blocks', body)
export const deleteBlock = (userId: number) => api().del(`/blocks/${userId}`)

/**
 * Body of POST / PATCH /watchlist. expires_at (RFC 3339, "" = never) wins over
 * days; reason goes to the history; analysis_id links the AI suggestion applied.
 */
export interface WatchChange {
  level?: WatchLevel
  days?: number
  expires_at?: string
  note?: string
  reason?: string
  analysis_id?: number
}
export const createWatch = (body: WatchChange & { user_id: number }) => api().post<Watch>('/watchlist', body)
export const updateWatch = (userId: number, body: WatchChange) => api().patch<Watch>(`/watchlist/${userId}`, body)
export const deleteWatch = (userId: number) => api().del(`/watchlist/${userId}`)
export const markWatchSeen = (userId: number) => api().post(`/watchlist/${userId}/seen`, {})
export const fetchWatchEvents = (userId: number) => api().get<WatchEvent[]>(`/watchlist/${userId}/events`)

export const fetchChannels = () => api().get<Channel[]>('/channels')
export const saveChannel = (id: number | null, body: Record<string, unknown>) =>
  id ? api().put<Channel>(`/channels/${id}`, body) : api().post<Channel>('/channels', body)
export const deleteChannel = (id: number) => api().del(`/channels/${id}`)
export const testChannel = (id: number) => api().post<ChannelTestResult>(`/channels/${id}/test`, {})

export const fetchAuditors = () => api().get<Auditor[]>('/auditors')
export const saveAuditor = (id: number | null, body: Record<string, unknown>) =>
  id ? api().put<Auditor>(`/auditors/${id}`, body) : api().post<Auditor>('/auditors', body)
export const deleteAuditor = (id: number) => api().del(`/auditors/${id}`)
/** Unsaved auditor fields tried instead of (or over) the stored ones. */
export interface AuditorDraft {
  name?: string
  type?: AuditorType
  channel_id?: number
  config?: AuditorConfig
}
/** Tries a stored auditor (id), optionally with unsaved edits, or an unsaved one (id null + draft). */
export const tryAuditor = (id: number | null, text: string, images: string[], draft?: AuditorDraft) =>
  api().post<TryResult>(id ? `/auditors/${id}/try` : '/auditors/try', { text, images, draft })
export const fetchDefaults = () => api().get<Defaults>('/jev/default-questions')

export const fetchFlows = () => api().get<Flow[]>('/flows')
export const fetchFlow = (id: number) => api().get<Flow>(`/flows/${id}`)
export const saveFlow = (id: number | null, body: { name: string; draft: Spec }) =>
  id ? api().put<Flow>(`/flows/${id}`, body) : api().post<Flow>('/flows', body)
export const deleteFlow = (id: number) => api().del(`/flows/${id}`)
export const setFlowGroups = (id: number, groups: number[], force = false) => api().put<Flow>(`/flows/${id}/groups`, { groups, force })
export const publishFlow = (id: number, expected: number) => api().post<Flow>(`/flows/${id}/publish`, { expected_version: expected })
export const setFlowEnabled = (id: number, enabled: boolean) => api().put<Flow>(`/flows/${id}/enabled`, { enabled })

export const runTest = (text: string, images: string[], flowId?: number) =>
  api().post<TestResult>('/test', { text, images, flow_id: flowId || undefined })

// ---- P2 (§72.13)

export const fetchCosts = (range: string) => api().get<Costs>('/costs', { range })

export const fetchUserDetail = (userId: number) => api().get<UserDetail>(`/users/${userId}`)
export const analyzeWatch = (userId: number) => api().post<Watch>(`/watchlist/${userId}/analyze`, {})
export const fetchWatchAnalyses = (userId: number, page = 1, pageSize = 10) =>
  api().list<Analysis>(`/watchlist/${userId}/analyses`, { page, page_size: pageSize })
export const fetchAnalysis = (id: number) => api().get<AnalysisDetail>(`/analyses/${id}`)
export const fetchAnalysisPrompt = (q: { group_id?: number; flow_id?: number }) => api().get<AnalysisPrompt>('/analysis/prompt', q)
export async function fetchAnalysisTools(): Promise<AnalysisTool[]> {
  const r = await api().get<AnalysisTool[] | { tools: AnalysisTool[] } | null>('/analysis/tools')
  return Array.isArray(r) ? r : r?.tools || []
}
export const fetchUserEvents = (userId: number, pageSize = 50) =>
  api().list<ModEvent>('/events', { user_id: userId, result: 'suspicious', page: 1, page_size: pageSize })

export const fetchFlowVersions = (id: number) => api().get<{ current_version: number; items: FlowVersionItem[] }>(`/flows/${id}/versions`)
export const fetchFlowVersion = (id: number, version: number) => api().get<FlowVersionDetail>(`/flows/${id}/versions/${version}`)
export const rollbackFlow = (id: number, version: number, expected: number) =>
  api().post<Flow>(`/flows/${id}/rollback`, { version, expected_version: expected })
export interface SimulateBody {
  text?: string
  images?: string[]
  event_id?: number
  source: 'draft' | 'published' | 'version'
  version?: number
  /** none / observe run after the request (post), enforce before it (pre: a hit refuses) */
  user_state?: SimUserState
}
export type SimUserState = 'none' | 'observe' | 'enforce'
export const simulateFlow = (id: number, body: SimulateBody) => api().post<TestResult>(`/flows/${id}/simulate`, body)

// ---- statistics; every call carries the caller's time zone so "today" is local.

/** tz_offset_minutes: minutes the browser is ahead of UTC. */
const withTz = <T extends object>(q?: T) => ({ ...q, tz_offset_minutes: -new Date().getTimezoneOffset() })

export const fetchStatus = () => api().get<Status>('/status', withTz())
export const fetchTrend = (q: StatsQuery) => api().get<TrendResult>('/stats/trend', withTz(q))
export const fetchPerformance = (q: StatsQuery) => api().get<PerformanceResult>('/stats/performance', withTz(q))
export const fetchCategoryStats = () => api().get<CategoryStats>('/stats/categories', withTz())

/** GET /watchlist with the envelope's counts and analysis_every_violations (ApiClient.list drops them). */
export async function fetchWatchList(query: Query): Promise<ListResult<WatchItem> & WatchListMeta> {
  const json = await requestRaw('GET', `/p/${encodeURIComponent(useModHost().plugin.key)}/watchlist`, { query })
  const items: WatchItem[] = Array.isArray(json?.data) ? json.data : []
  return {
    items,
    page: json?.page ?? { page: 1, page_size: items.length, total: items.length },
    paged: !!json?.page,
    counts: json?.counts ?? { watching: 0, watching_with_new: 0, blocking: 0 },
    analysis_every_violations: json?.analysis_every_violations ?? 0
  }
}

/** ApiClient for useList on GET /watchlist that also hands the envelope meta to onMeta. */
export function watchListClient(onMeta: (m: WatchListMeta) => void): ApiClient {
  return {
    ...api(),
    async list<T>(_path: string, query?: Query): Promise<ListResult<T>> {
      const r = await fetchWatchList(query ?? {})
      onMeta(r)
      return r as unknown as ListResult<T>
    }
  }
}

// ---- core API (host.api): users, groups and this plugin's settings

/** A console user as GET /users returns it (only the fields used here). */
export interface CoreUser {
  id: number
  email?: string
  display_name?: string
}
export const fetchCoreUser = (id: number) => useModHost().api.get<CoreUser>(`/users/${id}`)
export const searchCoreUsers = (q: string) => useModHost().api.list<CoreUser>('/users', { q, page_size: 50 })

/** GET /plugins/:key/settings; secret values come back masked and are kept when sent back masked. */
export interface PluginSettings {
  values: Record<string, unknown>
  /** keys whose stored value comes back as SETTINGS_MASK; sending the mask keeps it */
  secret_fields?: string[]
}
export const SETTINGS_MASK = '******'
const settingsApiPath = () => `/plugins/${encodeURIComponent(useModHost().plugin.key)}/settings`
export const fetchPluginSettings = () => useModHost().api.get<PluginSettings>(settingsApiPath())
export const savePluginSettings = (values: Record<string, unknown>) => useModHost().api.put<PluginSettings>(settingsApiPath(), { values })

/** Groups of the console (needs group:read); [] when not readable. */
export async function fetchGroups(): Promise<Group[]> {
  try {
    return (await useModHost().api.list<Group>('/groups', { page_size: 100 })).items
  } catch {
    return []
  }
}

// ------------------------------------------------------------------ helpers

/** Category label: LLM categories and OpenAI categories are translated, Jev labels come with the record. */
export function categoryLabel(id: string, label?: string): string {
  if (label) return label
  const h = useModHost()
  const key = `cat.${id.replace(/\//g, '_')}`
  const s = h.t(key)
  return s === `plugin.${h.plugin.key}.${key}` || s === key ? id : s
}

export function resultTone(v: string | undefined): Tone {
  switch (v) {
    case 'pass':
      return 'success'
    case 'hit':
      return 'warning'
    case 'block':
      return 'danger'
    case 'overturned':
      return 'info'
    default:
      return 'gray'
  }
}

export function modeTone(m: string | undefined): Tone {
  return m === 'enforce' ? 'danger' : m === 'observe' ? 'info' : 'gray'
}

export function levelTone(l: string | undefined): Tone {
  return l === 'enforce' ? 'danger' : 'warning'
}

export function severityTone(s: string | undefined): Tone {
  switch (s) {
    case 'critical':
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'gray'
  }
}

export function reviewTone(s: string | undefined): Tone {
  return s === 'false_positive' ? 'success' : s === 'confirmed' ? 'danger' : 'gray'
}

/** Translates an enum value with a fallback to the raw value. */
export function enumLabel(group: string, v: string | undefined | null): string {
  if (!v) return '—'
  const h = useModHost()
  const key = `${group}.${v}`
  const s = h.t(key)
  return s === `plugin.${h.plugin.key}.${key}` || s === key ? v : s
}

/** Human-readable message of a failed call (ApiError is an Error), else `fallback`. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

/** Draft differs from the published version (has_draft_changes, else dirty). */
export const hasDraftChanges = (f: Pick<Flow, 'dirty' | 'has_draft_changes'>) => f.has_draft_changes ?? f.dirty

/** Formats a score as 0.00. */
export const score = (v: number | undefined | null) => (v === undefined || v === null ? '—' : v.toFixed(2))

/** Path of the plugin's settings page in the console. */
export function settingsPath(): string {
  return `/plugins/${encodeURIComponent(useModHost().plugin.key)}?tab=settings`
}

/** USD amount of a decimal string; '—' when empty (not priced). */
export function money(v: string | number | null | undefined): string {
  return useModHost().i18n.formatMoney(v)
}

/**
 * Display of a call cost: priced → "$…", free → 免费, unpriced → 未定价 with
 * the reason as hint. A bare string is an amount; null = not priced.
 */
export function callCostText(c: CallCost | string | null | undefined): { text: string; tone: Tone; hint: string } {
  const h = useModHost()
  if (c === undefined) return { text: '', tone: 'gray', hint: '' }
  if (typeof c === 'string') return c ? { text: money(c), tone: 'gray', hint: '' } : { text: h.t('cost.notPriced'), tone: 'warning', hint: '' }
  if (!c || c.mode === 'unpriced' || (c.mode !== 'free' && !c.cost)) {
    return { text: h.t('cost.notPriced'), tone: 'warning', hint: c?.reason ? enumLabel('priceReason', c.reason) : '' }
  }
  if (c.mode === 'free') return { text: h.t('channels.free'), tone: 'gray', hint: '' }
  return { text: money(c.cost), tone: 'gray', hint: c.billing_model ? h.t('channels.pricedAs', { model: c.billing_model }) : '' }
}

/**
 * Final verdict of a record, computed only in the UI (§72.9): the human
 * review wins, else the AI verdict (unsure = needs review). null = no verdict
 * and nothing to review (a passing record nobody looked at).
 */
export interface FinalVerdict {
  key: 'violation' | 'false_positive' | 'needs_review' | 'none'
  by: 'human' | 'ai' | ''
  tone: Tone
}
export function finalVerdict(e: Pick<ModEvent, 'review_status' | 'ai_verdict' | 'result'>): FinalVerdict | null {
  if (e.review_status === 'confirmed') return { key: 'violation', by: 'human', tone: 'danger' }
  if (e.review_status === 'false_positive') return { key: 'false_positive', by: 'human', tone: 'success' }
  switch (e.ai_verdict) {
    case 'violation':
      return { key: 'violation', by: 'ai', tone: 'danger' }
    case 'false_positive':
      return { key: 'false_positive', by: 'ai', tone: 'success' }
    case 'unsure':
      return { key: 'needs_review', by: 'ai', tone: 'warning' }
  }
  return e.result === 'hit' || e.result === 'block' ? { key: 'none', by: '', tone: 'gray' } : null
}

export function aiVerdictTone(v: string | null | undefined): Tone {
  return v === 'violation' ? 'danger' : v === 'false_positive' ? 'success' : v === 'unsure' ? 'warning' : 'gray'
}

export function trendTone(v: string | null | undefined): Tone {
  switch (v) {
    case 'escalating':
      return 'danger'
    case 'persistent':
      return 'warning'
    case 'occasional':
      return 'info'
    case 'likely_false_positive':
      return 'success'
    default:
      return 'gray'
  }
}

export function suggestionTone(v: string | null | undefined): Tone {
  return v === 'block' ? 'danger' : v === 'observe' ? 'warning' : v === 'release' ? 'success' : 'gray'
}

/** Queue state of a watch entry: running (claimed), pending (queued) or idle. */
export function analysisState(w: Watch | null | undefined): 'idle' | 'pending' | 'running' {
  if (!w) return 'idle'
  if (w.analysis_running) return 'running'
  return w.analysis_requested_at ? 'pending' : 'idle'
}

/**
 * Watch history reason: system codes are translated ("record:<id>",
 * "trend:<trend>", "<denied action>:<trend>"); administrator text is kept.
 */
export function watchReason(action: string, reason: string): string {
  if (!reason) return ''
  const h = useModHost()
  const i = reason.indexOf(':')
  if (i <= 0) return reason
  const head = reason.slice(0, i)
  const tail = reason.slice(i + 1)
  if (head === 'record' && /^\d+$/.test(tail)) return h.t('watchReason.record', { id: tail })
  const known = (group: string, v: string) => enumLabel(group, v) !== v
  if (head === 'trend' && known('trend', tail)) return h.t('watchReason.trend', { trend: enumLabel('trend', tail) })
  if (action === 'auto_not_allowed' && known('deniedAction', head)) {
    return h.t('watchReason.denied', { action: enumLabel('deniedAction', head), trend: enumLabel('trend', tail) })
  }
  return reason
}
