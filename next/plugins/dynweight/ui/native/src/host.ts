import type { PluginHost, UseListResult } from '@sub2api/host'
import type { SelectOption, Tone } from '@sub2api/ui'

// Plugin-scoped host handed to register(); shared by all dynweight components.
// All API shapes (CONTRACTS §74.5) live in this file.
let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useDwHost(): PluginHost {
  if (!host) throw new Error('dynweight UI used before register(host)')
  return host
}

/** Manifest userPermission (host.can prefixes it with plugin.dynweight:). */
export function canManage(): boolean {
  return useDwHost().can('dynweight:manage')
}

const api = () => useDwHost().pluginApi

// ------------------------------------------------------------------ config

export type Metric = 'error_rate' | 'ttfb' | 'latency' | 'weight'
export type Op = 'gt' | 'gte' | 'lt' | 'lte'
export type WeightMode = 'base_percent' | 'current_percent' | 'fixed'
export type ActionType = 'weight_degrade' | 'weight_climb' | 'affinity_clear'

export type Scope = 'all' | 'stream' | 'non_stream'

export interface Condition {
  join?: 'and' | 'or'
  metric: Metric
  p?: number
  op: Op
  value: number
  /** Counters the condition reads; absent = the rule's scope (not for weight). */
  scope?: Scope
  /** Without any sample: absent / 'fail' = false, 'pass' = true (not for weight). */
  when_empty?: 'fail' | 'pass'
}

export interface Rule {
  name: string
  scope?: '' | Scope
  enabled?: boolean
  conditions: Condition[]
  periods: number
  hit_periods: number
}

/** A rule name, or {all: [...]} / {any: [...]} (one level of nesting). */
export type When = string | { all: When[] } | { any: When[] }

export interface Action {
  type: ActionType
  mode?: WeightMode
  value?: number
  percent?: number
}

export interface Strategy {
  name: string
  enabled?: boolean
  when: When | null
  actions: Action[]
  cooldown_seconds?: number
}

export interface Layer {
  enabled: boolean
  window_seconds: number
  min_samples: number
  /** Degrading rules short of min_samples after the whole lookback are not judged (default on). */
  min_samples_strict: boolean
  /** A key dropping to weight 0 clears all its sticky sessions (default on). */
  clear_sticky_on_zero: boolean
  exempt_status_codes: string
  min_weight_mode: 'base_percent' | 'fixed'
  min_weight: number
  rules: Rule[]
  strategies: Strategy[]
}

export interface AccountOverride {
  enabled?: boolean
  exempt_status_codes?: string
  min_weight_mode?: 'base_percent' | 'fixed'
  min_weight?: number
}

export interface Notify {
  enabled: boolean
  channel: string
  recipients: string[]
  language: 'zh' | 'en'
}

export interface Config extends Layer {
  groups: Record<string, Layer> | null
  accounts: Record<string, AccountOverride> | null
  notify: Notify
  log_events: boolean
}

export interface ConfigBody {
  config: Config
  version: number
  warnings?: string[]
}

export interface Channel {
  id: string
  plugin: string
  label: Record<string, string>
  description?: Record<string, string>
  recipient: string
}

export const fetchConfig = () => api().get<ConfigBody>('/config')
export const fetchDefaults = () => api().get<Layer>('/defaults')
export const saveConfig = (body: { config: Config; version: number }) => api().put<ConfigBody>('/config', body)
/** Checks a configuration as saving would, without saving: the same error, else its warnings. */
export const validateConfig = (body: { config: Config; version: number }) => api().post<ConfigBody>('/config/validate', body)

export async function fetchChannels(): Promise<Channel[]> {
  const r = await api().get<Channel[] | null>('/channels')
  return Array.isArray(r) ? r : []
}

// ------------------------------------------------------------------ status / events

/** Key filter of the status and events tabs, as typed in the form. */
export interface Filter {
  account_id: string
  group_id: string
  model: string
}

export const emptyFilter = (): Filter => ({ account_id: '', group_id: '', model: '' })

/** Applies a query to a useList; the same query reloads instead. */
export function applyQuery(list: UseListResult<unknown>, next: Record<string, string>) {
  if (Object.entries(next).every(([k, v]) => list.filters[k] === v)) list.reload()
  else Object.assign(list.filters, next)
}

/** Query of a filter, trimmed. */
export const filterQuery = (f: Filter): Filter => ({ account_id: f.account_id.trim(), group_id: f.group_id.trim(), model: f.model.trim() })

export interface RuleResult {
  name: string
  scope: 'all' | 'stream' | 'non_stream'
  periods: number
  hit_periods: number
  hit: boolean
  fired: boolean
  /** Hits of the last windows, '1' = hit, newest last; cleared when the rule fires. */
  bitmap: string
  samples: number
  lookback: number
  /** Weight conditions only (or conditions that passed without samples): no samples to report. */
  no_samples: boolean
  /** Strict and too few samples even looking back: not judged, the bitmap left alone. */
  unjudged: boolean
}

export interface ThresholdCount {
  ms: number
  count: number
}

export interface CurrentWindow {
  window_start: number
  elapsed_seconds: number
  total: number
  fail: number
  stream_total: number
  stream_fail: number
  ttfb_samples: number
  latency_samples: number
  thresholds: ThresholdCount[]
  latency_thresholds: ThresholdCount[]
}

/** A (account, group, model) key; 0 / '' widen a reset to every value. */
export interface Key {
  account_id: number
  group_id: number
  model: string
}

export interface KeyStatus extends Key {
  account_name: string
  base: number
  effective: number
  weight_min: number
  state: 'normal' | 'degrading' | 'climbing'
  adjusting: boolean
  group_configured: boolean
  no_climb_strategy: boolean
  reset: boolean
  verdict: '' | 'bad' | 'good' | 'neutral'
  last_change: string
  changed_at: number
  next_eval_at: number
  /** The last evaluated window (0 = none yet), merged back over `lookback` windows. */
  eval_window: number
  total: number
  fail: number
  lookback: number
  error_evaluable: boolean
  ttfb_samples: number
  latency_samples: number
  thresholds: ThresholdCount[]
  latency_thresholds: ThresholdCount[]
  recent: { windows: number; total: number; fail: number }
  rules: RuleResult[]
  current: CurrentWindow
}

export interface WeightEvent {
  id: number
  created_at: string
  account_id: number
  account_name: string
  group_id: number
  model: string
  kind: string
  reason: string
  from: number
  to: number
  rules: string[] | null
  detail: Record<string, unknown> | null
}

/** Puts the keys of accounts and/or a group (and model) back to their base. */
export const resetWeights = (k: Key & { account_ids?: number[] }) => api().post<{ reset: number }>('/reset', k)

/** The most accounts one reset takes (POST /reset). */
export const MAX_RESET_ACCOUNTS = 500

/** This node's runtime counters (GET /stats), with node_id and started_at; see CONTRACTS §74.5. */
export type RuntimeStats = Record<string, number | boolean | string>
export const fetchStats = () => api().get<RuntimeStats>('/stats')

// ------------------------------------------------------------------ core catalog

export interface Named {
  id: number
  name: string
}

// ------------------------------------------------------------------ account list slot

export interface AccountWeight {
  degraded: number
  lowest: number
  base: number
}

// The account list renders the slot once per row: ids asked for in the same
// tick are fetched in one GET /weights.
type Waiters = Map<number, Array<(w: AccountWeight | null) => void>>
let pending: Waiters | null = null

export function loadAccountWeight(accountId: number): Promise<AccountWeight | null> {
  return new Promise((resolve) => {
    if (!pending) {
      pending = new Map()
      queueMicrotask(flushWeights)
    }
    pending.set(accountId, [...(pending.get(accountId) ?? []), resolve])
  })
}

async function flushWeights() {
  const batch: Waiters = pending ?? new Map()
  pending = null
  let weights: Record<string, AccountWeight> = {}
  try {
    weights = (await api().get<Record<string, AccountWeight> | null>('/weights', { account_ids: [...batch.keys()].join(',') })) ?? {}
  } catch {
    /* the slot is optional */
  }
  for (const [id, waiters] of batch) waiters.forEach((resolve) => resolve(weights[id] ?? null))
}

// ------------------------------------------------------------------ helpers

/** Human-readable message of a failed call (ApiError is an Error), else `fallback`. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

/** Integer effective weight, as the scheduler uses it. */
export const weightOf = (w: number) => Math.min(1000, Math.max(0, Math.floor(w + 0.5)))

/** Tone of an effective weight against its base. */
export function weightTone(eff: number, base: number): Tone {
  const w = weightOf(eff)
  if (w >= base) return 'success'
  return w === 0 ? 'danger' : 'warning'
}

export function eventTone(kind: string): Tone {
  switch (kind) {
    case 'weight_down':
      return 'warning'
    case 'weight_up_start':
    case 'weight_revived':
      return 'info'
    case 'weight_restored':
      return 'success'
    case 'affinity_cleared':
      return 'accent'
  }
  return 'gray'
}

/** Options of an enum whose labels are messages under `group`. */
export function enumOptions(group: string, values: readonly string[]): SelectOption[] {
  const t = useDwHost().t
  return values.map((v) => ({ value: v, label: t(`${group}.${v}`) }))
}

export const scopes: readonly Scope[] = ['all', 'stream', 'non_stream']

export const metrics: readonly Metric[] = ['error_rate', 'ttfb', 'latency', 'weight']
export const percentileMetric = (m: Metric) => m === 'ttfb' || m === 'latency'
export const opsOf = (m: Metric): Op[] => (percentileMetric(m) ? ['gte', 'lt'] : ['gt', 'gte', 'lt', 'lte'])
export const eventKinds = ['weight_down', 'weight_up_start', 'weight_restored', 'weight_revived', 'affinity_cleared', 'reset'] as const

/** Deep copy of a JSON value. */
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Moves list[i] by `by` places (order is meaningful for rules and strategies). */
export function moveItem<T>(list: T[], i: number, by: number) {
  const j = i + by
  if (j < 0 || j >= list.length) return
  list.splice(j, 0, ...list.splice(i, 1))
}

/** Inserts a copy of a named list[i] after it, under a name not taken yet. */
export function duplicateItem<T extends { name: string }>(list: T[], i: number, copyName: (name: string, n: number) => string) {
  const taken = new Set(list.map((x) => x.name))
  let n = 1
  while (taken.has(copyName(list[i].name, n))) n++
  list.splice(i + 1, 0, { ...clone(list[i]), name: copyName(list[i].name, n) })
}

/** Success rate in percent with one decimal ("97.5%"), '—' without samples. */
export function successRate(total: number, fail: number): string {
  return total > 0 ? `${Math.round(((total - fail) / total) * 1000) / 10}%` : '—'
}

/** Rule names with a number left empty (SInput type="number" gives null), which the plugin refuses or reads as 0. */
export function rulesWithEmptyNumbers(rules: Rule[]): string[] {
  const empty = (v: number | undefined | null) => v === null || v === undefined
  return rules
    .filter((r) => empty(r.periods) || empty(r.hit_periods) || r.conditions.some((c) => empty(c.value) || (percentileMetric(c.metric) && empty(c.p))))
    .map((r) => r.name)
}

/** "10s" / "1.5s" / "800ms" for a threshold in ms. */
export const formatMs = (ms: number) => (ms >= 1000 ? `${Math.round(ms / 100) / 10}s` : `${ms}ms`)
