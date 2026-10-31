// Helpers and extra DTOs for the admin resource views (users, roles, keys,
// groups, proxies, nodes, publishers).
import type { Role } from './types'

/** Role as returned by GET /roles (A1): user_count is the number of members. */
export type RoleRow = Role & { user_count?: number; created_at?: string; updated_at?: string }

export function roleMemberCount(r: RoleRow): number | undefined {
  return r.user_count ?? r.member_count
}

/** Badge tone for a generic resource status string (the SDK's statusTone). */
export { statusTone } from '@sub2api/ui'

/** Converts an RFC 3339 string to the value of an <input type="datetime-local">. */
export function toLocalInput(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Converts a datetime-local value to RFC 3339 (UTC), or null when empty. */
export function fromLocalInput(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Plugin state on a node, parsed from the JSON string / object in NodeInfo.plugins. */
export interface NodePluginState {
  serving?: string
  standby?: string
  fallback?: string
  rollout_id?: number
  rollout?: string
  instances?: Array<{ version: string; state: string; restarts: number; error?: string }>
  state?: string
  error?: string
  [k: string]: unknown
}

export function parseNodePlugin(raw: unknown): NodePluginState {
  if (raw && typeof raw === 'object') return raw as NodePluginState
  if (typeof raw !== 'string') return {}
  try { const value = JSON.parse(raw); return value && typeof value === 'object' ? value : { state: raw } } catch { return { state: raw } }
}
