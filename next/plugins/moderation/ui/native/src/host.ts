import type { PluginHost } from '@sub2api/host'
import type { Tone } from '@sub2api/ui'
import type { ChannelHealth } from './stats'

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

export interface Totals {
  total: number
  pass: number
  hit: number
  block: number
  overturned: number
  error: number
  denied: number
}

export interface TrendPoint {
  bucket: string
  pass: number
  hit: number
  block: number
  overturned: number
  error: number
}

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

export interface Overview {
  totals: Totals
  trend: TrendPoint[]
  top_categories: Array<{ category: string; count: number }>
  top_users: Array<{ user_id: number; count: number }>
  runtime: Runtime
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
  /** P2 AI verdict (§72.13.4); empty / absent until an analysis reviewed the record */
  ai_verdict?: AIVerdict | '' | null
  ai_severity?: string | null
  ai_category?: string | null
  ai_evidence?: string | null
  ai_reason?: string | null
  ai_analysis_id?: number | null
  /** P3: per-stage path and scores (list items too); null on 0.1 records */
  trace?: Trace | null
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
  /** P3: categories closest to their thresholds (score / threshold), hits or not */
  top?: HitCategory[]
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
  latency_ms: number
}

/** GET /events/:id */
export interface ModEventDetail extends ModEvent {
  text: string | null
  trace: Trace | null
  /** P3 (§72.14.3) */
  related?: ModEvent[]
  flow_snapshot?: FlowSnapshot | null
  user?: RecordUser | null
}

export interface FlowSnapshot {
  flow_id: number
  name: string
  version: number
  current_version: number
  published_at: string | null
  spec: Spec
  auditors: Array<{ id: number; name: string; type: AuditorType | string; channel_id: number; channel_name: string; config: AuditorConfig; rules_version?: string; deleted: boolean }>
}

export interface RecordUser {
  watch: Watch | null
  exempt: boolean
  staff: boolean
  blocked: boolean
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
  /** P3: suspicious records since the last level change */
  hits_since_seen?: number
  violation_count: number
  last_hit_at: string | null
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
  /** P3 list figures (§72.14.3) */
  health?: ChannelHealth | null
  used_by?: Array<{ id: number; name: string }>
  is_analysis?: boolean
  timeout_ms: number
  enabled: boolean
  created_at: string
  updated_at: string
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
  /** P3: built-in guidelines, and whether analysis_guidelines replaces them */
  default_guidelines?: string
  custom_guidelines?: boolean
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

export interface FlowVersionDetail {
  flow_id: number
  name: string
  version: number
  current: boolean
  published_at?: string
  spec?: Spec
  stages?: Array<{ stage: number; combine: string; n?: number; auditors: Array<{ auditor_id: number; name: string; type: AuditorType | string; deleted?: boolean }> }>
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
  /** P3: hook calls and cost today */
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
  dirty: boolean
  /** P3: automatic total timeout of the draft (detail only) */
  stage_timeout_sum_ms?: number
  /** P3: last 24 hours (list only) */
  stats_24h?: { audited: number; suspicious_rate: number; pre_latency_avg_ms: number } | null
  created_at: string
  updated_at: string
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
  latency_ms: number
  cost?: CallCost | null
  /** P3: the address called */
  url?: string
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

export const fetchOverview = (range: string) => api().get<Overview>('/overview', { range })
export const fetchEvent = (id: number) => api().get<ModEventDetail>(`/events/${id}`)
export const fetchEventInput = (id: number) => api().get<{ id: number; format: string; messages: unknown }>(`/events/${id}/input`)
export const deleteEvent = (id: number) => api().del(`/events/${id}`)
export const reviewEvents = (ids: number[], status: ReviewStatus) => api().post<{ updated: number }>('/events/review', { ids, status })

export async function fetchBlocks(): Promise<Block[]> {
  const r = await api().get<Block[] | null>('/blocks')
  return Array.isArray(r) ? r : []
}
export const createBlock = (body: { user_id: number; reason?: string; duration_hours?: number }) => api().post('/blocks', body)
export const deleteBlock = (userId: number) => api().del(`/blocks/${userId}`)

export interface WatchChange {
  level?: WatchLevel
  days?: number
  note?: string
  /** P3: history text of the change (default: note) */
  reason?: string
}
export const createWatch = (body: WatchChange & { user_id: number }) => api().post<Watch>('/watchlist', body)
export const updateWatch = (userId: number, body: WatchChange) => api().patch<Watch>(`/watchlist/${userId}`, body)
export const deleteWatch = (userId: number) => api().del(`/watchlist/${userId}`)
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
/** P3: id 0 runs a whole draft; otherwise the draft fields override the stored auditor. */
export interface AuditorDraft {
  name?: string
  type?: AuditorType
  channel_id?: number
  config?: AuditorConfig
}
export const tryAuditor = (id: number, text: string, images: string[], draft?: AuditorDraft) =>
  api().post<TryResult>(`/auditors/${id}/try`, { text, images, ...draft })
export const fetchDefaults = () => api().get<Defaults>('/jev/default-questions')

export const fetchFlows = () => api().get<Flow[]>('/flows')
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

export const fetchWatch = (userId: number) => api().get<Watch>(`/watchlist/${userId}`)
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
}
export const simulateFlow = (id: number, body: SimulateBody) => api().post<TestResult>(`/flows/${id}/simulate`, body)

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

/** A blank spec for a new flow. */
export function emptySpec(): Spec {
  return { model_filter: { type: 'all', models: [] }, sample_rate: 100, total_timeout_ms: 0, stages: [{ auditors: [], combine: 'any' }] }
}

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
