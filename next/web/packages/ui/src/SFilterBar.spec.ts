import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import SFilterBar from './SFilterBar.vue'
import { mountPinned } from './testViewport'

enableAutoUnmount(afterEach)

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

describe('SFilterBar more filters', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const slots = { default: () => h('select', { id: 'status' }), advanced: () => h('input', { id: 'ip' }), end: () => 'UTC' }
  const panel = (w: ReturnType<typeof mount>) => w.get('[data-testid="filter-advanced"]')

  it('folds #advanced behind a toggle placed before #end, with the count badge', async () => {
    const w = mount(SFilterBar, { props: { advancedCount: 2 }, slots, attachTo: document.body })
    const toggle = w.get('[data-testid="filter-advanced-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe(panel(w).attributes('id'))
    expect(toggle.classes()).toContain('!text-primary-600')
    expect(w.get('[data-testid="filter-advanced-count"]').text()).toBe('2')
    expect(w.html().indexOf('filter-advanced-toggle')).toBeLessThan(w.html().indexOf('UTC'))
    expect(panel(w).isVisible()).toBe(false)
    await toggle.trigger('click')
    expect(panel(w).isVisible()).toBe(true)
    expect(panel(w).find('#ip').exists()).toBe(true)
    expect(toggle.classes()).not.toContain('!text-primary-600')
    expect(w.emitted('update:advancedOpen')).toEqual([[true]])
  })

  it('follows v-model:advancedOpen and adds nothing without #advanced', async () => {
    const w = mount(SFilterBar, { props: { advancedOpen: true }, slots, attachTo: document.body })
    expect(panel(w).isVisible()).toBe(true)
    await w.setProps({ advancedOpen: false })
    expect(panel(w).isVisible()).toBe(false)
    const plain = mount(SFilterBar, { slots: { default: slots.default } })
    expect(plain.find('[data-testid="filter-advanced-toggle"]').exists()).toBe(false)
    expect(plain.find('[data-testid="filter-advanced"]').exists()).toBe(false)
  })

  it('puts #advanced after the default slot in the phone sheet, without the toggle', async () => {
    const w = mountPinned(SFilterBar, { slots })
    expect(w.find('[data-testid="filter-advanced-toggle"]').exists()).toBe(false)
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    const fields = [...document.querySelectorAll('[data-testid="filter-sheet"] > *')].map((e) => e.id)
    expect(fields).toEqual(['status', 'ip'])
  })
})

describe('SFilterBar on a phone', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const slots = {
    primary: () => h('input', { id: 'q' }),
    default: () => h('select', { id: 'status', class: 'w-36' }),
    end: () => 'UTC'
  }
  const sheet = () => document.querySelector('[data-testid="filter-sheet"]')

  it('keeps #primary first on a wide screen', () => {
    const w = mount(SFilterBar, { slots })
    expect(w.findAll('input, select').map((e) => e.attributes('id'))).toEqual(['q', 'status'])
  })

  it('folds into #primary and a Filters button with a badge', async () => {
    const onReset = vi.fn()
    const w = mountPinned(SFilterBar, { props: { activeCount: 2, dirty: true, onReset, ariaLabel: 'Usage filters' }, slots })
    expect(w.find('#q').exists()).toBe(true)
    expect(w.find('#status').exists()).toBe(false)
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
    expect(w.emitted('done')).toHaveLength(1)
  })

  it('submits the sheet (Enter in a field) like Done', async () => {
    const w = mountPinned(SFilterBar, { slots })
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    const form = sheet()!.closest('form')!
    expect(document.querySelector('[data-testid="filter-sheet-done"]')?.getAttribute('form')).toBe(form.id)
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    await nextTick()
    expect(sheet()).toBeNull()
    expect(w.emitted('done')).toHaveLength(1)
  })

  it('shows only the Filters button without #primary, and no Reset without @reset', async () => {
    const w = mountPinned(SFilterBar, { slots: { default: () => h('select', { id: 'status' }) } })
    expect(w.get('[data-testid="filter-sheet-open"]').attributes('aria-label')).toBeUndefined()
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    expect(document.querySelector('[data-testid="filter-reset"]')).toBeNull()
  })

  it('keeps #primary inline when there is nothing else to fold', () => {
    const w = mountPinned(SFilterBar, { slots: { primary: () => h('input', { id: 'q' }) } })
    expect(w.find('#q').exists()).toBe(true)
    expect(w.find('[data-testid="filter-sheet-open"]').exists()).toBe(false)
  })
})
