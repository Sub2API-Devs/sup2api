// Helpers and extra DTOs for the admin resource views (users, roles, keys,
// groups, proxies, nodes, publishers).
import type { Tone } from '@sub2api/ui'
import type { Role } from './types'

/** Role as returned by GET /roles (A1): user_count is the number of members. */
export type RoleRow = Role & { user_count?: number; created_at?: string; updated_at?: string }

export function roleMemberCount(r: RoleRow): number | undefined {
  return r.user_count ?? r.member_count
}

/** Badge tone for a generic resource status string. */
export function statusTone(s: string | null | undefined): Tone {
  switch ((s || '').toLowerCase()) {
    case 'active':
    case 'enabled':
    case 'ok':
    case 'running':
    case 'ready':
    case 'healthy':
      return 'success'
    case 'disabled':
    case 'stopped':
    case 'removed':
      return 'gray'
    case 'expired':
    case 'pending':
    case 'starting':
    case 'draining':
    case 'loading':
    case 'upgrading':
    case 'stopping':
      return 'warning'
    case 'revoked':
    case 'error':
    case 'failed':
    case 'crashed':
    case 'banned':
      return 'danger'
    default:
      return 'gray'
  }
}

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
  version?: string
  state?: string
  error?: string
  [k: string]: unknown
}

/** Positive decimal with at most 8 fraction digits ("12.5", "0.00000001"). */
export const POSITIVE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/

export function isPositiveDecimal(v: string): boolean {
  return POSITIVE_DECIMAL.test(v.trim()) && Number(v) > 0
}
