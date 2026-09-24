import type { Tone } from '@sub2api/ui'
import { formatDateTime, formatMoney, formatNumber } from '@/utils/format'

/** Parses a manifest route reference such as "GET /models" into method + plugin API path. */
export function parseRouteRef(ref: string | undefined, defMethod = 'GET'): { method: string; path: string } | null {
  if (!ref) return null
  const m = /^\s*(?:(GET|POST|PUT|PATCH|DELETE)\s+)?(\/\S*)\s*$/i.exec(ref)
  if (!m) return null
  return { method: (m[1] || defMethod).toUpperCase(), path: m[2] }
}

export function formatCell(v: unknown, format?: string): string {
  if (v === null || v === undefined || v === '') return '—'
  switch (format) {
    case 'number':
      return formatNumber(v as any, 4)
    case 'datetime':
      return formatDateTime(v as any)
    case 'currency':
      return formatMoney(v as any)
    default:
      return typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
}

export function badgeTone(v: unknown): Tone {
  const s = String(v).toLowerCase()
  if (['true', 'active', 'enabled', 'ok', 'success', 'succeeded', 'ready', 'yes', 'online'].includes(s)) return 'success'
  if (['false', 'disabled', 'inactive', 'no', 'off'].includes(s)) return 'gray'
  if (['error', 'failed', 'denied', 'blocked', 'revoked', 'offline'].includes(s)) return 'danger'
  if (['pending', 'warning', 'cooldown', 'preparing'].includes(s)) return 'warning'
  return 'primary'
}

/** Loads a JSON document from the plugin package (schema/uiSchema files). */
export async function fetchAsset<T = any>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}
