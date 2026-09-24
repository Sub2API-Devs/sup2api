// Shared helpers and DTOs of the plugin pages (list, consent, detail,
// rollout, market). Shapes not frozen by CONTRACTS.md are typed loosely and
// read tolerantly (camelCase or snake_case).
import type { LText, Trust } from '@/api/types'
import type { Tone } from '@sub2api/ui'

export type Risk = 'low' | 'medium' | 'high' | 'critical'

/** Copy of sdk/manifest.HostPermissionRisk. */
export const HOST_PERMISSION_RISK: Record<string, Risk> = {
  kv: 'low',
  config: 'low',
  log: 'low',
  'routes.admin': 'medium',
  'routes.user': 'medium',
  events: 'medium',
  jobs: 'medium',
  'ui.menu': 'medium',
  'ui.iframe': 'medium',
  'accounts.read': 'medium',
  'db.schema': 'high',
  net: 'high',
  'routes.public': 'high',
  'routes.webhook': 'high',
  'gateway.hook': 'high',
  'gateway.endpoint': 'high',
  'platform.register': 'high',
  'scheduler.affinity': 'high',
  'users.read': 'high',
  'accounts.credentials': 'critical',
  'ledger.credit': 'critical',
  'ledger.debit': 'critical',
  'ui.native': 'critical',
  'users.write': 'critical',
  'db.core_views': 'critical'
}

export const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function riskOf(id: string, fallback?: string): Risk {
  const r = (fallback || HOST_PERMISSION_RISK[id] || 'high') as Risk
  return r in RISK_ORDER ? r : 'high'
}

export function riskTone(r: string): Tone {
  return r === 'low' ? 'success' : r === 'medium' ? 'warning' : r === 'high' ? 'warning' : 'danger'
}

export function riskDotClass(r: string): string {
  switch (r) {
    case 'low':
      return 'bg-emerald-500'
    case 'medium':
      return 'bg-yellow-400'
    case 'high':
      return 'bg-orange-500'
    default:
      return 'bg-red-600'
  }
}

export function statusTone(s: string | undefined | null): Tone {
  switch (s) {
    case 'enabled':
    case 'active':
    case 'ready':
    case 'running':
    case 'ok':
    case 'success':
    case 'succeeded':
    case 'approved':
      return 'success'
    case 'enabling':
    case 'upgrading':
    case 'preparing':
    case 'activating':
    case 'pending':
    case 'starting':
      return 'primary'
    case 'awaiting_consent':
    case 'installed':
      return 'warning'
    case 'failed':
    case 'error':
    case 'crashed':
    case 'rolled_back':
    case 'rejected':
    case 'revoked':
    case 'unavailable':
      return 'danger'
    default:
      return 'gray'
  }
}

export function trustTone(t: Trust | undefined | null): Tone {
  switch (t) {
    case 'official':
      return 'success'
    case 'verified':
      return 'primary'
    case 'community':
      return 'gray'
    default:
      return 'danger'
  }
}

/** i18n key suffix for a host permission id ("db.schema" -> "db_schema"). */
export function hpKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_')
}

/** Reads the first present property among several spellings. */
export function pick<T = any>(o: unknown, ...keys: string[]): T | undefined {
  if (!o || typeof o !== 'object') return undefined
  const r = o as Record<string, unknown>
  for (const k of keys) if (r[k] !== undefined && r[k] !== null) return r[k] as T
  return undefined
}

export function asArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.map(display).join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export interface AccountTypeSummary {
  id: string
  label: LText | undefined
  protocols: string[]
}

/**
 * Account types declared by a plugin: top-level `account_types` of a review
 * or manifest summary (CONTRACTS §12). Protocols may be ids or manifest
 * objects ({protocol, requestFields, ...}).
 */
export function accountTypesOf(o: unknown): AccountTypeSummary[] {
  return asArray<Record<string, any>>(pick(o, 'account_types', 'accountTypes')).map((a) => ({
    id: String(pick(a, 'id', 'type') ?? ''),
    label: pick<LText>(a, 'label'),
    protocols: asArray(pick(a, 'protocols'))
      .map((p) => (typeof p === 'string' ? p : String(pick(p, 'protocol', 'id') ?? '')))
      .filter(Boolean)
  }))
}

/** First letter used as avatar when the plugin has no icon. */
export function initialOf(name: string, key: string): string {
  const s = (name || key || '?').trim()
  return s.charAt(0).toUpperCase()
}

/** Compares two semver-ish strings; returns <0, 0, >0. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const pa = String(a || '').replace(/^v/, '').split(/[.+-]/)
  const pb = String(b || '').replace(/^v/, '').split(/[.+-]/)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? '0'
    const y = pb[i] ?? '0'
    const nx = Number(x)
    const ny = Number(y)
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      if (nx !== ny) return nx - ny
    } else if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/** Scope object -> list of [key, values] for chip rendering. */
export function scopeEntries(scope: unknown): Array<{ key: string; values: string[] }> {
  if (!scope || typeof scope !== 'object') return []
  const out: Array<{ key: string; values: string[] }> = []
  for (const [k, v] of Object.entries(scope as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) out.push({ key: k, values: v.map((x) => display(x)) })
    else if (typeof v === 'object') {
      out.push({
        key: k,
        values: Object.entries(v as Record<string, unknown>).map(([k2, v2]) => `${k2}: ${display(v2)}`)
      })
    } else out.push({ key: k, values: [String(v)] })
  }
  return out
}

export function durationMs(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null
  const d = new Date(end).getTime() - new Date(start).getTime()
  return Number.isFinite(d) && d >= 0 ? d : null
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s`
}

// ------------------------------------------------------------------ detail DTOs

export interface PluginGrant {
  permission: string
  scope?: Record<string, unknown> | null
  status: string
  plugin_version?: string
  granted_by?: string | number | null
  granted_by_email?: string // assumed
  granted_at?: string | null
}

export interface PluginNode {
  node_id: string
  boot_id?: string
  addr?: string
  last_heartbeat?: string
  state?: Record<string, any> | string | null
}

export interface HookStats {
  calls: number
  denied: number
  timeouts: number
  p99_ms: number
  breaker_open: boolean
}

export interface PluginHook {
  point: string
  id?: string
  order?: number
  failure?: string
  timeout_ms?: number
  needs?: string[]
  stats?: HookStats | null
}

export interface JobRun {
  status: string
  node_id?: string
  started_at?: string
  finished_at?: string | null
  message?: string
}

export interface PluginJob {
  id: string
  schedule: string
  timeout_sec?: number
  next_run_at?: string | null // assumed
  last_run?: JobRun | null
}

export interface PluginEvents {
  subscribe?: string[]
  cursor?: number | string | null
  backlog?: number | null
  deadletters?: number | Array<Record<string, any>> | null
}

export interface PluginResources {
  memory_mb?: number | null
  cpu?: number | null
  max_threads?: number | null
  max_open_files?: number | null
}

export interface PluginVersion {
  version: string
  consent_status: string
  created_at?: string
}

export interface PluginDetail {
  key: string
  name: LText
  status: string
  /** Ships with the image: can be disabled, not uninstalled. */
  builtin?: boolean
  status_reason?: string
  active_version?: string | null
  desired_version?: string | null
  publisher?: string
  trust?: Trust
  manifest?: Record<string, any> | null
  grants?: PluginGrant[]
  nodes?: PluginNode[]
  hooks?: PluginHook[]
  jobs?: PluginJob[]
  events?: PluginEvents | null
  resources?: PluginResources | null
  egress_policy?: string
  versions?: PluginVersion[]
}

export interface PluginSettings {
  schema: Record<string, any> | null
  ui_schema?: Record<string, any> | null
  values: Record<string, any> | null
}

export const ROLLOUT_RUNNING = new Set(['preparing', 'activating'])
export const ROLLOUT_DONE = new Set(['active', 'failed', 'cancelled', 'rolled_back'])

export function isPendingConsent(s: string | undefined): boolean {
  return s === 'pending' || s === 'awaiting_consent' || s === 'awaiting'
}
