import type { ApiKey } from '@/api/types'
import { fromLocalInput, toLocalInput } from '@/api/admin'
import { capsBody, capsForm, type KeyCapsForm } from './keyLimits'

/** The fields of the create and edit forms of an API key. */
export interface KeyForm {
  name: string
  group_id: number | null
  /** datetime-local value; empty = never expires. */
  expires_at: string
  /** One IP or CIDR per line (or comma separated). */
  allowed_ips: string
  caps: KeyCapsForm
}

/** The form of an existing key, or of a new one in group. */
export function keyForm(k?: ApiKey | null, group: number | null = null): KeyForm {
  return {
    name: k?.name ?? '',
    group_id: k?.group_id ?? group,
    expires_at: toLocalInput(k?.expires_at),
    allowed_ips: (k?.allowed_ips ?? []).join('\n'),
    caps: capsForm(k ?? undefined)
  }
}

export const ipEntries = (value: string) => value.split(/[\s,]+/).filter(Boolean)

/** Field errors the console finds before asking the server (message keys). */
export function keyFormErrors(f: KeyForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.name.trim()) errors.name = 'common.required'
  if (!f.group_id) errors.group_id = 'common.required'
  const exp = fromLocalInput(f.expires_at)
  if (exp && new Date(exp).getTime() <= Date.now()) errors.expires_at = 'apikeys.expiresInPast'
  return errors
}

/**
 * The request body of the form: POST /me/api-keys leaves out an empty expiry,
 * PATCH /me/api-keys/:id sends null to remove it.
 */
export function keyFormBody(f: KeyForm, editing: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = { name: f.name.trim(), group_id: f.group_id, allowed_ips: ipEntries(f.allowed_ips), ...capsBody(f.caps) }
  const exp = fromLocalInput(f.expires_at)
  if (exp || editing) body.expires_at = exp
  return body
}
