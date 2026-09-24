import { daysAgo, startOfToday } from '@/utils/format'

export type RangeKey = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

/** RFC 3339 bounds for a preset range ('' = open). */
export function rangeBounds(key: RangeKey): { from: string; to: string } {
  let from: Date | null = null
  switch (key) {
    case 'today':
      from = startOfToday()
      break
    case '7d':
      from = daysAgo(6)
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
  }
  return { from: from ? from.toISOString() : '', to: '' }
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
