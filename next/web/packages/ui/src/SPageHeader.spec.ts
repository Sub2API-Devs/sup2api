import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import SPageHeader from './SPageHeader.vue'
import SButton from './SButton.vue'
import { provideTitleContext } from './titleContext'
import { resetViewport } from './viewport'

enableAutoUnmount(afterEach)

function stubMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
}
afterEach(() => {
  vi.unstubAllGlobals()
  resetViewport()
  document.body.innerHTML = ''
})

// An app shell: a top bar with the actions target, and the page under it.
function shell(slots: Record<string, () => unknown>, title = '分组', props: Record<string, unknown> = {}) {
  return defineComponent({
    setup() {
      provideTitleContext(() => '分组', ref(''), '#page-actions')
      return () => h('div', [h('div', { id: 'page-actions' }), h(SPageHeader, { title, description: '说明', ...props }, slots)])
    }
  })
}

describe('page header actions', () => {
  it('moves the actions of a header with no filters into the top bar on a wide screen', async () => {
    stubMedia(true)
    const w = mount(shell({ actions: () => h('button', '新建分组') }), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('新建分组')
    expect(w.find('.mb-3').exists()).toBe(false)
  })

  it('moves them on a narrow screen too, where a button with an icon shows only the icon', async () => {
    stubMedia(false)
    const w = mount(shell({ actions: () => h(SButton, { icon: 'plus' }, () => '新建分组') }), { attachTo: document.body })
    await nextTick()
    expect(w.find('.mb-3').exists()).toBe(false)
    const button = document.querySelector('#page-actions button')!
    expect(button.querySelector('.sr-only')?.textContent).toBe('新建分组')
    expect(button.className).toContain('aspect-square')
  })

  it('keeps the actions beside the filters when there are filters', async () => {
    stubMedia(true)
    const w = mount(shell({ filters: () => h('input'), actions: () => h('button', '新建分组') }), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('.mb-3').text()).toBe('新建分组')
  })

  it('keeps the actions beside a title the top bar does not show', async () => {
    stubMedia(true)
    const w = mount(shell({ actions: () => h('button', '新建') }, '详情'), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('h1').text()).toBe('详情')
    expect(w.text()).toContain('新建')
  })
})

describe('page header on a phone', () => {
  const menu = [
    { key: 'export', label: '导出', icon: 'download' },
    { key: 'gone', label: '隐藏', hidden: true }
  ]

  it('folds #filters behind a Filters button, keeping #filters-primary in the row', async () => {
    stubMedia(false)
    const w = mount(shell({ 'filters-primary': () => h('input', { id: 'q' }), filters: () => h('select', { id: 'status' }) }, '分组', { filtersActiveCount: 1 }), {
      attachTo: document.body
    })
    await nextTick()
    expect(w.find('#q').exists()).toBe(true)
    expect(document.querySelector('#status')).toBeNull()
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    expect(document.querySelector('[data-testid="filter-sheet"] #status')).not.toBeNull()
    expect(w.get('[data-testid="filter-sheet-open"]').attributes('aria-label')).toBe('Filters, 1 active')
  })

  it('keeps the filters inline with filtersCollapse false', async () => {
    stubMedia(false)
    const w = mount(shell({ filters: () => h('select', { id: 'status' }) }, '分组', { filtersCollapse: false }), { attachTo: document.body })
    await nextTick()
    expect(w.find('#status').exists()).toBe(true)
    expect(w.find('[data-testid="filter-sheet-open"]').exists()).toBe(false)
  })

  it('puts mobileMenu in a top bar menu while the actions stay beside the filters', async () => {
    stubMedia(false)
    const w = mount(shell({ filters: () => h('input'), actions: () => h('button', '新建') }, '分组', { mobileMenu: menu }), { attachTo: document.body })
    await nextTick()
    expect(w.get('.mb-3').text()).toContain('新建')
    const top = document.querySelector<HTMLElement>('#page-actions')!
    expect(top.textContent).not.toContain('新建')
    top.querySelector<HTMLButtonElement>('[data-testid="page-menu"] button')!.click()
    await nextTick()
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    expect(items.map((b) => b.textContent?.trim())).toEqual(['导出'])
    items[0].click()
    expect(w.findComponent(SPageHeader).emitted('menu-select')).toEqual([['export']])
  })

  it('shows mobileMenu as ghost buttons after the actions on a wide screen', async () => {
    stubMedia(true)
    const w = mount(shell({ filters: () => h('input'), actions: () => h('button', '新建') }, '分组', { mobileMenu: menu }), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    const row = w.get('.mb-3')
    expect(row.text()).toContain('新建')
    expect(row.text()).not.toContain('隐藏')
    await row.get('button[data-key="export"]').trigger('click')
    expect(w.findComponent(SPageHeader).emitted('menu-select')).toEqual([['export']])
  })
})
