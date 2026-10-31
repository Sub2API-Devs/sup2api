// Contract types of the moderation API (CONTRACTS §72.11, §72.13, §72.14):
// response rows and request bodies, shared by host.ts and the views.

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
  /** channel_problem: why a set analysis_channel_id is not used (the core saves settings unchecked) */
  analysis?: { channel_configured: boolean; channel_problem?: 'not_found' | 'not_llm' | 'unusable'; pending: number; running: number }
}

/** Row of GET /events (no `text`, has `text_excerpt`). */
/** Record filters a record detail can set (click-to-filter). */
export type EventFilter = { endpoint?: string; session_fp?: string }

export interface ModEvent {
  id: number
  created_at: string
  request_id: string
  user_id: number
  api_key_id: number
  group_id: number
  model: string
  protocol: string
  /** client endpoint path pattern, e.g. /v1/messages ('' on older records) */
  endpoint: string
  /** sticky-session fingerprint ('' = no sticky session) */
  session_fp: string
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
  /** image source: 'base64' (data URL) or 'url' */
  kind?: 'base64' | 'url' | string
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
  /** records by their highest category (label: the Jev question label of a custom category) */
  top_categories: Array<{ category: string; label?: string; count: number }>
  /** records whose highest category is not among top_categories */
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
  /** sorted by count; label: the Jev question label of a custom category */
  items: Array<{ category: string; label?: string; count: number }>
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

// ---- request bodies

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

/** Auditor fields as saved, or tried unsaved instead of (or over) the stored ones. */
export interface AuditorDraft {
  name?: string
  type?: AuditorType
  channel_id?: number
  config?: AuditorConfig
}
/** What the try modal runs: a stored auditor, its unsaved edits, or an unsaved one (id null). */
export interface AuditorTryTarget {
  id: number | null
  name: string
  draft?: AuditorDraft
}

/** A record source of a user: group → flow@version (the drawer timeline filter). */
export interface SourceFilter {
  group_id: number
  flow_id: number
  flow_version: number
}
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

// ---- core API (host.api)

/** A console user as GET /users returns it (only the fields used here). */
export interface CoreUser {
  id: number
  email?: string
  display_name?: string
  /** active / disabled ... */
  status?: string
  /** core role keys */
  roles?: string[]
}

/** GET /plugins/:key/settings; secret values come back masked and are kept when sent back masked. */
export interface PluginSettings {
  values: Record<string, unknown>
  /** keys whose stored value comes back as SETTINGS_MASK; sending the mask keeps it */
  secret_fields?: string[]
  /** forms/settings.schema.json: defaults of keys never stored */
  schema?: { properties?: Record<string, { default?: unknown }> } | null
}

// ---- configuration import (§72.12)

/** POST /import: counts of what the document holds (preview) or created. */
export interface ImportResult {
  channels: number
  auditors: number
  /** channels that carry an API key */
  keys: number
  /** returned only; it is a setting the administrator saves */
  jev_default_set?: JevQuestions | null
  preview: boolean
  channel_ids?: number[]
  auditor_ids?: number[]
}

// ---- page

/** Tabs of the moderation page (?tab=). */
export type TabKey = 'overview' | 'events' | 'watch' | 'blocks' | 'flows' | 'auditors' | 'channels' | 'test' | 'settings'
