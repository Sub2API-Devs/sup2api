import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import SBulkBar from './SBulkBar.vue'
import { mountPinned } from './testViewport'
import { VIEWPORT } from './viewport'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
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

  // The dock's action buttons scroll sideways when they do not fit.
  const scrollerOf = (button: Element) => button.parentElement!.parentElement!
  const box = (left: number, right: number) => () => ({ left, right, width: right - left }) as DOMRect

  it('fades the edge of the actions that hides more buttons', async () => {
    const w = mountPinned(SBulkBar, { props: { count: 1 }, slots: { default: () => h('button', { id: 'delete' }, 'Delete') } })
    const scroller = scrollerOf(w.get('#delete').element)
    expect(scroller.className).not.toContain('mask-image')
    Object.defineProperties(scroller, { scrollWidth: { value: 500 }, clientWidth: { value: 200 } })
    const scrollTo = async (left: number) => {
      scroller.scrollLeft = left
      scroller.dispatchEvent(new Event('scroll'))
      await nextTick()
      return scroller.className
    }
    expect(await scrollTo(0)).toContain('to_left')
    expect(await scrollTo(300)).toContain('to_right,transparent,#000_2rem)')
  })

  it('brings a button only partly in view into view instead of pressing it', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const onClick = vi.fn()
    const w = mountPinned(SBulkBar, { props: { count: 1 }, slots: { default: () => h('button', { id: 'delete', onClick }, 'Delete') } })
    const button = w.get('#delete').element as HTMLElement
    const press = (detail: number) => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
    scrollerOf(button).getBoundingClientRect = box(100, 300)

    button.getBoundingClientRect = box(260, 340)
    expect(press(1)).toBe(false)
    expect(onClick).not.toHaveBeenCalled()
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    // A keyboard press: focus has already scrolled the button into view.
    press(0)
    expect(onClick).toHaveBeenCalledTimes(1)

    button.getBoundingClientRect = box(220, 300)
    press(1)
    expect(onClick).toHaveBeenCalledTimes(2)
    expect(scroll).toHaveBeenCalledTimes(1)
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
