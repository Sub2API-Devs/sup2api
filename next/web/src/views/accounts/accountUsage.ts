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

/** Most decimals an amount may have (the server keeps 8). */
export const AMOUNT_DECIMALS = 8

/** Decimals of a decimal string ("0.125" → 3, "1e-7" → 7); NaN when it is not a plain number. */
export function amountDecimals(v: string): number {
  const m = /^\+?\d*(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(v.trim())
  if (!m || !/\d/.test(v)) return Number.NaN
  return Math.max(0, (m[1]?.replace(/0+$/, '').length ?? 0) - Number(m[2] ?? 0))
}

/**
 * The field that keeps a limit from being saved: an enabled limit needs an
 * amount above 0, with at most 8 decimals. A switched-off limit may have no
 * amount (usageLimitBody sends one). "none" (lifetime) has no period length.
 */
export function usageLimitError(l: AccountUsageLimit): 'amount' | 'period_count' | null {
  const raw = String(l.amount ?? '').trim()
  if (raw !== '' || l.enabled) {
    const amount = Number(raw)
    if (raw === '' || !Number.isFinite(amount) || amount < 0 || amount > 1e9 || (l.enabled && amount <= 0) || !(amountDecimals(raw) <= AMOUNT_DECIMALS)) return 'amount'
  }
  if (l.period !== 'none' && (!Number.isInteger(l.period_count) || l.period_count < 1 || l.period_count > PERIOD_COUNT_MAX[l.period])) return 'period_count'
  return null
}

/**
 * The anchor the server stores for `iso`: floored to the whole UTC hour for
 * hourly periods (§73: an hour of a half-hour zone such as Asia/Kolkata would
 * split the usage buckets), otherwise to the whole hour of the limit's zone.
 * Only the browser's zone can be floored here; another zone is left to the
 * server. null stays null.
 */
export function anchorFloor(iso: string | null, period: UsageLimitPeriod, timezone = browserTZ()): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  if (period === 'hour') d.setUTCMinutes(0, 0, 0)
  else if (timezone === browserTZ()) d.setMinutes(0, 0, 0)
  else return iso
  return d.toISOString()
}

/**
 * The PUT body of a limit. A switched-off limit with no amount sends the last
 * saved amount (or "0"): an older core refuses an empty amount. "none" sends
 * period_count 1: an older core still checks it against "none"'s cap. The
 * anchor is floored as the server will store it.
 */
export function usageLimitBody(l: AccountUsageLimit, savedAmount = '0'): AccountUsageLimit {
  const amount = String(l.amount ?? '').trim()
  return {
    ...l,
    amount: amount === '' && !l.enabled ? savedAmount.trim() || '0' : amount,
    period_count: l.period === 'none' ? 1 : l.period_count,
    anchor: anchorFloor(l.anchor, l.period, l.timezone)
  }
}

/**
 * The server's limit of an account that never saved one. An older core sends
 * it with timezone "UTC" and no other sign; a newer one sends timezone "".
 */
const SERVER_DEFAULT = { raw_cost_accounting: false, enabled: false, period: 'month', period_count: 1, anchor: null } as const

/** Whether a loaded limit is the server's default of an account that never saved one. */
export function neverSaved(l: Partial<AccountUsageLimit>): boolean {
  if (l.configured != null) return !l.configured
  if (l.timezone === '' || l.timezone == null) return true
  if (l.timezone !== 'UTC') return false
  return (Object.keys(SERVER_DEFAULT) as (keyof typeof SERVER_DEFAULT)[]).every((k) => (l[k] ?? null) === SERVER_DEFAULT[k]) && Number(l.amount) === 0
}

/** A loaded limit for the editor: a limit never saved takes the browser's time zone. */
export function loadedUsageLimit(l: Partial<AccountUsageLimit>): AccountUsageLimit {
  const v = { ...defaultUsageLimit(), ...l }
  return neverSaved(l) ? { ...v, timezone: browserTZ() } : v
}
