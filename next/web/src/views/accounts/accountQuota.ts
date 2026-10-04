// Subscription quota of accounts (5h / 7d / 7d Sonnet / 7d Fable windows):
// API calls, display helpers and the throttled manual refresh. The list
// endpoint already carries every row's snapshot, so the page never polls this
// per row — only the "refresh" action asks the upstream (force=true).
import { onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import { api } from '@sub2api/host'
import type { CredentialRefreshOutcome, QuotaSnapshot, QuotaWindow } from '@/api/types'

/** The server answers force refreshes at most this often per account; the console does not ask sooner. */
export const QUOTA_REFRESH_MIN_MS = 30_000

/** Known window keys, in display order. Unknown keys follow in server order. */
export const KNOWN_QUOTA_WINDOWS = ['5h', '7d', '7d_sonnet', '7d_fable'] as const

/** GET /accounts/:id/quota — `force` makes the server query the upstream now. */
export function fetchAccountQuota(id: number, force = true): Promise<QuotaSnapshot> {
  return api.get<QuotaSnapshot>(`/accounts/${id}/quota`, force ? { force: true } : undefined)
}

/** POST /accounts/:id/reset-status — clears the cooldown / rate-limit state of the account. */
export function resetAccountStatus(id: number): Promise<unknown> {
  return api.post(`/accounts/${id}/reset-status`)
}

/** Whether a snapshot is worth a cell: null (API keys) and unsupported types show nothing. */
export function hasQuota(q: QuotaSnapshot | null | undefined): q is QuotaSnapshot {
  return !!q && q.supported
}

/** Windows sorted as KNOWN_QUOTA_WINDOWS, unknown keys last (stable). */
export function sortWindows(windows: QuotaWindow[] | null | undefined): QuotaWindow[] {
  const rank = (k: string) => {
    const i = (KNOWN_QUOTA_WINDOWS as readonly string[]).indexOf(k)
    return i < 0 ? KNOWN_QUOTA_WINDOWS.length : i
  }
  return [...(windows || [])].sort((a, b) => rank(a.key) - rank(b.key))
}

export function isKnownWindow(key: string): key is (typeof KNOWN_QUOTA_WINDOWS)[number] {
  return (KNOWN_QUOTA_WINDOWS as readonly string[]).includes(key)
}

export type QuotaLevel = 'ok' | 'warning' | 'danger'

/**
 * Colour level of a window (thresholds as sub2api's usage bars): rejected or
 * ≥ 90 % is danger, an upstream warning or ≥ 75 % is warning.
 */
export function quotaLevel(w: Pick<QuotaWindow, 'utilization' | 'status'>): QuotaLevel {
  if (w.status === 'rejected' || w.utilization >= 90) return 'danger'
  if (w.status === 'allowed_warning' || w.utilization >= 75) return 'warning'
  return 'ok'
}

/** "42%", rounded; ">999%" beyond. */
export function formatPercent(utilization: number): string {
  if (!Number.isFinite(utilization)) return '—'
  const p = Math.round(Math.max(0, utilization))
  return p > 999 ? '>999%' : `${p}%`
}

export type Countdown = { kind: 'none' } | { kind: 'now' } | { kind: 'pending' } | { kind: 'in'; text: string }

/**
 * Time until the window resets: "2d 3h", "4h 12m", "35m", "<1m". A reset time
 * in the past is "now" when nothing is used, else "pending" (the snapshot has
 * not seen the new window yet).
 */
export function quotaCountdown(resetsAt: string | null | undefined, utilization: number, nowMs: number): Countdown {
  if (!resetsAt) return { kind: 'none' }
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return { kind: 'none' }
  const diff = at - nowMs
  if (diff <= 0) return utilization > 0 ? { kind: 'pending' } : { kind: 'now' }
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

// ---------------------------------------------------------------- throttled refresh

export type RefreshOutcome = 'ok' | 'busy' | 'throttled' | 'error'

export interface QuotaRefreshOptions {
  /** A fresh snapshot for the account. */
  onSnapshot: (id: number, snapshot: QuotaSnapshot) => void
  /** Clicked again within QUOTA_REFRESH_MIN_MS; nothing was sent. */
  onThrottled?: (id: number, waitSeconds: number) => void
  onError?: (id: number, e: unknown) => void
  /** Injected in tests. */
  fetcher?: (id: number) => Promise<QuotaSnapshot>
  now?: () => number
}

/**
 * Manual "refresh usage" with a per-account 30 s floor. The floor starts at
 * the last click in this page and at the snapshot's `updated_at` when it came
 * from an active query (a server timestamp in the future counts as now).
 * While a request runs the account is in `refreshing` and further clicks are
 * ignored.
 */
export function useQuotaRefresh(opts: QuotaRefreshOptions) {
  const now = opts.now ?? Date.now
  const fetcher = opts.fetcher ?? ((id: number) => fetchAccountQuota(id, true))
  const refreshing = reactive(new Set<number>())
  const lastAt = new Map<number, number>()

  /** Milliseconds until a force refresh of the account may be sent (0 = now). */
  function waitMs(id: number, current?: QuotaSnapshot | null): number {
    const t = now()
    let base = lastAt.get(id) ?? 0
    if (current?.source === 'active' && current.updated_at) {
      const at = Date.parse(current.updated_at)
      if (!Number.isNaN(at)) base = Math.max(base, Math.min(at, t))
    }
    return Math.max(0, base + QUOTA_REFRESH_MIN_MS - t)
  }

  async function refresh(id: number, current?: QuotaSnapshot | null): Promise<RefreshOutcome> {
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

/** POST /accounts/:id/refresh-credentials — renews the credentials now (CONTRACTS §48). */
export function refreshAccountCredentials(id: number): Promise<CredentialRefreshOutcome> {
  return api.post<CredentialRefreshOutcome>(`/accounts/${id}/refresh-credentials`)
}
