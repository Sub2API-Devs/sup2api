import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import SBulkBar from './SBulkBar.vue'
import { mountPinned } from './testViewport'
import { VIEWPORT } from './viewport'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

// The marked element is what the component's style rule keeps room for, at the end of its parent.
const docked = () => document.querySelector('[data-bulk-dock]')

describe('SBulkBar on a phone', () => {
  it('docks to the bottom with the count as a menu and the actions on the right', async () => {
    const w = mountPinned(SBulkBar, { props: { count: 3, total: 40 }, slots: { default: () => h('button', { id: 'delete' }, 'Delete') } })
    expect(w.get('[role="region"]').classes()).toEqual(expect.arrayContaining(['fixed', 'bottom-0']))
    expect(w.find('#delete').exists()).toBe(true)
    const menu = w.get('[data-testid="bulk-menu"]')
    expect(menu.text()).toBe('3 selected')
    await menu.trigger('click')
    await nextTick()
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    expect(items.map(b => b.textContent?.trim())).toEqual(['Select this page', 'Select all 40 results', 'Clear selection'])
    items[1].click()
    expect(w.emitted('select-all')).toHaveLength(1)
  })

  it('takes no room where it stands, whatever spacing the caller gives the wide bar', () => {
    const w = mountPinned(SBulkBar, { props: { count: 1 }, attrs: { class: 'mb-3', 'data-testid': 'bar' } })
    expect(w.element).toBe(docked())
    expect(w.attributes('data-testid')).toBe('bar')
    expect(w.classes()).toEqual(['contents', 'mb-3'])
  })

  it('keeps room at the end of its container only while docked', async () => {
    const compact = ref(true)
    const w = mount(SBulkBar, {
      attachTo: document.body,
      props: { count: 2 },
      global: { provide: { [VIEWPORT]: { compact, touch: ref(false) } } }
    })
    expect(docked()).not.toBeNull()

    await w.setProps({ count: 0 })
    expect(docked()).toBeNull()

    await w.setProps({ count: 2 })
    expect(docked()).not.toBeNull()
    compact.value = false
    await nextTick()
    expect(docked()).toBeNull()
    expect(w.classes()).toContain('s-bulk-bar')

    compact.value = true
    await nextTick()
    expect(docked()).not.toBeNull()
    w.unmount()
    expect(docked()).toBeNull()
  })

  it('hides the idle persistent strip', () => {
    const w = mountPinned(SBulkBar, { props: { count: 0, persistent: true } })
    expect(w.html()).not.toContain('Drag across rows')
    expect(docked()).toBeNull()
  })
})
