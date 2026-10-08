import { describe, expect, it } from 'vitest'
import { cacheWriteEvidence, componentCacheWriteMetrics, otherUsageMetrics } from './cacheWriteEvidence'

const evidence = (n: number) => ({ version: 1, total: { state: 'value', value: n }, explicit_5m: { state: 'null' }, explicit_1h: { state: 'absent' }, unclassified_tokens: n, completeness: 'partial', source: 'iteration', pricing_policy: 'platform_default_cache_write_compat' })

describe('independent cache evidence boundary', () => {
  it('projects actual Go PricedUsage capital Metrics without merging components', () => {
    // settler billingInputs uses lowercase additional/replacement; PricedUsage has no JSON tags.
    const input = { inputs: { additional: [{ Metrics: { cache_write_evidence: evidence(11) }, Model: 'not-rendered' }], replacement: [{ Metrics: { cache_write_evidence: evidence(22) } }, { Metrics: { cache_write_evidence: evidence(33) } }] } }
    const before = JSON.stringify(input)
    const rows = componentCacheWriteMetrics(input)
    expect(rows.map(row => [row.kind, row.index, cacheWriteEvidence(row.metrics)?.total.value])).toEqual([['additional', 1, 11], ['replacement', 1, 22], ['replacement', 2, 33]])
    expect(JSON.stringify(input)).toBe(before)
    expect(componentCacheWriteMetrics({ inputs: { additional: [{ metrics: { cache_write_evidence: evidence(99) } }] } })).toEqual([])
  })

  it('returns detached fixed counters and never echoes evidence extension secrets', () => {
    const raw = { ...evidence(12), private_debug: 'SECRET_FIXTURE', total: { state: 'value', value: 12, authorization: 'SECRET_FIXTURE' } }
    const parsed = cacheWriteEvidence({ cache_write_evidence: raw })!
    parsed.total.value = 99
    expect(raw.total.value).toBe(12)
    expect(JSON.stringify(parsed)).not.toContain('SECRET_FIXTURE')
    expect(otherUsageMetrics({ cache_write_evidence: { version: 99, token: 'SECRET_FIXTURE' } })).toEqual({})
  })

  it('does not convert unsafe int64 or null into a displayed numeric zero', () => {
    const nulls = cacheWriteEvidence({ cache_write_evidence: evidence(0) })!
    expect(nulls.explicit_5m).toEqual({ state: 'null' })
    expect(nulls.explicit_1h).toEqual({ state: 'absent' })
    for (const value of [2 ** 63, NaN, Infinity, -1, '0', null]) {
      expect(cacheWriteEvidence({ cache_write_evidence: { ...evidence(0), total: { state: 'value', value } } })).toBeNull()
    }
  })
})
