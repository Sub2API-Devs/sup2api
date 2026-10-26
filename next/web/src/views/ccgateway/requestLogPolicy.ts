// Request log level of an account as the core decides it (REQUEST-LOG-POLICY-DESIGN.md):
// the account's own setting, the default rule of the CCGateway configuration, the
// effective level and the Worker state (limits, usage, viewer), which may be missing.
// An older core answers GET / PUT request-logs with the Worker state itself.

export type RequestLogLevel = 'off' | 'summary' | 'full'
/** The account's own setting; follow: the default rule. */
export type RequestLogSetting = 'follow' | RequestLogLevel
/** The default rule never turns the full level on (§1). */
export type RequestLogDefault = 'off' | 'summary'

export const LOG_LEVELS: readonly RequestLogLevel[] = ['off', 'summary', 'full']
export const LOG_SETTINGS: readonly RequestLogSetting[] = ['follow', 'off', 'summary', 'full']
export const LOG_DEFAULTS: readonly RequestLogDefault[] = ['off', 'summary']
export const FULL_HOURS = [1, 4, 24] as const

export interface RequestLogTier {
  retention_hours?: number
  storage_budget_bytes?: number
  per_request_limit_bytes?: number
}

/** What the Worker reported about its logs. */
export interface WorkerLogInfo {
  summary: RequestLogTier | null
  full: RequestLogTier | null
  usage: { summary_bytes: number | null; full_bytes: number | null; requests: number | null }
  overflow: boolean
  /** The Worker serves the log reads (REQUEST-LOG-VIEWER-DESIGN.md). */
  viewer: boolean
  /** The list takes the search filters (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3). */
  viewerSearch: boolean
  /** The Worker takes {"clear_all":true} (REQUEST-LOG-POLICY-DESIGN.md §3); older ones do not. */
  clearAll: boolean
}

export interface RequestLogPolicy {
  setting: RequestLogSetting
  /** ms since epoch, only for the full setting */
  fullUntil: number | null
  default: RequestLogDefault
  /** The effective level the core reported when it answered. */
  effective: RequestLogLevel
  /** null: the Worker could not be reached; the level can still be set. */
  worker: WorkerLogInfo | null
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)
export const isLevel = (v: unknown): v is RequestLogLevel => oneOf(LOG_LEVELS, v)
export const isSetting = (v: unknown): v is RequestLogSetting => oneOf(LOG_SETTINGS, v)
export const isDefault = (v: unknown): v is RequestLogDefault => oneOf(LOG_DEFAULTS, v)
export const safeCount = (v: unknown, min: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min

/** A tier with all three limits, or null (not reported). */
export function tierOf(v: unknown): RequestLogTier | null {
  if (!isObject(v)) return null
  const tier = v as RequestLogTier
  return [tier.retention_hours, tier.storage_budget_bytes, tier.per_request_limit_bytes].every(x => safeCount(x, 1)) ? tier : null
}

/** Limits, usage and viewer of a Worker state; unreported values are null / false. Its own level is not read: the core decides it. */
export function workerInfoOf(state: Record<string, unknown>): WorkerLogInfo {
  const limits = isObject(state.limits) ? state.limits : {}
  const usage = isObject(state.usage) ? state.usage : {}
  const count = (k: 'summary_bytes' | 'full_bytes' | 'requests') => (safeCount(usage[k], 0) ? usage[k] as number : null)
  return {
    summary: tierOf(limits.summary),
    full: tierOf(limits.full),
    usage: { summary_bytes: count('summary_bytes'), full_bytes: count('full_bytes'), requests: count('requests') },
    overflow: state.overflow_behavior === 'retain_partial_with_metadata',
    viewer: state.viewer === true,
    viewerSearch: state.viewer_search === true,
    clearAll: state.clear_all === true,
  }
}

/**
 * The core's answer of GET / PUT request-logs. null: an older core, whose answer
 * is the Worker state (no `setting`). Throws when it is malformed.
 */
export function policyOf(raw: unknown): RequestLogPolicy | null {
  if (!isObject(raw)) throw new Error('invalid request log state')
  if (!('setting' in raw)) return null
  const setting = raw.setting
  if (!isObject(setting) || !isSetting(setting.level) || !isDefault(raw.default) || !isLevel(raw.effective)) throw new Error('invalid request log setting')
  let fullUntil: number | null = null
  if (setting.level === 'full') {
    fullUntil = typeof setting.full_until === 'string' ? Date.parse(setting.full_until) : NaN
    if (!Number.isFinite(fullUntil)) throw new Error('invalid request log expiry')
  }
  const worker = raw.worker ?? null
  if (worker !== null && !isObject(worker)) throw new Error('invalid request log worker state')
  return { setting: setting.level, fullUntil, default: raw.default, effective: raw.effective, worker: worker && workerInfoOf(worker) }
}

/** The setting in force at `now`: a full level past its end follows the default again (§1). */
export function activeSetting(p: RequestLogPolicy, now: number): RequestLogSetting {
  return p.setting === 'full' && p.fullUntil !== null && p.fullUntil <= now ? 'follow' : p.setting
}

/** The level the next request gets at `now`. */
export function effectiveAt(p: RequestLogPolicy, now: number): RequestLogLevel {
  const s = activeSetting(p, now)
  return s === 'follow' ? p.default : s
}

/** Accounts with their own setting among the loaded ones; null when none is loaded from a current core. */
export function countOverrides(policies: readonly (RequestLogPolicy | null)[], now: number): number | null {
  const known = policies.filter((p): p is RequestLogPolicy => p !== null)
  return known.length ? known.filter(p => activeSetting(p, now) !== 'follow').length : null
}
