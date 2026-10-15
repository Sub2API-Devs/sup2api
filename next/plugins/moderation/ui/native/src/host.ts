import type { PluginHost } from '@sub2api/host'
import type { Tone } from '@sub2api/ui'

// Plugin-scoped host handed to register(); shared by all moderation components.
// All API shapes (CONTRACTS §20.7) live in this file so they are easy to adjust.
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

// ------------------------------------------------------------------ types

export type Mode = 'off' | 'observe' | 'enforce'
export type Verdict = 'pass' | 'flag' | 'block' | 'error'
export type Action = 'allow' | 'deny'
export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical'

export interface Totals {
  total: number
  pass: number
  flag: number
  block: number
  error: number
  /** requests refused by the hook (block verdicts in enforce, blocked users) */
  denied: number
}

export interface TrendPoint {
  /** bucket start, UTC (hour for 24h, day otherwise) */
  bucket: string
  pass: number
  flag: number
  block: number
  error: number
}

/** Runtime state of the node that served the request. */
export interface Runtime {
  mode: Mode
  configured: boolean
  queue_len: number
  queue_cap: number
  dropped: number
  inflight: number
  calls: number
  errors: number
  cache_hits: number
  avg_latency_ms: number
  blocked_users: number
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
  request_id?: string
  user_id?: number | null
  api_key_id?: number | null
  group_id?: number | null
  model?: string
  protocol?: string
  mode?: 'observe' | 'enforce' | string
  verdict: Verdict
  action?: Action | string
  categories?: string[] | null
  severity?: Severity | string
  reason?: string
  error?: string
  text_excerpt?: string
  text_chars?: number
  text_hash?: string
  cached?: boolean
  llm_model?: string
  turns?: number
  latency_ms?: number
  prompt_tokens?: number
  completion_tokens?: number
}

/** GET /events/:id: all fields; text is null when store_text was off. */
export interface ModEventDetail extends ModEvent {
  text?: string | null
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

export interface ChatToolCall {
  id?: string
  type?: string
  function?: { name?: string; arguments?: string | Record<string, unknown> }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | string
  content?: string | null | Array<{ type?: string; text?: string; [k: string]: unknown }>
  tool_calls?: ChatToolCall[] | null
  tool_call_id?: string
  name?: string
}

export interface TestResult {
  verdict: Verdict
  categories?: string[] | null
  severity?: Severity | string
  reason?: string
  error?: string
  latency_ms?: number
  turns?: number
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  transcript?: ChatMessage[]
}

// ------------------------------------------------------------------ API

const api = () => useModHost().pluginApi

/** `range` is a preset key of the overview endpoint (24h, 7d, 30d). */
export function fetchOverview(range: string): Promise<Overview> {
  return api().get<Overview>('/overview', { range })
}

export function fetchEvent(id: number): Promise<ModEventDetail> {
  return api().get<ModEventDetail>(`/events/${id}`)
}

export function deleteEvent(id: number): Promise<unknown> {
  return api().del(`/events/${id}`)
}

export async function fetchBlocks(): Promise<Block[]> {
  const r = await api().get<Block[] | { items?: Block[]; blocks?: Block[] } | null>('/blocks')
  if (Array.isArray(r)) return r
  return r?.items || r?.blocks || []
}

export function createBlock(body: { user_id: number; reason?: string; duration_hours?: number }): Promise<unknown> {
  return api().post('/blocks', body)
}

export function deleteBlock(userId: number): Promise<unknown> {
  return api().del(`/blocks/${userId}`)
}

export function runTest(text: string): Promise<TestResult> {
  return api().post<TestResult>('/test', { text })
}

// ------------------------------------------------------------------ helpers

/** Built-in category ids (CONTRACTS §20.5); others are shown as-is. */
export const BUILTIN_CATEGORIES = [
  'sexual_minors',
  'sexual',
  'violence',
  'self_harm',
  'hate',
  'harassment',
  'illegal',
  'cyber_attack',
  'politics',
  'jailbreak',
  'pii',
  'other'
]

export function categoryLabel(id: string): string {
  const h = useModHost()
  return BUILTIN_CATEGORIES.includes(id) ? h.t(`cat.${id}`) : id
}

export function verdictTone(v: string | undefined): Tone {
  switch (v) {
    case 'pass':
      return 'success'
    case 'flag':
      return 'warning'
    case 'block':
      return 'danger'
    default:
      return 'gray'
  }
}

export function modeTone(m: string | undefined): Tone {
  return m === 'enforce' ? 'danger' : m === 'observe' ? 'info' : 'gray'
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

export function canManageSettings(): boolean {
  const h = useModHost()
  return h.permissions.superuser() || h.permissions.has('plugin:manage')
}

// ------------------------------------------------------------------ settings

/** Settings edited on the native settings tab (a subset of the plugin's settings schema). */
export const LLM_FIELDS = ['mode', 'base_url', 'api_key', 'model', 'system_prompt', 'categories', 'tool_choice', 'max_turns', 'temperature', 'max_tokens', 'timeout_ms']

/** GET /api/v1/plugins/:key/settings (the settings schema form; secrets come back masked). */
export interface SettingsForm {
  schema: Record<string, any> | null
  ui_schema?: Record<string, any> | null
  values: Record<string, any> | null
  secret_fields?: string[]
}

export function fetchSettingsForm(): Promise<SettingsForm> {
  const h = useModHost()
  return h.api.get<SettingsForm>(`/plugins/${h.plugin.key}/settings`)
}

/**
 * Saves the full settings object (masked secrets are sent back unchanged to
 * keep them); the server answers with the stored form, secrets masked again.
 */
export function saveSettings(values: Record<string, any>): Promise<SettingsForm> {
  const h = useModHost()
  return h.api.put<SettingsForm>(`/plugins/${h.plugin.key}/settings`, { values })
}

/**
 * Server field errors -> SchemaForm paths. Schema errors are JSON pointers
 * under "values" (values/a/0/b), plugin errors may be dotted (values.a.0.b);
 * errors of the whole object ("values") come back in `root`.
 */
export function settingsFieldErrors(fields: Record<string, string>): { fields: Record<string, string>; root: string[] } {
  const out: Record<string, string> = {}
  const root: string[] = []
  for (const [k, v] of Object.entries(fields)) {
    const p = k.replace(/^values(?=[./]|$)/, '').replace(/^[./]/, '').replace(/\//g, '.')
    if (p) out[p] = v
    else root.push(v)
  }
  return { fields: out, root }
}
