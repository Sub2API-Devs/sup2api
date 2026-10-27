import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { UsageSummaryRow } from '@/api/types'
import RankingBars from './RankingBars.vue'

vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light' }) }))
enableAutoUnmount(afterEach)

const row = (key: string, cost: string, requests: number, email?: string): UsageSummaryRow => ({ key, requests, total_cost: cost, input_tokens: requests * 10, user_email: email })

describe('RankingBars', () => {
  it('ranks with medals, folds "other" in gray and selects only ranked rows', async () => {
    i18n.global.locale.value = 'zh'
    const rows = [row('1', '9', 3, 'a@x'), row('2', '4.5', 9, 'b@x'), row('3', '1', 1, 'c@x'), row('4', '0.5', 1, 'd@x'), row('__other__', '2', 5)]
    const w = mount(RankingBars, { props: { rows, metric: 'cost', labelOf: (r: UsageSummaryRow) => r.user_email || `#${r.key}` }, global: { plugins: [i18n] } })
    const items = w.findAll('button')
    expect(items).toHaveLength(5)
    expect(items[0].text()).toContain('a@x')
    expect(items[0].text()).toContain('$9.00')
    expect(items[0].find('.bg-amber-200').exists()).toBe(true)
    expect(items[3].find('.bg-amber-200, .bg-slate-200, .bg-orange-200').exists()).toBe(false)
    // The longest bar is the top row's; the other row is gray and not a link.
    expect((items[0].findAll('span span')[0].element as HTMLElement).style.width).toBe('100%')
    expect(items[4].text()).toContain('其他')
    expect(items[4].attributes('disabled')).toBeDefined()
    await items[1].trigger('click')
    await items[4].trigger('click')
    expect(w.emitted('select')).toEqual([['2']])
  })

  it('shows the chosen metric', () => {
    i18n.global.locale.value = 'zh'
    const w = mount(RankingBars, { props: { rows: [row('2', '4.5', 1234)], metric: 'requests' }, global: { plugins: [i18n] } })
    expect(w.text()).toContain('1,234')
  })
})
