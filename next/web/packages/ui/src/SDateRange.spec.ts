import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SDateRange from './SDateRange.vue'
import { rangeBounds, rangeSpanMs } from './timeRange'

function local(y: number, m: number, d: number) {
  return new Date(y, m - 1, d).toISOString()
}

describe('timeRange presets', () => {
  it('yesterday and lastMonth are closed ranges ending at local midnight', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const y = rangeBounds('yesterday')
    expect(y.to).toBe(today.toISOString())
    expect(new Date(y.to).getTime() - new Date(y.from).getTime()).toBeGreaterThanOrEqual(23 * 3600_000)

    const first = new Date(today)
    first.setDate(1)
    const prev = new Date(first)
    prev.setMonth(prev.getMonth() - 1)
    expect(rangeBounds('lastMonth')).toEqual({ from: prev.toISOString(), to: first.toISOString() })

    const d14 = new Date(today)
    d14.setDate(d14.getDate() - 13)
    expect(rangeBounds('14d')).toEqual({ from: d14.toISOString(), to: '' })
  })

  it('rangeSpanMs measures [from, to), open start is Infinity', () => {
    expect(rangeSpanMs('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z')).toBe(86400_000)
    expect(rangeSpanMs('', '')).toBe(Infinity)
    expect(rangeSpanMs('nope', '')).toBe(Infinity)
    expect(rangeSpanMs(new Date(Date.now() - 1000).toISOString(), '')).toBeGreaterThanOrEqual(1000)
  })
})

describe('SDateRange', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const panel = () => document.body.querySelector<HTMLElement>('[data-testid="date-range-panel"]')

  it('shows the preset and the dates it covers, and opens a labelled dialog', async () => {
    const w = mount(SDateRange, { props: { range: 'custom', from: local(2026, 10, 21), to: local(2026, 10, 28) }, attachTo: document.body })
    const trigger = w.get('[data-testid="date-range-trigger"]')
    expect(trigger.text()).toContain('10-21 ~ 10-27')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    expect(panel()?.getAttribute('role')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    w.unmount()
  })

  it('a preset applies its bounds and closes', async () => {
    const w = mount(SDateRange, { props: { range: '7d', from: '', to: '' }, attachTo: document.body })
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    panel()!.querySelector<HTMLButtonElement>('button[data-key="yesterday"]')!.click()
    await w.vm.$nextTick()
    const b = rangeBounds('yesterday')
    expect(w.emitted('update:range')).toEqual([['yesterday']])
    expect(w.emitted('update:from')).toEqual([[b.from]])
    expect(w.emitted('update:to')).toEqual([[b.to]])
    expect(panel()).toBeNull()
    w.unmount()
  })

  it('custom Apply sends an inclusive end date as the next local midnight', async () => {
    const w = mount(SDateRange, { props: { range: '7d', from: '', to: '' }, attachTo: document.body })
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    const set = (id: string, v: string) => {
      const el = panel()!.querySelector<HTMLInputElement>(`[data-testid="${id}"]`)!
      el.value = v
      el.dispatchEvent(new Event('input'))
    }
    set('date-range-start', '2026-10-21')
    set('date-range-end', '2026-10-27')
    await w.vm.$nextTick()
    panel()!.querySelector<HTMLButtonElement>('[data-testid="date-range-apply"]')!.click()
    await w.vm.$nextTick()
    expect(w.emitted('update:range')).toEqual([['custom']])
    expect(w.emitted('update:from')).toEqual([[local(2026, 10, 21)]])
    expect(w.emitted('update:to')).toEqual([[local(2026, 10, 28)]])
    expect(panel()).toBeNull()
    w.unmount()
  })

  it('refuses an inverted custom range', async () => {
    const w = mount(SDateRange, { props: { range: '7d', from: '', to: '' }, attachTo: document.body })
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    const start = panel()!.querySelector<HTMLInputElement>('[data-testid="date-range-start"]')!
    const end = panel()!.querySelector<HTMLInputElement>('[data-testid="date-range-end"]')!
    start.value = '2026-10-27'
    start.dispatchEvent(new Event('input'))
    end.value = '2026-10-21'
    end.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    expect(panel()!.querySelector<HTMLButtonElement>('[data-testid="date-range-apply"]')!.disabled).toBe(true)
    w.unmount()
  })

  it('Escape closes and returns focus to the trigger', async () => {
    const w = mount(SDateRange, { props: { range: 'today', from: '', to: '' }, attachTo: document.body })
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(w.get('[data-testid="date-range-trigger"]').element)
    expect(w.emitted('update:range')).toBeUndefined()
    w.unmount()
  })

  it('labels the trigger without a field label', () => {
    const w = mount(SDateRange, { props: { range: 'today', from: '', to: '', label: false } })
    expect(w.get('[data-testid="date-range-trigger"]').attributes('aria-label')).toBe('Time')
  })
})
