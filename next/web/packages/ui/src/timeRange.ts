export type RangeKey = 'all' | '1h' | '24h' | 'today' | 'yesterday' | '7d' | '14d' | '30d' | 'month' | 'lastMonth' | 'custom'

/** UI message key of each preset's label. */
export const RANGE_LABELS: Record<RangeKey, string> = {
  all: 'ui.all',
  '1h': 'ui.lastHour',
  '24h': 'ui.last24h',
  today: 'ui.today',
  yesterday: 'ui.yesterday',
  '7d': 'ui.last7d',
  '14d': 'ui.last14d',
  '30d': 'ui.last30d',
  month: 'ui.thisMonth',
  lastMonth: 'ui.lastMonth',
  custom: 'ui.custom'
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = startOfToday()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * RFC 3339 bounds for a preset range ('' = open). 1h / 24h count back from now,
 * the others from local midnight; yesterday and lastMonth end at the next
 * local midnight (to is exclusive), the others are open-ended.
 */
export function rangeBounds(key: RangeKey): { from: string; to: string } {
  let from: Date | null = null
  let to: Date | null = null
  switch (key) {
    case '1h':
      from = new Date(Date.now() - 3600_000)
      break
    case '24h':
      from = new Date(Date.now() - 24 * 3600_000)
      break
    case 'today':
      from = startOfToday()
      break
    case 'yesterday':
      from = daysAgo(1)
      to = startOfToday()
      break
    case '7d':
      from = daysAgo(6)
      break
    case '14d':
      from = daysAgo(13)
      break
    case '30d':
      from = daysAgo(29)
      break
    case 'month': {
      const d = startOfToday()
      d.setDate(1)
      from = d
      break
    }
    case 'lastMonth': {
      const d = startOfToday()
      d.setDate(1)
      to = new Date(d)
      d.setMonth(d.getMonth() - 1)
      from = d
      break
    }
  }
  return { from: from ? from.toISOString() : '', to: to ? to.toISOString() : '' }
}

/** RFC 3339 -> value of <input type="datetime-local"> (local time). */
export function toLocalInput(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** <input type="datetime-local"> value -> RFC 3339 ('' when empty/invalid). */
export function fromLocalInput(v: string): string {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

/** Local calendar day key (YYYY-MM-DD) of a timestamp. */
export function dayKey(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Length in ms of [from, to) (RFC 3339; to '' = now). Infinity when from is open or unreadable. */
export function rangeSpanMs(from: string, to: string): number {
  const f = from ? new Date(from).getTime() : NaN
  if (Number.isNaN(f)) return Infinity
  const t = to ? new Date(to).getTime() : Date.now()
  return Number.isNaN(t) ? Infinity : t - f
}
