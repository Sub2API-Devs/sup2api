import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { SProgress, STooltip } from '@sub2api/ui'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyQuotaCell from './KeyQuotaCell.vue'

const render = (k: Partial<ApiKey>) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyQuotaCell, {
    props: { apiKey: { id: 1, name: 'k', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', ...k } as ApiKey },
    global: { plugins: [i18n] },
    attachTo: document.body
  })
}
enableAutoUnmount(afterEach)
type Cell = ReturnType<typeof render>
const figures = (w: Cell) => w.text().replace(/\s+/g, '')
const bar = (w: Cell) => w.findComponent(SProgress)
/** What the tooltip of the cell says. */
const tip = (w: Cell) => w.getComponent(STooltip).props('content')

describe('API key quota cell', () => {
  it('shows what is left of the limit over a bar of it, the charges in the tooltip', () => {
    const w = render({ quota_limit: '20', quota_used: '17.3' })
    expect(figures(w)).toBe('$2.70/$20.00')
    expect(bar(w).props()).toMatchObject({ max: 20, tone: 'warning' })
    expect(bar(w).props('value')).toBeCloseTo(2.7)
    expect(tip(w)).toBe('已用 $17.30')
  })

  it('shows an unused quota whole', () => {
    const w = render({ quota_limit: '20', quota_used: '0' })
    expect(figures(w)).toBe('$20.00/$20.00')
    expect(bar(w).props()).toMatchObject({ value: 20, max: 20, tone: 'success' })
    expect(w.find('.text-red-600').exists()).toBe(false)
  })

  it('shows a used-up quota as $0.00 in red over an empty bar, also when the charges passed the limit', () => {
    for (const used of ['5', '5.42']) {
      const w = render({ quota_limit: '5', quota_used: used })
      expect(figures(w)).toBe('$0.00/$5.00')
      expect(w.get('.text-red-600').text()).toBe('$0.00')
      expect(bar(w).props()).toMatchObject({ value: 0, max: 5, tone: 'danger' })
    }
  })

  it('reads "unlimited" without a bar for a key with no limit, the charges in the tooltip', () => {
    for (const k of [{ quota_limit: '0', quota_used: '3.2' }, { quota_used: '3.2' }]) {
      const w = render(k)
      expect(w.text()).toBe('无限额度')
      expect(bar(w).exists()).toBe(false)
      expect(tip(w)).toBe('已用 $3.20')
    }
  })

  it('says what the key used to the keyboard as well: the figures take the focus', async () => {
    const w = render({ quota_limit: '20', quota_used: '17.3' })
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    w.get<HTMLElement>('[tabindex="0"]').element.focus()
    await w.vm.$nextTick()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('已用 $17.30')
  })
})
