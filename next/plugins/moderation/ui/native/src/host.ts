import type { PluginHost } from '@sub2api/host'

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

// Manifest userPermissions (host.can prefixes them with plugin.moderation:).
export const PERM_READ = 'moderation:read'
export const PERM_MANAGE = 'moderation:manage'

export function canManage(): boolean {
  return useModHost().can(PERM_MANAGE)
}

// ------------------------------------------------------------------ types

export type Mode = 'off' | 'observe' | 'enforce'
export type Verdict = 'pass' | 'flag' | 'block' | 'error'
export type Action = 'allow' | 'deny'
export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type Range = '24h' | '7d' | '30d'

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

export interface EventFilters {
  verdict: string
  action: string
  mode: string
  category: string
  user_id: string
  q: string
  /** datetime-local input values (local time) */
  from: string
  to: string
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

export function fetchOverview(range: Range): Promise<Overview> {
  return api().get<Overview>('/overview', { range })
}

/** Converts a datetime-local value to RFC3339 (UTC). */
function rfc3339(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}

export function fetchEvents(f: EventFilters, page: number, pageSize: number) {
  return api().list<ModEvent>('/events', {
    verdict: f.verdict,
    action: f.action,
    mode: f.mode,
    category: f.category.trim(),
    user_id: f.user_id.trim(),
    q: f.q.trim(),
    from: rfc3339(f.from),
    to: rfc3339(f.to),
    page,
    page_size: pageSize
  })
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

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'info'

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

export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as Error).message === 'string' && (e as Error).message) {
    return (e as Error).message
  }
  return fallback
}

/** Opens the plugin detail page on its settings tab. */
export function openSettings() {
  const h = useModHost()
  h.router.push({ path: `/plugins/${h.plugin.key}`, query: { tab: 'settings' } })
}

export function canOpenSettings(): boolean {
  const h = useModHost()
  return h.permissions.superuser() || h.permissions.has('plugin:read')
}

export function canManageSettings(): boolean {
  const h = useModHost()
  return h.permissions.superuser() || h.permissions.has('plugin:manage')
}

// ------------------------------------------------------------------ settings

/** The LLM-related subset of Settings that lives in the native settings tab. */
export interface LLMSettings {
  base_url: string
  api_key: string
  model: string
  system_prompt: string
  categories: Array<{ id: string; description: string }>
  tool_choice: string
  max_turns: number
  temperature: number
  max_tokens: number
  timeout_ms: number
}

const MASK = '******'

/** Shape returned by GET /api/v1/plugins/:key/settings */
interface PluginSettingsView {
  values: Record<string, unknown>
  secret_fields: string[]
}

export async function fetchLLMSettings(): Promise<LLMSettings> {
  const h = useModHost()
  const v = await h.api.get<PluginSettingsView>(`/plugins/${h.plugin.key}/settings`)
  const vals = v?.values ?? {}
  return {
    base_url: (vals.base_url as string) ?? '',
    api_key: (vals.api_key as string) ?? '',
    model: (vals.model as string) ?? '',
    system_prompt: (vals.system_prompt as string) ?? '',
    categories: (vals.categories as LLMSettings['categories']) ?? [],
    tool_choice: (vals.tool_choice as string) ?? 'required',
    max_turns: (vals.max_turns as number) ?? 3,
    temperature: (vals.temperature as number) ?? 0,
    max_tokens: (vals.max_tokens as number) ?? 512,
    timeout_ms: (vals.timeout_ms as number) ?? 10000
  }
}

/**
 * Merges the LLM settings patch back into the full settings object and saves.
 * Masked api_key is passed through so the server retains the stored value.
 */
export async function saveLLMSettings(patch: LLMSettings): Promise<void> {
  const h = useModHost()
  const v = await h.api.get<PluginSettingsView>(`/plugins/${h.plugin.key}/settings`)
  const merged = { ...(v?.values ?? {}), ...patch }
  // Keep masked value so server preserves the stored secret.
  if (patch.api_key === '' || patch.api_key === MASK) {
    merged.api_key = MASK
  }
  await h.api.put(`/plugins/${h.plugin.key}/settings`, { values: merged })
}

export { MASK as SETTINGS_MASK }
