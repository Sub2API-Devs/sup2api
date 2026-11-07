import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import SFilterBar from './SFilterBar.vue'
import { mountCompact } from './testViewport'

describe('SFilterBar', () => {
  it('lays out filters, the #end slot and a Reset button only when @reset is bound', async () => {
    const onReset = vi.fn()
    const w = mount(SFilterBar, { props: { dirty: true, onReset, ariaLabel: 'Filters' }, slots: { default: () => h('input'), end: () => 'UTC' } })
    expect(w.attributes('role')).toBe('group')
    expect(w.classes()).toContain('card')
    expect(w.text()).toContain('UTC')
    await w.get('[data-testid="filter-reset"]').trigger('click')
    expect(onReset).toHaveBeenCalledOnce()
    const clean = mount(SFilterBar, { props: { onReset, card: false, dirty: false } })
    expect(clean.get('[data-testid="filter-reset"]').attributes('disabled')).toBeDefined()
    expect(clean.classes()).not.toContain('card')
    // Without :dirty the page does not track it: Reset stays usable.
    expect(mount(SFilterBar, { props: { onReset } }).get('[data-testid="filter-reset"]').attributes('disabled')).toBeUndefined()
    expect(mount(SFilterBar).find('[data-testid="filter-reset"]').exists()).toBe(false)
  })
})

describe('SFilterBar on a phone', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const slots = {
    primary: () => h('input', { id: 'q' }),
    default: () => h('select', { id: 'status', class: 'w-36' }),
    end: () => 'UTC',
    chips: () => h('span', { class: 'chip' }, 'status: on')
  }
  const sheet = () => document.querySelector('[data-testid="filter-sheet"]')

  it('keeps #primary first on a wide screen', () => {
    const w = mount(SFilterBar, { slots })
    expect(w.findAll('input, select').map((e) => e.attributes('id'))).toEqual(['q', 'status'])
    expect(w.find('.chip').exists()).toBe(false)
  })

  it('folds into #primary, a Filters button with a badge, and the chips', async () => {
    const onReset = vi.fn()
    const w = mountCompact(SFilterBar, { activeCount: 2, dirty: true, onReset, ariaLabel: 'Usage filters' }, slots)
    expect(w.find('#q').exists()).toBe(true)
    expect(w.find('#status').exists()).toBe(false)
    expect(w.find('.chip').exists()).toBe(true)
    const open = w.get('[data-testid="filter-sheet-open"]')
    expect(open.attributes('aria-label')).toBe('Filters, 2 active')
    expect(open.text()).toContain('2')

    await open.trigger('click')
    expect(open.attributes('aria-expanded')).toBe('true')
    expect(sheet()?.querySelector('#status')).not.toBeNull()
    expect(sheet()?.className).toContain('[&>*]:!w-full')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Usage filters')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('UTC')
    document.querySelector<HTMLButtonElement>('[data-testid="filter-reset"]')!.click()
    expect(onReset).toHaveBeenCalledOnce()

    document.querySelector<HTMLButtonElement>('[data-testid="filter-sheet-done"]')!.click()
    await nextTick()
    expect(sheet()).toBeNull()
  })

  it('shows only the Filters button without #primary, and no Reset without @reset', async () => {
    const w = mountCompact(SFilterBar, {}, { default: () => h('select', { id: 'status' }) })
    expect(w.get('[data-testid="filter-sheet-open"]').attributes('aria-label')).toBeUndefined()
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    expect(document.querySelector('[data-testid="filter-reset"]')).toBeNull()
  })

  it('keeps the wrapping strip with mobileCollapse false', () => {
    const w = mountCompact(SFilterBar, { mobileCollapse: false }, slots)
    expect(w.find('#status').exists()).toBe(true)
    expect(w.find('[data-testid="filter-sheet-open"]').exists()).toBe(false)
  })
})
