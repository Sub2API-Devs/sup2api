import type { Granularity } from './types'

// ECharts options of the overview (SChart takes colours, not tones).

const SERIES_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#64748b']

const pad = (x: number) => String(x).padStart(2, '0')

/** Hour points as local "HH:00", day points (local midnights, or UTC days with utc) as "MM-DD". */
export function bucketLabel(ts: string, granularity: Granularity, utc = false): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  if (granularity === 'hour') return `${pad(d.getHours())}:00`
  return utc ? `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` : `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface LineSeries {
  name: string
  /** value per label; null leaves a gap */
  data: Array<number | null>
  dashed?: boolean
}

/** Line chart over shared x labels; format renders tooltip values and the y axis. */
export function lineChart(labels: string[], series: LineSeries[], format: (v: number) => string) {
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v === null || v === undefined ? '—' : format(v)) },
    legend: { data: series.map((s) => s.name), top: 0, type: 'scroll' },
    grid: { left: 56, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: { type: 'value', axisLabel: { formatter: format } },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'line',
      showSymbol: false,
      connectNulls: false,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      lineStyle: s.dashed ? { type: 'dashed' } : undefined,
      data: s.data
    }))
  }
}

/** Bar chart of one series over x labels; format renders tooltip values and the y axis. */
export function barChart(labels: string[], series: { name: string; data: number[] }, format: (v: number) => string) {
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => format(v) },
    grid: { left: 56, right: 12, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', axisLabel: { formatter: format } },
    series: [{ name: series.name, type: 'bar', barMaxWidth: 20, color: SERIES_COLORS[0], data: series.data }]
  }
}

/**
 * Aligns per-series points on the union of their timestamps (sorted), so
 * series with missing buckets still line up.
 */
export function alignPoints<P extends { ts: string }>(groups: P[][], value: (p: P) => number): { ts: string[]; values: Array<Array<number | null>> } {
  const ts = [...new Set(groups.flatMap((g) => g.map((p) => p.ts)))].sort()
  const values = groups.map((g) => {
    const by = new Map(g.map((p) => [p.ts, value(p)]))
    return ts.map((x) => by.get(x) ?? null)
  })
  return { ts, values }
}
