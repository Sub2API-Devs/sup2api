// Account usage and usage limits (CONTRACTS §73): API calls and the figures
// the usage cell, its hover card and the editor show.
import { api } from '@sub2api/host'
import type { AccountUsage, AccountUsageDetail, AccountUsageFigures, AccountUsageLimit, AccountUsageLimitState, UsageLimitPeriod } from '@/api/types'
import { browserTZ } from '@/components/stats/stats'
import { usageLevel } from './usageLevel'

type Translate = (key: string, named?: Record<string, unknown>) => string

/** ?tz= of the requests carrying usage: "today" is the browser's day. */
export const todayQuery = () => ({ tz: browserTZ() })

export function fetchAccountUsage(id: number): Promise<AccountUsageDetail> {
  return api.get<AccountUsageDetail>(`/accounts/${id}/usage`, todayQuery())
}

export function fetchUsageLimit(id: number): Promise<AccountUsageLimit> {
  return api.get<AccountUsageLimit>(`/accounts/${id}/usage-limit`)
}

export function saveUsageLimit(id: number, limit: AccountUsageLimit): Promise<AccountUsageDetail> {
  return api.put<AccountUsageDetail>(`/accounts/${id}/usage-limit`, limit)
}

export function defaultUsageLimit(): AccountUsageLimit {
  return { raw_cost_accounting: false, enabled: false, amount: '0', period: 'month', period_count: 1, anchor: null, timezone: browserTZ() }
}

/** Largest period_count of each period: one period spans at most 366 days (as the server checks). */
export const PERIOD_COUNT_MAX: Record<UsageLimitPeriod, number> = { hour: 8784, day: 366, week: 52, month: 12, none: 1000 }

/** "per week", "per 2 weeks", "total". */
export function usagePeriodLabel(t: Translate, period: UsageLimitPeriod, count: number): string {
  return period !== 'none' && count > 1 ? t(`accounts.usage.perN.${period}`, { n: count }) : t(`accounts.usage.per.${period}`)
}

/** The cost the account's usage is counted in: raw (before the group multiplier) or charged. */
export function mainCost(u: Pick<AccountUsage, 'raw_cost_accounting'>, f: AccountUsageFigures | undefined): number {
  if (!f) return 0
  return Number(u.raw_cost_accounting ? f.raw_cost : f.cost) || 0
}

/** Level of the period figure: danger at the limit, warning from 90 %. */
export function limitLevel(l: AccountUsageLimitState) {
  const amount = Number(l.amount)
  return usageLevel(amount > 0 ? (Number(l.used) || 0) / amount : 0, 0.9)
}

/** The field that keeps a limit from being saved: an enabled limit needs an amount above 0. */
export function usageLimitError(l: AccountUsageLimit): 'amount' | 'period_count' | null {
  const amount = Number(l.amount)
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9 || (l.enabled && amount <= 0)) return 'amount'
  if (!Number.isInteger(l.period_count) || l.period_count < 1 || l.period_count > PERIOD_COUNT_MAX[l.period]) return 'period_count'
  return null
}
