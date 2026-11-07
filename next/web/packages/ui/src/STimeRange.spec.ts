import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import STimeRange from './STimeRange.vue'
import { mountCompact } from './testViewport'
import { fromLocalInput, rangeBounds } from './timeRange'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('STimeRange on a phone', () => {
  const sheet = () => document.querySelector<HTMLElement>('[data-testid="range-sheet"]')

  it('opens a sheet of presets; a preset applies its bounds and closes', async () => {
    const w = mountCompact(STimeRange, { range: 'today', from: '', to: '' })
    const trigger = w.get('[data-testid="time-range-trigger"]')
    expect(trigger.text()).toBe('Today')
    await trigger.trigger('click')
    expect([...sheet()!.querySelectorAll('button')].map(b => b.dataset.key)).toEqual(['today', '7d', '30d'])
    sheet()!.querySelector<HTMLButtonElement>('[data-key="7d"]')!.click()
    await nextTick()
    const b = rangeBounds('7d')
    expect(w.emitted('update:range')).toEqual([['7d']])
    expect(w.emitted('update:from')).toEqual([[b.from]])
    expect(sheet()).toBeNull()
  })

  it('editing a bound in the sheet switches to custom', async () => {
    const w = mountCompact(STimeRange, { range: 'today', from: '', to: '' })
    await w.get('[data-testid="time-range-trigger"]').trigger('click')
    const from = document.querySelector<HTMLInputElement>('[data-testid="time-range-from"]')!
    expect(from.type).toBe('datetime-local')
    from.value = '2026-10-21T08:00'
    from.dispatchEvent(new Event('change'))
    expect(w.emitted('update:range')).toEqual([['custom']])
    expect(w.emitted('update:from')).toEqual([[fromLocalInput('2026-10-21T08:00')]])
  })

  it('offers no from / to without a custom key', async () => {
    const w = mountCompact(STimeRange, { range: 'today', from: '', to: '', keys: ['today', '7d'] })
    await w.get('[data-testid="time-range-trigger"]').trigger('click')
    expect(sheet()).not.toBeNull()
    expect(document.querySelector('[data-testid="time-range-from"]')).toBeNull()
  })
})
