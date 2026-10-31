import { money, useModHost } from '../host'
import { latencyOverflow, percent } from './figures'

// Display formats shared by the overview cards.
export function useFormat() {
  const h = useModHost()
  const n = (v: number | null | undefined) => h.i18n.formatNumber(v ?? 0)
  /** Milliseconds, or "more than 10 s" in the open last latency bucket. */
  const ms = (v: number | null | undefined) => (latencyOverflow(v ?? 0) ? h.t('overviewP3.perf.overflow') : h.t('ms', { n: n(Math.round(v ?? 0)) }))
  /** A bucket-estimated quantile. */
  const approx = (v: number | null | undefined) => (latencyOverflow(v ?? 0) ? ms(v) : `≈ ${ms(v)}`)
  const time = (v: string | null | undefined) => (v ? h.i18n.formatDateTime(v) : '—')
  return { n, ms, approx, pct: percent, money, time }
}
