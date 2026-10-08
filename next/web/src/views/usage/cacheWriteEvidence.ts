export const cacheWriteEvidenceKey = 'cache_write_evidence'

type CounterState = 'value' | 'absent' | 'null' | 'invalid'
export type CacheWriteCounter = { state: CounterState; value?: number }
export interface CacheWriteEvidence {
  version: 1
  total: CacheWriteCounter
  explicit_5m: CacheWriteCounter
  explicit_1h: CacheWriteCounter
  unclassified_tokens?: number
  completeness: 'complete' | 'partial' | 'unknown' | 'inconsistent'
  source: 'json' | 'sse' | 'iteration'
  pricing_policy: 'platform_default_cache_write_compat'
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function counter(value: unknown): CacheWriteCounter | null {
  if (!object(value)) return null
  if (value.state === 'value') return count(value.value) ? { state: 'value', value: value.value } : null
  if (value.state !== 'absent' && value.state !== 'null' && value.state !== 'invalid') return null
  return value.value === undefined ? { state: value.state } : null
}

/** Read only the versioned safe projection. Never render arbitrary evidence fields. */
export function cacheWriteEvidence(metrics: unknown): CacheWriteEvidence | null {
  if (!object(metrics)) return null
  const raw = metrics[cacheWriteEvidenceKey]
  if (!object(raw) || raw.version !== 1 || raw.pricing_policy !== 'platform_default_cache_write_compat') return null
  if (raw.source !== 'json' && raw.source !== 'sse' && raw.source !== 'iteration') return null
  if (raw.completeness !== 'complete' && raw.completeness !== 'partial' && raw.completeness !== 'unknown' && raw.completeness !== 'inconsistent') return null
  const total = counter(raw.total), five = counter(raw.explicit_5m), hour = counter(raw.explicit_1h)
  if (!total || !five || !hour) return null
  if (raw.unclassified_tokens !== undefined && !count(raw.unclassified_tokens)) return null
  return {
    version: 1, total, explicit_5m: five, explicit_1h: hour,
    ...(raw.unclassified_tokens === undefined ? {} : { unclassified_tokens: raw.unclassified_tokens }),
    completeness: raw.completeness, source: raw.source, pricing_policy: raw.pricing_policy
  }
}

/** The structured evidence is rendered separately even when it is invalid or newer. */
export function otherUsageMetrics(metrics: unknown): Record<string, unknown> {
  if (!object(metrics)) return {}
  return Object.fromEntries(Object.entries(metrics).filter(([key]) => key !== cacheWriteEvidenceKey))
}

/** Preserve each independently billed component; never combine TTL snapshots. */
export function componentCacheWriteMetrics(billingDetail: unknown): Array<{ kind: 'additional' | 'replacement'; index: number; metrics: unknown }> {
  if (!object(billingDetail) || !object(billingDetail.inputs)) return []
  const result: Array<{ kind: 'additional' | 'replacement'; index: number; metrics: unknown }> = []
  for (const kind of ['additional', 'replacement'] as const) {
    const values = billingDetail.inputs[kind]
    if (!Array.isArray(values)) continue
    values.forEach((value, index) => {
      if (object(value) && cacheWriteEvidence(value.Metrics)) result.push({ kind, index: index + 1, metrics: value.Metrics })
    })
  }
  return result
}
