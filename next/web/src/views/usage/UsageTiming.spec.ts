import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UsageTiming from './UsageTiming.vue'
import type { UsageRow } from './usage'

const render = (row: Partial<UsageRow>) => {
  i18n.global.locale.value = 'zh'
  return mount(UsageTiming, { props: { row: { stream: true, latency_ms: 6130, first_token_ms: 5040, output_tokens: 168, ...row } as UsageRow }, global: { plugins: [i18n] } })
}

describe('usage timing', () => {
  it('shows how long the body took to arrive, part of the first token', () => {
    const w = render({ upload_ms: 2120 })
    expect(w.text()).toContain('首 token')
    expect(w.get('[data-testid="usage-upload"]').text()).toContain('上传 2.12 s')
  })
  it('leaves out an upload under 0.1 s and rows without one', () => {
    expect(render({ upload_ms: 40 }).find('[data-testid="usage-upload"]').exists()).toBe(false)
    expect(render({}).find('[data-testid="usage-upload"]').exists()).toBe(false)
  })
})
