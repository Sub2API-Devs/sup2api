import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import SBulkBar from './SBulkBar.vue'
import { mountPinned } from './testViewport'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SBulkBar on a phone', () => {
  it('docks to the bottom with the count as a menu and the actions on the right', async () => {
    const w = mountPinned(SBulkBar, { props: { count: 3, total: 40 }, slots: { default: () => h('button', { id: 'delete' }, 'Delete') } })
    expect(w.attributes('data-testid')).toBe('bulk-dock-space')
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

  it('hides the idle persistent strip', () => {
    const w = mountPinned(SBulkBar, { props: { count: 0, persistent: true } })
    expect(w.html()).not.toContain('Drag across rows')
  })
})
