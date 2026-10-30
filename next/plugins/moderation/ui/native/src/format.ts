import { enumLabel, useModHost, type Spec } from './host'

// Display formatting shared by the moderation views (locale from the host).

/** Integer / decimal in the console locale; null and undefined are 0. */
export function num(v: number | null | undefined): string {
  return useModHost().i18n.formatNumber(v ?? 0)
}

/** A 0–1 ratio as a percentage with one decimal ("12.5%"); 0 is "0%". */
export function pct(ratio: number | null | undefined): string {
  const v = (ratio ?? 0) * 100
  return `${v === 0 ? 0 : Number(v.toFixed(1))}%`
}

/** Milliseconds ("120 毫秒"). */
export function ms(v: number | null | undefined): string {
  return useModHost().t('ms', { n: num(Math.round(v ?? 0)) })
}

/** The last latency bucket is open-ended: quantiles above it read "> 10 秒". */
const LATENCY_BUCKET_MAX_MS = 10_000
export function latency(v: number | null | undefined): string {
  return (v ?? 0) > LATENCY_BUCKET_MAX_MS ? useModHost().t('stats.over10s') : ms(v)
}

/** Date and time in the console locale; '—' when empty. */
export function dt(v: string | null | undefined): string {
  return v ? useModHost().i18n.formatDateTime(v) : '—'
}

/** "#42" for an id, '—' for 0 / null. */
export const idText = (v: number | null | undefined) => (v ? `#${v}` : '—')

/** Error rate above the alert threshold (percent) or flagged by the backend. */
export function overAlert(errorRate: number, alertPercent: number, flagged = false): boolean {
  return flagged || (alertPercent > 0 && errorRate * 100 > alertPercent)
}

/** "全部模型 · 采样率 100 · 总超时 0" of a flow spec. */
export function specText(s: Spec | undefined): string {
  if (!s) return ''
  const t = useModHost().t
  const mf = s.model_filter
  const models = mf?.type && mf.type !== 'all' ? `${enumLabel('modelFilter', mf.type)}: ${(mf.models || []).join(', ')}` : enumLabel('modelFilter', 'all')
  return `${models} · ${t('flows.sampleRate')} ${s.sample_rate} · ${t('flows.totalTimeout')} ${s.total_timeout_ms}`
}
