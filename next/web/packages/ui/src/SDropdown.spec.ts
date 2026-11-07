import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SDropdown from './SDropdown.vue'
import { pinViewport } from './internal/pinViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

const actions = [
  { key: 'edit', label: 'Edit', icon: 'edit' },
  { key: 'del', label: 'Delete', danger: true, divider: true }
]

function phoneMenu(props: Record<string, unknown> = {}) {
  const events = { onSelect: vi.fn(), onOpen: vi.fn(), onClose: vi.fn() }
  const w = mount(
    pinViewport({ compact: true }, () => h(SDropdown, { actions, ...props, ...events }, { header: () => 'Row 7' })),
    { attachTo: document.body }
  )
  return { w, events }
}

describe('SDropdown on phones', () => {
  it('opens a bottom action sheet with the header, large items and a Cancel row', async () => {
    const { w, events } = phoneMenu()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(events.onOpen).toHaveBeenCalledTimes(1)
    const sheet = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(sheet.className).toContain('s-drawer-bottom')
    const menu = sheet.querySelector('[role="menu"]')!
    expect(menu.firstElementChild!.textContent).toContain('Row 7')
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    expect(items.map(b => b.textContent?.trim())).toEqual(['Edit', 'Delete'])
    expect(items.every(b => b.classList.contains('min-h-12'))).toBe(true)
    expect(items[1].className).toContain('!text-red-600')
    expect(document.activeElement).toBe(items[0])
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(items[1])
    const cancel = sheet.querySelector<HTMLButtonElement>('[data-overlay-close]')!
    expect(cancel.textContent?.trim()).toBe('Cancel')
    cancel.click()
    await flushPromises()
    expect(events.onClose).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(events.onSelect).not.toHaveBeenCalled()
  })

  it('emits select from the sheet and closes on Escape', async () => {
    const { w, events } = phoneMenu()
    await w.get('button').trigger('click')
    await flushPromises()
    document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[1].click()
    await flushPromises()
    expect(events.onSelect).toHaveBeenCalledWith('del')
    await w.get('button').trigger('click')
    await flushPromises()
    document.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('keeps the floating menu with mobile popover', async () => {
    const { w } = phoneMenu({ mobile: 'popover' })
    await w.get('button').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[role="menu"]')!.className).toContain('dropdown')
  })
})
