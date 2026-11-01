import type { Tone } from './types'

const TONES: Record<string, Tone> = {
  active: 'success',
  enabled: 'success',
  ok: 'success',
  running: 'success',
  ready: 'success',
  healthy: 'success',
  disabled: 'gray',
  stopped: 'gray',
  removed: 'gray',
  expired: 'warning',
  pending: 'warning',
  starting: 'warning',
  draining: 'warning',
  loading: 'warning',
  upgrading: 'warning',
  stopping: 'warning',
  revoked: 'danger',
  error: 'danger',
  failed: 'danger',
  crashed: 'danger',
  banned: 'danger'
}

/**
 * Badge tone of a generic resource status string (case-insensitive):
 * active/enabled/running… success, pending/expired… warning, error/failed…
 * danger, anything else gray. `extra` adds or overrides statuses.
 */
export function statusTone(status: string | null | undefined, extra?: Record<string, Tone>): Tone {
  const s = (status || '').toLowerCase()
  return byStatus(extra, s) ?? TONES[s] ?? 'gray'
}

/** The entry of a status map, keys compared case-insensitively (as the built-in tones and labels are). */
export function byStatus<T>(map: Record<string, T> | undefined, status: string): T | undefined {
  if (!map) return undefined
  if (status in map) return map[status]
  const s = status.toLowerCase()
  const k = Object.keys(map).find((x) => x.toLowerCase() === s)
  return k === undefined ? undefined : map[k]
}
