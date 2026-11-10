import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { UsageSummaryRow } from '@/api/types'
import DistributionCard from './DistributionCard.vue'

vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light' }) }))
enableAutoUnmount(afterEach)

const row = (key: string, tokens: number): UsageSummaryRow => ({ key, requests: 1, input_tokens: tokens, total_cost: '0' })
// Nine rows, one of no key: the top seven show, the last two fold into "other".
const rows = [row('claude-a', 90), row('', 80), ...[70, 60, 50, 40, 30, 20, 10].map(n => row(`gpt-${n}`, n))]
const LABEL = '<template #label="{ label }"><b data-testid="custom-label">{{ label }}</b></template>'

function render(slots: Record<string, string> = {}, props: Record<string, unknown> = {}) {
  return mount(DistributionCard, {
    props: { title: 'Models', keyLabel: 'Model', rows, ...props },
    slots,
    global: { plugins: [i18n], stubs: { SChart: true } }
  })
}
/** The label cell of each table row, without the colour swatch. */
const labels = (w: ReturnType<typeof render>) => w.findAll('tbody tr').map(tr => tr.findAll('td')[0].findAll('span span')[1])

describe('DistributionCard', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })

  it('draws every label itself without a label slot: keys in mono with the whole text on hover, "other" muted', () => {
    const cells = labels(render())
    expect(cells.map(c => c.text())).toEqual(['claude-a', '—', 'gpt-70', 'gpt-60', 'gpt-50', 'gpt-40', 'gpt-30', '其他（2）'])
    expect(cells[0].classes()).toEqual(expect.arrayContaining(['truncate', 'font-mono']))
    expect(cells[0].attributes('title')).toBe('claude-a')
    expect(cells[7].classes()).toContain('text-fg-muted')
    expect(cells[7].classes()).not.toContain('font-mono')
  })

  it('hands the label of a row with a key to the label slot, and keeps "other" and a row of no key', async () => {
    const w = render({ label: LABEL }, { selectable: true })
    expect(w.findAll('[data-testid="custom-label"]').map(c => c.text())).toEqual([
      'claude-a',
      'gpt-70',
      'gpt-60',
      'gpt-50',
      'gpt-40',
      'gpt-30'
    ])
    const kept = w
      .findAll('tbody tr')
      .filter(tr => !tr.find('[data-testid="custom-label"]').exists())
      .map(tr => tr.findAll('td')[0])
    expect(kept.map(td => td.text())).toEqual(['—', '其他（2）'])
    expect(kept[1].find('.text-fg-muted').exists()).toBe(true)
    // a slotted label still selects its row
    await w.get('[data-testid="custom-label"]').trigger('click')
    expect(w.emitted('select')).toEqual([['claude-a']])
  })

  it('names a key through labelOf, with or without the slot', () => {
    const labelOf = (key: string) => (key ? `key ${key}` : '')
    expect(labels(render({}, { labelOf }))[0].text()).toBe('key claude-a')
    expect(render({ label: LABEL }, { labelOf }).get('[data-testid="custom-label"]').text()).toBe('key claude-a')
  })
})
