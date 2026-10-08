import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UsageTokens from './UsageTokens.vue'
import UsageTokenFacts from './UsageTokenFacts.vue'
import BillingBreakdown from '@/views/prices/BillingBreakdown.vue'
import type { UsageRow } from './usage'

enableAutoUnmount(afterEach)

describe('cache usage facts and billing categories', () => {
  it('includes 1h writes in cache-only failed rows and in the write tooltip', () => {
    i18n.global.locale.value = 'zh'
    const row = { success: false, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0, cache_creation_1h_tokens: 1647 } as UsageRow
    const wrapper = mount(UsageTokens, { props: { row }, global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('1,647')
    expect(wrapper.attributes('title')).toContain('缓存写 1,647')
  })

  it('does not label historical default billing bucket as observed 5m usage', () => {
    i18n.global.locale.value = 'zh'
    const wrapper = mount(UsageTokenFacts, { props: { tokens: { cache_creation_tokens: 1219, cache_creation_1h_tokens: 1376 } }, global: { plugins: [i18n] } })
    expect(wrapper.text()).not.toContain('缓存写 5 分钟')
    expect(wrapper.text()).toContain('默认计费桶')
  })

  it('lets usage label billing buckets without changing the breakdown or price editor defaults', () => {
    const breakdown = { items: [{ label: 'cc', quantity: 1219, rate: '3.75', cost: '0.00457125' }] }
    const before = JSON.stringify(breakdown)
    const wrapper = mount(BillingBreakdown, { props: { breakdown, cacheWriteLabels: { default: '默认计费桶', oneHour: '1 小时计费桶' } }, global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('默认计费桶')
    expect(wrapper.text()).toContain('1,219')
    expect(wrapper.text()).toContain('3.75')
    expect(wrapper.text()).not.toContain('5 分钟')
    expect(JSON.stringify(breakdown)).toBe(before)
    const editor = mount(BillingBreakdown, { props: { breakdown }, global: { plugins: [i18n] } })
    expect(editor.text()).toContain('缓存写 5 分钟')
  })
})
