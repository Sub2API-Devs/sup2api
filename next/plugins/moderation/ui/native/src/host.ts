import type { PluginHost } from '@sub2api/host'
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
  latency_ms: number
}

/** GET /events/:id */
export interface ModEventDetail extends ModEvent {
  text: string | null
  trace: Trace | null
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
  note: string
  updated_at: string
}

export interface WatchEvent {
  id: number
  user_id: number
  action: string
  from_level: string
  to_level: string
  reason: string
  operator_id: number | null
  created_at: string
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
  timeout_ms: number
  enabled: boolean
  created_at: string
  updated_at: string
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
}

export interface TryResult extends Outcome {
  error?: string
}

export interface ChannelTestResult {
  ok: boolean
  status?: number
  error?: string
  message?: string
  model?: string
  latency_ms: number
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

export const createWatch = (body: { user_id: number; level?: WatchLevel; days?: number; note?: string }) => api().post<Watch>('/watchlist', body)
export const updateWatch = (userId: number, body: { level?: WatchLevel; days?: number; note?: string }) => api().patch<Watch>(`/watchlist/${userId}`, body)
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
export const tryAuditor = (id: number, text: string, images: string[]) => api().post<TryResult>(`/auditors/${id}/try`, { text, images })
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
