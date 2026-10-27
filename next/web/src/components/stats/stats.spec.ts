import { describe, expect, it } from 'vitest'
import type { UsageSummaryRow } from '@/api/types'
import { autoGranularity, bucketKey, bucketKeys, entityColors, escapeHtml, formatMs, hitRate, hourAllowed, rowTokens, topWithOther } from './stats'

const row = (key: string, requests: number, cost = 0): UsageSummaryRow => ({ key, requests, total_cost: String(cost), input_tokens: requests * 10 })

describe('stats helpers', () => {
  it('fills every local bucket of the range, so a quiet day is a zero and not a gap', () => {
    const from = new Date(2026, 9, 21, 0, 0).toISOString()
    const to = new Date(2026, 9, 24, 0, 0).toISOString()
    expect(bucketKeys(from, to, 'day')).toEqual(['2026-10-21', '2026-10-22', '2026-10-23'])
    const hours = bucketKeys(new Date(2026, 9, 27, 22, 30).toISOString(), new Date(2026, 9, 28, 1, 0).toISOString(), 'hour')
    expect(hours).toEqual(['2026-10-27 22:00', '2026-10-27 23:00', '2026-10-28 00:00'])
    expect(bucketKey(new Date(2026, 0, 2, 3, 4), 'hour')).toBe('2026-01-02 03:00')
    expect(bucketKeys('', '', 'day', [row('2026-10-02', 1), row('2026-10-01', 1)])).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('picks hours up to a day and refuses them past 31 days', () => {
    const now = Date.now()
    expect(autoGranularity(new Date(now - 23 * 3600_000).toISOString(), '')).toBe('hour')
    expect(autoGranularity(new Date(now - 3 * 86400_000).toISOString(), '')).toBe('day')
    expect(autoGranularity('', '')).toBe('day')
    expect(hourAllowed(new Date(now - 30 * 86400_000).toISOString(), '')).toBe(true)
    expect(hourAllowed(new Date(now - 40 * 86400_000).toISOString(), '')).toBe(false)
  })

  it('colors follow the entity, not its rank', () => {
    const a = entityColors(['claude-sonnet-4-5', 'gpt-5', 'gemini-2.5-pro'], false)
    const b = entityColors(['gemini-2.5-pro', 'claude-sonnet-4-5', 'gpt-5'], false)
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort())
    const many = entityColors(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], true)
    expect(new Set(many.values()).size).toBe(8) // collisions move to a free slot
  })

  it('folds everything past the top n into one "other" row', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`m${i}`, i + 1, (i + 1) / 10))
    const { top, other, otherCount } = topWithOther(rows, (r) => r.requests, 7)
    expect(top.map((r) => r.key)).toEqual(['m9', 'm8', 'm7', 'm6', 'm5', 'm4', 'm3'])
    expect(otherCount).toBe(3)
    expect(other?.requests).toBe(1 + 2 + 3)
    expect(Number(other?.total_cost)).toBeCloseTo(0.6)
    expect(topWithOther(rows.slice(0, 3), (r) => r.requests).other).toBeNull()
  })

  it('cache hit rate uses the normalized prompt and keeps unknown history unknown', () => {
    expect(hitRate({ key: '', requests: 1, total_cost: '0', cache_read_tokens: 100, prompt_tokens: 1000 })).toBeCloseTo(0.1)
    expect(hitRate({ key: '', requests: 1, total_cost: '0', cache_read_tokens: 100, prompt_tokens: null })).toBeNull()
    expect(hitRate(undefined)).toBeNull()
  })

  it('formats durations and counts tokens with both cache-write buckets', () => {
    expect([formatMs(850), formatMs(1800), formatMs(125_000), formatMs(0)]).toEqual(['850 ms', '1.8 s', '2 m 05 s', '—'])
    expect(rowTokens({ input_tokens: 1, output_tokens: 2, cache_read_tokens: 3, cache_creation_tokens: 4, cache_creation_1h_tokens: 5 })).toBe(15)
  })

  it('escapes names before they reach a tooltip', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">&\'')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;')
  })
})
