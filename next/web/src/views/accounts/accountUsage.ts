// Account usage and usage limits (CONTRACTS §73): API calls and the figures
// the usage cell, its hover card and the editor show.
import { api } from '@sub2api/host'
import type { AccountUsage, AccountUsageDetail, AccountUsageFigures, AccountUsageLimit, AccountUsageLimitState } from '@/api/types'

export function fetchAccountUsage(id: number): Promise<AccountUsageDetail> {
  return api.get<AccountUsageDetail>(`/accounts/${id}/usage`)
}

export function fetchUsageLimit(id: number): Promise<AccountUsageLimit> {
  return api.get<AccountUsageLimit>(`/accounts/${id}/usage-limit`)
}

export function saveUsageLimit(id: number, limit: AccountUsageLimit): Promise<AccountUsageDetail> {
  return api.put<AccountUsageDetail>(`/accounts/${id}/usage-limit`, limit)
}

export function defaultUsageLimit(): AccountUsageLimit {
  return { raw_cost_accounting: false, enabled: false, amount: '0', period: 'month', period_count: 1, anchor: null }
}

/** The cost the account's usage is counted in: raw (before the group multiplier) or charged. */
export function mainCost(u: Pick<AccountUsage, 'raw_cost_accounting'>, f: AccountUsageFigures | undefined): number {
  if (!f) return 0
  return Number(u.raw_cost_accounting ? f.raw_cost : f.cost) || 0
}

/** Share of the limit used, 0–∞. */
export function limitShare(l: AccountUsageLimitState): number {
  const amount = Number(l.amount)
  return amount > 0 ? (Number(l.used) || 0) / amount : 0
}

/** Tone of the period figure: danger at the limit, warning from 90 %. */
export function limitTone(l: AccountUsageLimitState): 'danger' | 'warning' | 'normal' {
  const share = limitShare(l)
  if (share >= 1) return 'danger'
  if (share >= 0.9) return 'warning'
  return 'normal'
}

/** Whether a submitted limit can be saved: an enabled limit needs an amount above 0. */
export function usageLimitError(l: AccountUsageLimit): 'amount' | 'period_count' | null {
  const amount = Number(l.amount)
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9 || (l.enabled && amount <= 0)) return 'amount'
  if (!Number.isInteger(l.period_count) || l.period_count < 1 || l.period_count > 1000) return 'period_count'
  return null
}

/** status_reason the usage limit writes (server constant usageLimitReason). */
export const USAGE_LIMIT_REASON = 'usage limit reached'

/** The figures after "usage limit reached: " ("$200.00 / $200.00 (per week)"), or null for other reasons. */
export function usageLimitReasonDetail(reason: string | undefined | null): string | null {
  if (!reason || !reason.startsWith(USAGE_LIMIT_REASON)) return null
  return reason.slice(USAGE_LIMIT_REASON.length).replace(/^:\s*/, '')
}
