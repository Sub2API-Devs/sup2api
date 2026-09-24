import type { UsageLog } from '@/api/types'

/** Usage row/detail with the extra fields the billing module returns. */
export type UsageRow = UsageLog & {
  api_key_name?: string
  user_name?: string
  price?: { id: number; model: string; source: string; plugin_key?: string | null } | null
  metrics?: Record<string, number> | null
}

/** True when the core converted the request to another upstream protocol. */
export function isConverted(u: Pick<UsageLog, 'protocol' | 'upstream_protocol'>): boolean {
  return !!u.upstream_protocol && !!u.protocol && u.upstream_protocol !== u.protocol
}

export function billingTone(s: string): 'success' | 'warning' | 'danger' | 'gray' {
  if (s === 'billed') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'failed') return 'danger'
  return 'gray'
}

const BLOCK_DECISIONS = ['deny', 'reject', 'block', 'blocked']

/** True when a gateway hook rejected the request. */
export function isBlocked(u: UsageRow): boolean {
  if (/hook|blocked/i.test(u.error_type || '')) return true
  return (u.hook_decisions || []).some((h) => BLOCK_DECISIONS.includes(h.decision))
}

/** The blocking hook decision (plugin + note), if any. */
export function blockingHook(u: UsageRow) {
  return (u.hook_decisions || []).find((h) => BLOCK_DECISIONS.includes(h.decision)) || null
}

export interface DailyPoint {
  key: string
  requests: number
  cost: number
}

/** Chart option: requests (bars) + cost (line) per day. */
export function dailyChartOption(points: DailyPoint[], labels: { requests: string; cost: string }) {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: [labels.requests, labels.cost], top: 0 },
    grid: { left: 48, right: 56, top: 32, bottom: 28 },
    xAxis: { type: 'category', data: points.map((p) => p.key.slice(5)) },
    yAxis: [
      { type: 'value', minInterval: 1 },
      { type: 'value', axisLabel: { formatter: (v: number) => '$' + v }, splitLine: { show: false } }
    ],
    series: [
      { name: labels.requests, type: 'bar', data: points.map((p) => p.requests), barMaxWidth: 24 },
      { name: labels.cost, type: 'line', yAxisIndex: 1, smooth: true, data: points.map((p) => Number(p.cost.toFixed(6))) }
    ]
  }
}
