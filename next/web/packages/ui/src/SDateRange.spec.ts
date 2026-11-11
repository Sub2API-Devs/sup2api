import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SDateRange from './SDateRange.vue'
import { mountPinned } from './testViewport'
import { closedRangeBounds, logRangeBounds, rangeBounds, rangeSpanMs, toLocalSecondsInput } from './timeRange'

enableAutoUnmount(afterEach)

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

describe('SDateRange on a phone', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const sheet = () => document.querySelector<HTMLElement>('[data-testid="range-sheet"]')

  it('shows only the preset and opens a sheet with a preset grid', async () => {
    const w = mountPinned(SDateRange, { props: { range: 'custom', from: local(2026, 10, 21), to: local(2026, 10, 28) } })
    const trigger = w.get('[data-testid="date-range-trigger"]')
    expect(trigger.text()).toBe('Custom')
    await trigger.trigger('click')
    expect(sheet()?.className).toContain('grid-cols-3')
    expect(document.querySelector('[data-testid="date-range-panel"]')).toBeNull()
    sheet()!.querySelector<HTMLButtonElement>('[data-key="yesterday"]')!.click()
    await nextTick()
    expect(w.emitted('update:range')).toEqual([['yesterday']])
    expect(sheet()).toBeNull()
  })

  it('with time shows both ends to the second, each whole, so the line can only break between them', () => {
    const at = (h: number, m: number, sec: number) => new Date(2026, 10, 12, h, m, sec).toISOString()
    const w = mountPinned(SDateRange, { props: { range: 'today', from: at(0, 0, 0), to: at(15, 4, 6), time: true } })
    const trigger = w.get('[data-testid="date-range-trigger"]')
    expect(trigger.text()).toBe('Today2026-11-12 00:00:00 ~ 2026-11-12 15:04:05')
    expect(trigger.findAll('.whitespace-nowrap').map((e) => e.text())).toEqual(['Today', '2026-11-12 00:00:00 ~', '2026-11-12 15:04:05'])
    // Nothing clips or fixes the height: the button grows to a second line.
    expect(trigger.classes()).toEqual(expect.arrayContaining(['h-auto', 'min-h-control']))
    expect(trigger.classes()).not.toContain('whitespace-nowrap')
  })

  it('applies a custom span from the sheet', async () => {
    const w = mountPinned(SDateRange, { props: { range: '7d', from: '', to: '' } })
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    const set = (id: string, v: string) => {
      const el = document.querySelector<HTMLInputElement>(`[data-testid="${id}"]`)!
      el.value = v
      el.dispatchEvent(new Event('input'))
    }
    set('date-range-start', '2026-10-21')
    set('date-range-end', '2026-10-27')
    await nextTick()
    document.querySelector<HTMLButtonElement>('[data-testid="date-range-apply"]')!.click()
    await nextTick()
    expect(w.emitted('update:from')).toEqual([[local(2026, 10, 21)]])
    expect(w.emitted('update:to')).toEqual([[local(2026, 10, 28)]])
    expect(sheet()).toBeNull()
  })
})

describe('SDateRange with time', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const panel = () => document.body.querySelector<HTMLElement>('[data-testid="date-range-panel"]')
  const at = (h: number, m: number, s: number) => new Date(2026, 10, 12, h, m, s)

  it('a log opens on today from midnight to an hour from now, to the second', () => {
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const before = Date.now()
    const b = logRangeBounds()
    expect(b.from).toBe(midnight.toISOString())
    // `to` is exclusive: one second past the end shown.
    const end = new Date(b.to).getTime() - 1000
    expect(end % 1000).toBe(0)
    expect(end).toBeGreaterThan(before + 3600_000 - 1000)
    expect(end).toBeLessThanOrEqual(Date.now() + 3600_000)
  })

  it('closes a preset left open at the end of today', () => {
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(closedRangeBounds('7d')).toEqual({ from: rangeBounds('7d').from, to: tomorrow.toISOString() })
    expect(closedRangeBounds('yesterday')).toEqual(rangeBounds('yesterday'))
    expect(closedRangeBounds('all')).toEqual({ from: '', to: '' })
  })

  it('shows both ends to the second and edits them as date-times', async () => {
    const w = mount(SDateRange, { props: { range: 'today', from: at(0, 0, 0).toISOString(), to: at(15, 4, 6).toISOString(), time: true }, attachTo: document.body })
    const trigger = w.get('[data-testid="date-range-trigger"]')
    expect(trigger.text()).toContain('2026-11-12 00:00:00 ~ 2026-11-12 15:04:05')
    await trigger.trigger('click')
    const start = panel()!.querySelector<HTMLInputElement>('[data-testid="date-range-start"]')!
    const end = panel()!.querySelector<HTMLInputElement>('[data-testid="date-range-end"]')!
    // The DOM drops zero seconds from the value, as browsers do; step=1 keeps the seconds field.
    expect([start.type, start.step, start.value]).toEqual(['datetime-local', '1', '2026-11-12T00:00'])
    expect(end.value).toBe('2026-11-12T15:04:05')

    start.value = '2026-11-11T22:30:15'
    start.dispatchEvent(new Event('input'))
    end.value = '2026-11-12T01:02:03'
    end.dispatchEvent(new Event('input'))
    await nextTick()
    panel()!.querySelector<HTMLButtonElement>('[data-testid="date-range-apply"]')!.click()
    await nextTick()
    expect(w.emitted('update:range')?.at(-1)).toEqual(['custom'])
    expect(w.emitted('update:from')?.at(-1)).toEqual([new Date(2026, 10, 11, 22, 30, 15).toISOString()])
    // The end typed stays in range: `to` is the second after it.
    expect(w.emitted('update:to')?.at(-1)).toEqual([new Date(2026, 10, 12, 1, 2, 4).toISOString()])
    w.unmount()
  })

  it('a preset fills both ends, and an open end reads "now"', async () => {
    const w = mount(SDateRange, { props: { range: 'today', from: at(0, 0, 0).toISOString(), to: '', time: true }, attachTo: document.body })
    expect(w.get('[data-testid="date-range-trigger"]').text()).toContain('2026-11-12 00:00:00 ~ now')
    await w.get('[data-testid="date-range-trigger"]').trigger('click')
    panel()!.querySelector<HTMLButtonElement>('button[data-key="7d"]')!.click()
    await nextTick()
    const b = closedRangeBounds('7d')
    expect(w.emitted('update:from')?.at(-1)).toEqual([b.from])
    expect(w.emitted('update:to')?.at(-1)).toEqual([b.to])
    expect(toLocalSecondsInput(new Date(new Date(b.to).getTime() - 1000)).slice(11)).toBe('23:59:59')
    w.unmount()
  })
})
