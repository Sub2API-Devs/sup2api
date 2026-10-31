// Subscription quota of accounts (5h / 7d / 7d Sonnet / 7d Fable windows):
// API calls, display helpers and manual refresh. The list
// endpoint already carries every row's snapshot, so the page never polls this
// per row — only the "refresh" action asks the upstream (force=true).
import { onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import { api } from '@sub2api/host'
import type { Account, AccountBalance, CredentialRefreshOutcome, QuotaSnapshot, QuotaWindow } from '@/api/types'
import { usageLevel, type UsageLevel } from './usageLevel'

/** GET /accounts/:id/quota — `force` makes the server query the upstream now. */
export function fetchAccountQuota(id: number, force = true): Promise<QuotaSnapshot> {
  return api.get<QuotaSnapshot>(`/accounts/${id}/quota`, force ? { force: true } : undefined)
}

/** POST /accounts/:id/reset-status — restores active status and clears the reason and cooldown. */
export function resetAccountStatus(id: number): Promise<Account> {
  return api.post<Account>(`/accounts/${id}/reset-status`)
}

/** Whether a snapshot is worth a cell: null (API keys) and unsupported types show nothing. */
export function hasQuota(q: QuotaSnapshot | null | undefined): q is QuotaSnapshot {
  return !!q && q.supported
}

export function sortWindows(windows: QuotaWindow[] | null | undefined): QuotaWindow[] {
  return [...(windows || [])]
}

export type QuotaLevel = UsageLevel

/**
 * Colour level of a window (thresholds as sub2api's usage bars): rejected or
 * ≥ 90 % is danger, an upstream warning or ≥ 75 % is warning.
 */
export function quotaLevel(w: Pick<QuotaWindow, 'utilization' | 'status'>): QuotaLevel {
  if (w.status === 'rejected') return 'danger'
  const level = usageLevel(w.utilization / 100, 0.75, 0.9)
  return level === 'ok' && w.status === 'allowed_warning' ? 'warning' : level
}

/** "42%", rounded; ">999%" beyond. */
export function formatPercent(utilization: number): string {
  if (!Number.isFinite(utilization)) return '—'
  const p = Math.round(Math.max(0, utilization))
  return p > 999 ? '>999%' : `${p}%`
}

export type Countdown = { kind: 'none' } | { kind: 'pending' } | { kind: 'in'; text: string }

export function quotaCountdown(resetsAt: string | null | undefined, nowMs: number, expired = false): Countdown {
  if (expired) return { kind: 'pending' }
  if (!resetsAt) return { kind: 'none' }
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return { kind: 'none' }
  const diff = at - nowMs
  if (diff <= 0) return { kind: 'pending' }
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  if (hours >= 24) return { kind: 'in', text: `${Math.floor(hours / 24)}d ${hours % 24}h` }
  if (hours > 0) return { kind: 'in', text: `${hours}h ${mins % 60}m` }
  return { kind: 'in', text: mins > 0 ? `${mins}m` : '<1m' }
}

// ---------------------------------------------------------------- shared clock

const clock = ref(Date.now())
let clockUsers = 0
let clockTimer: ReturnType<typeof setInterval> | undefined

/**
 * One 30 s ticker shared by every quota cell on the page (instead of a timer
 * per row), so countdowns move even with the list's auto refresh off.
 */
export function useQuotaClock(): Ref<number> {
  if (clockUsers++ === 0) {
    clock.value = Date.now()
    clockTimer = setInterval(() => (clock.value = Date.now()), 30_000)
  }
  onBeforeUnmount(() => {
    if (--clockUsers === 0) clearInterval(clockTimer)
  })
  return clock
}

// ---------------------------------------------------------------- manual refresh

export type RefreshOutcome = 'ok' | 'busy' | 'throttled' | 'error'

export interface QuotaRefreshOptions {
  /** A fresh snapshot for the account. */
  onSnapshot: (id: number, snapshot: QuotaSnapshot) => void
  onError?: (id: number, e: unknown) => void
  /** Injected in tests. */
  fetcher?: (id: number) => Promise<QuotaSnapshot>
}

/**
 * Manual "refresh usage" without a cooldown after completion. While a request
 * runs the account is in `refreshing` and duplicate clicks are ignored.
 */
export function useQuotaRefresh(opts: QuotaRefreshOptions) {
  const fetcher = opts.fetcher ?? ((id: number) => fetchAccountQuota(id, true))
  const refreshing = reactive(new Set<number>())
  async function refresh(id: number): Promise<RefreshOutcome> {
    if (refreshing.has(id)) return 'busy'
    refreshing.add(id)
    try {
      opts.onSnapshot(id, await fetcher(id))
      return 'ok'
    } catch (e) {
      opts.onError?.(id, e)
      return 'error'
    } finally {
      refreshing.delete(id)
    }
  }

  return { refreshing, refresh }
}

/** POST /accounts/:id/refresh-credentials — renews the credentials now (CONTRACTS §48). */
export function refreshAccountCredentials(id: number): Promise<CredentialRefreshOutcome> {
  return api.post<CredentialRefreshOutcome>(`/accounts/${id}/refresh-credentials`)
}

// ---------------------------------------------------------------- balance (CONTRACTS §52)

/** Whether a balance snapshot exists and should be shown. */
export function hasBalance(b: AccountBalance | null | undefined): b is AccountBalance {
  return !!b
}

/** GET /accounts/:id/balance — returns the cached balance or queries the upstream. */
export function fetchAccountBalance(id: number): Promise<AccountBalance> {
  return api.get<AccountBalance>(`/accounts/${id}/balance`)
}

/** POST /accounts/:id/refresh-balance — force refresh (ignores freshness, subject to 2s rate limit). */
export function refreshAccountBalance(id: number): Promise<AccountBalance> {
  return api.post<AccountBalance>(`/accounts/${id}/refresh-balance`)
}

export interface BalanceRefreshOptions {
  /** A fresh balance snapshot for the account. */
  onSnapshot: (id: number, snapshot: AccountBalance) => void
  /** Clicked again too soon; nothing was sent. */
  onThrottled?: (id: number, waitSeconds: number) => void
  onError?: (id: number, e: unknown) => void
  /** Injected in tests. */
  fetcher?: (id: number) => Promise<AccountBalance>
  now?: () => number
}

/** Manual "refresh balance" with a 2s floor per account (same logic as quota refresh). */
export function useBalanceRefresh(opts: BalanceRefreshOptions) {
  const now = opts.now ?? Date.now
  const fetcher = opts.fetcher ?? refreshAccountBalance
  const refreshing = reactive(new Set<number>())
  const lastAt = new Map<number, number>()
  const MIN_MS = 2_000

  function waitMs(id: number, current?: AccountBalance | null): number {
    const t = now()
    let base = lastAt.get(id) ?? 0
    if (current?.updated_at) {
      const at = Date.parse(current.updated_at)
      if (!Number.isNaN(at)) base = Math.max(base, Math.min(at, t))
    }
    return Math.max(0, base + MIN_MS - t)
  }

  async function refresh(id: number, current?: AccountBalance | null): Promise<RefreshOutcome> {
    if (refreshing.has(id)) return 'busy'
    const wait = waitMs(id, current)
    if (wait > 0) {
      opts.onThrottled?.(id, Math.ceil(wait / 1000))
      return 'throttled'
    }
    refreshing.add(id)
    lastAt.set(id, now())
    try {
      opts.onSnapshot(id, await fetcher(id))
      return 'ok'
    } catch (e) {
      opts.onError?.(id, e)
      return 'error'
    } finally {
      refreshing.delete(id)
    }
  }

  return { refreshing, refresh, waitMs }
}
