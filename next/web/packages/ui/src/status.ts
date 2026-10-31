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
  return extra?.[s] ?? TONES[s] ?? 'gray'
}
