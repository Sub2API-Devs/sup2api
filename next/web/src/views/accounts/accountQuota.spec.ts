import { describe, expect, it, vi } from 'vitest'
import type { QuotaSnapshot } from '@/api/types'
import { QUOTA_REFRESH_MIN_MS, formatPercent, hasQuota, quotaCountdown, quotaLevel, sortWindows, useQuotaRefresh } from './accountQuota'

const snap = (over: Partial<QuotaSnapshot> = {}): QuotaSnapshot => ({ supported: true, source: 'passive', updated_at: null, error: '', windows: [], ...over })

describe('quota helpers', () => {
  it('hasQuota hides null and unsupported snapshots', () => {
    expect(hasQuota(null)).toBe(false)
    expect(hasQuota(undefined)).toBe(false)
    expect(hasQuota(snap({ supported: false }))).toBe(false)
    expect(hasQuota(snap())).toBe(true)
  })

  it('sorts known windows first, unknown keys after in server order', () => {
    const w = (key: string) => ({ key, utilization: 0, resets_at: null, status: '' as const })
    expect(sortWindows([w('x'), w('7d_fable'), w('7d'), w('y'), w('5h'), w('7d_sonnet')]).map((x) => x.key)).toEqual(['5h', '7d', '7d_sonnet', '7d_fable', 'x', 'y'])
    expect(sortWindows(null)).toEqual([])
  })

  it('colours by usage (75 / 90) and by upstream status', () => {
    expect(quotaLevel({ utilization: 74.9, status: 'allowed' })).toBe('ok')
    expect(quotaLevel({ utilization: 75, status: 'allowed' })).toBe('warning')
    expect(quotaLevel({ utilization: 89, status: '' })).toBe('warning')
    expect(quotaLevel({ utilization: 90, status: '' })).toBe('danger')
    expect(quotaLevel({ utilization: 10, status: 'allowed_warning' })).toBe('warning')
    expect(quotaLevel({ utilization: 10, status: 'rejected' })).toBe('danger')
  })

  it('formats percentages', () => {
    expect(formatPercent(41.6)).toBe('42%')
    expect(formatPercent(-3)).toBe('0%')
    expect(formatPercent(1200)).toBe('>999%')
    expect(formatPercent(Number.NaN)).toBe('—')
  })

  it('counts down to the reset', () => {
    const now = Date.parse('2026-10-05T00:00:00Z')
    const at = (sec: number) => new Date(now + sec * 1000).toISOString()
    expect(quotaCountdown(null, 10, now)).toEqual({ kind: 'none' })
    expect(quotaCountdown('garbage', 10, now)).toEqual({ kind: 'none' })
    expect(quotaCountdown(at(30), 10, now)).toEqual({ kind: 'in', text: '<1m' })
    expect(quotaCountdown(at(35 * 60 + 5), 10, now)).toEqual({ kind: 'in', text: '35m' })
    expect(quotaCountdown(at(4 * 3600 + 12 * 60), 10, now)).toEqual({ kind: 'in', text: '4h 12m' })
    expect(quotaCountdown(at(2 * 86400 + 3 * 3600 + 59), 10, now)).toEqual({ kind: 'in', text: '2d 3h' })
    expect(quotaCountdown(at(-5), 10, now)).toEqual({ kind: 'pending' })
    expect(quotaCountdown(at(-5), 0, now)).toEqual({ kind: 'now' })
  })
})

describe('useQuotaRefresh', () => {
  function setup(start = 1_000_000) {
    let t = start
    let release: (s: QuotaSnapshot) => void = () => {}
    const fetcher = vi.fn((_id: number) => new Promise<QuotaSnapshot>((ok) => (release = ok)))
    const onSnapshot = vi.fn()
    const onThrottled = vi.fn()
    const onError = vi.fn()
    const r = useQuotaRefresh({ fetcher, onSnapshot, onThrottled, onError, now: () => t })
    return { r, fetcher, onSnapshot, onThrottled, onError, advance: (ms: number) => (t += ms), resolve: (s: QuotaSnapshot) => release(s), now: () => t }
  }

  it('sends one request while refreshing and ignores further clicks', async () => {
    const s = setup()
    const first = s.r.refresh(7)
    expect(s.r.refreshing.has(7)).toBe(true)
    expect(await s.r.refresh(7)).toBe('busy')
    expect(s.fetcher).toHaveBeenCalledTimes(1)
    const fresh = snap({ source: 'active' })
    s.resolve(fresh)
    expect(await first).toBe('ok')
    expect(s.onSnapshot).toHaveBeenCalledWith(7, fresh)
    expect(s.r.refreshing.has(7)).toBe(false)
  })

  it('does not send again within 30 s; tells how long to wait', async () => {
    const s = setup()
    const p = s.r.refresh(7)
    s.resolve(snap())
    await p
    s.advance(10_000)
    expect(await s.r.refresh(7)).toBe('throttled')
    expect(s.onThrottled).toHaveBeenCalledWith(7, 20)
    expect(s.fetcher).toHaveBeenCalledTimes(1)
    // other accounts are independent
    const other = s.r.refresh(8)
    expect(s.fetcher).toHaveBeenCalledTimes(2)
    s.resolve(snap())
    await other
    s.advance(QUOTA_REFRESH_MIN_MS - 10_000)
    const again = s.r.refresh(7)
    expect(s.fetcher).toHaveBeenCalledTimes(3)
    s.resolve(snap())
    expect(await again).toBe('ok')
  })

  it('counts a recent active snapshot from the server toward the floor', async () => {
    const s = setup()
    const recent = snap({ source: 'active', updated_at: new Date(s.now() - 5_000).toISOString() })
    expect(await s.r.refresh(3, recent)).toBe('throttled')
    expect(s.onThrottled).toHaveBeenCalledWith(3, 25)
    // a passive snapshot (request headers) does not block a manual query
    const passive = snap({ source: 'passive', updated_at: new Date(s.now() - 5_000).toISOString() })
    const p = s.r.refresh(3, passive)
    expect(s.fetcher).toHaveBeenCalledTimes(1)
    s.resolve(snap())
    await p
  })

  it('caps a server timestamp in the future at now', async () => {
    const s = setup()
    const skewed = snap({ source: 'active', updated_at: new Date(s.now() + 3_600_000).toISOString() })
    expect(s.r.waitMs(3, skewed)).toBe(QUOTA_REFRESH_MIN_MS)
  })

  it('reports errors and clears the refreshing state', async () => {
    const s = setup()
    s.fetcher.mockImplementationOnce(() => Promise.reject(new Error('boom')))
    expect(await s.r.refresh(9)).toBe('error')
    expect(s.onError).toHaveBeenCalledWith(9, expect.any(Error))
    expect(s.onSnapshot).not.toHaveBeenCalled()
    expect(s.r.refreshing.has(9)).toBe(false)
  })
})
