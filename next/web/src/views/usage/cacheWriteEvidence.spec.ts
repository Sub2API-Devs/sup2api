import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CacheWriteFacts from './CacheWriteFacts.vue'
import { cacheWriteEvidence, otherUsageMetrics } from './cacheWriteEvidence'

enableAutoUnmount(afterEach)

function fixture() {
  return { version: 1, total: { state: 'value', value: 2595 }, explicit_5m: { state: 'value', value: 0 }, explicit_1h: { state: 'value', value: 1376 }, unclassified_tokens: 1219, completeness: 'partial', source: 'sse', pricing_policy: 'platform_default_cache_write_compat' }
}

function render(value: unknown) {
  i18n.global.locale.value = 'zh'
  return mount(CacheWriteFacts, { props: { metrics: { cache_write_evidence: value }, hasCacheWrites: true }, global: { plugins: [i18n] } })
}

describe('safe cache write evidence', () => {
  it('keeps explicit zero separate from absent, null and invalid counters', () => {
    const raw = { ...fixture(), total: { state: 'absent' }, explicit_5m: { state: 'null' }, explicit_1h: { state: 'invalid' }, unclassified_tokens: undefined, completeness: 'unknown' }
    const wrapper = render(raw)
    expect(wrapper.findAll('dd').map(node => node.text())).toEqual(['未报告', '报告为空', '报告值无效', '—'])
    expect(render(fixture()).findAll('dd').map(node => node.text())).toEqual(['2,595', '0', '1,376', '1,219'])
  })

  it('rejects unsupported versions, enums and unsafe counts without echoing arbitrary fields', () => {
    const invalid = [null, [], { ...fixture(), version: 2 }, { ...fixture(), completeness: 'secret' }, { ...fixture(), source: 'secret' }, { ...fixture(), pricing_policy: 'secret' },
      ...[-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '1219'].map(value => ({ ...fixture(), unclassified_tokens: value })),
      { ...fixture(), total: { state: 'value', value: '2595' } }, { ...fixture(), explicit_5m: { state: 'absent', value: 0 } }]
    for (const raw of invalid) {
      const wrapper = render(raw)
      expect(wrapper.find('[data-testid="cache-write-facts"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('没有可用的 TTL 来源证据')
      expect(wrapper.text()).not.toContain('secret')
    }
  })

  it('does not leak extension fields or mutate the evidence source', () => {
    const raw = { ...fixture(), debug_token: 'secret', total: { state: 'value', value: 2595, private_url: 'secret' } }
    const before = JSON.stringify(raw)
    const parsed = cacheWriteEvidence({ cache_write_evidence: raw })!
    expect(JSON.stringify(parsed)).not.toContain('secret')
    expect(render(raw).text()).not.toContain('secret')
    expect(JSON.stringify(raw)).toBe(before)
    expect(otherUsageMetrics({ cache_write_evidence: { version: 99, debug: 'secret' }, requests: 2 })).toEqual({ requests: 2 })
  })

  it('renders complete and inconsistent statuses without inferring a missing residual', () => {
    const complete = { ...fixture(), total: { state: 'value', value: 1376 }, unclassified_tokens: 0, completeness: 'complete' }
    expect(render(complete).text()).toContain('TTL 细分完整')
    const conflict = { ...fixture(), total: { state: 'value', value: 1 }, unclassified_tokens: undefined, completeness: 'inconsistent' }
    const wrapper = render(conflict)
    expect(wrapper.text()).toContain('计数不一致')
    expect(wrapper.findAll('dd').at(-1)!.text()).toBe('—')
  })
})
