import type { Granularity } from '../stats'

// Pure helpers of the overview charts (no Vue, no host): bucket labels and
// the ECharts options handed to SChart. Tested in __tests__/chart.test.mts.

export interface LineSeries {
  name: string
  data: number[]
  /** Secondary measure (P95 latency): dashed line. */
  dashed?: boolean
}

const pad = (x: number) => String(x).padStart(2, '0')

/**
 * Label of a bucket start in the zone `tz` (minutes east of UTC): "HH:00"
 * by hour, "MM-DD" by day. Day buckets start at the zone's midnight, so the
 * label is that day.
 */
export function bucketLabel(ts: string, granularity: Granularity, tz: number): string {
  const ms = Date.parse(ts)
  if (Number.isNaN(ms)) return ts
  const d = new Date(ms + tz * 60000)
  return granularity === 'hour' ? `${pad(d.getUTCHours())}:00` : `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Labels of a list of points carrying `ts`. */
export function bucketLabels(points: Array<{ ts: string }>, granularity: Granularity, tz: number): string[] {
  return points.map((p) => bucketLabel(p.ts, granularity, tz))
}

/**
 * Upper bound of the value axis: the largest value rounded up to 1, 2, 2.5
 * or 5 times a power of ten, so the top tick is a round number. `floor` is
 * the minimum (an all-zero chart still gets an axis).
 */
export function niceMax(values: number[], floor = 1): number {
  const max = Math.max(floor, ...values.filter((v) => Number.isFinite(v)))
  const p = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 2, 2.5, 5, 10]) if (max <= m * p + 1e-9) return m * p
  return 10 * p
}

/** ECharts option of a line chart: one line per series, a legend when there are several. */
export function lineOption(labels: string[], series: LineSeries[], format: (v: number) => string, floor = 1) {
  const legend = series.length > 1
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => format(Number(v) || 0) },
    legend: legend ? { bottom: 0, type: 'scroll', data: series.map((s) => s.name) } : undefined,
    grid: { left: 64, right: 16, top: 16, bottom: legend ? 48 : 28 },
    xAxis: { type: 'category', boundaryGap: false, data: labels },
    yAxis: { type: 'value', min: 0, max: niceMax(series.flatMap((s) => s.data), floor), axisLabel: { formatter: (v: number) => format(v) } },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      showSymbol: labels.length <= 1,
      data: s.data,
      lineStyle: { width: 2, type: s.dashed ? 'dashed' : 'solid' }
    }))
  }
}

/** ECharts option of a single-series bar chart (cost trend). */
export function barOption(labels: string[], name: string, data: number[], format: (v: number) => string, color = '#6366f1') {
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => format(Number(v) || 0) },
    grid: { left: 64, right: 12, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0, axisLabel: { formatter: (v: number) => format(v) } },
    series: [{ name, type: 'bar', barMaxWidth: 20, color, data }]
  }
}
