import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import SPageHeader from './SPageHeader.vue'
import { provideTitleContext } from './titleContext'
import { mountPinned } from './testViewport'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

// An app shell: a top bar with the actions target, and the page under it.
function shell(slots: Record<string, () => unknown>, title = '分组') {
  return defineComponent({
    setup() {
      provideTitleContext(() => '分组', ref(''), '#page-actions')
      return () => h('div', [h('div', { id: 'page-actions' }), h(SPageHeader, { title, description: '说明' }, slots)])
    }
  })
}

describe('page header actions', () => {
  it('moves the actions of a header with no filters into the top bar on a wide screen', async () => {
    const w = mountPinned(shell({ actions: () => h('button', '新建分组') }), {}, { compact: false })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('新建分组')
    expect(w.find('.mb-3').exists()).toBe(false)
  })

  it('keeps the actions in the page on a narrow screen', async () => {
    const w = mountPinned(shell({ actions: () => h('button', '新建分组') }))
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('.mb-3').text()).toBe('新建分组')
  })

  it('keeps the actions beside the filters when there are filters', async () => {
    const w = mountPinned(shell({ filters: () => h('input'), actions: () => h('button', '新建分组') }), {}, { compact: false })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('.mb-3').text()).toBe('新建分组')
  })

  it('keeps the actions beside a title the top bar does not show', async () => {
    const w = mountPinned(shell({ actions: () => h('button', '新建') }, '详情'), {}, { compact: false })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('h1').text()).toBe('详情')
    expect(w.text()).toContain('新建')
  })
})

describe('page header filters on a phone', () => {
  it('folds #filters behind a Filters button, keeping #filters-primary in the row', async () => {
    const slots = { 'filters-primary': () => h('input', { id: 'q' }), filters: () => h('select', { id: 'status' }) }
    const w = mountPinned(SPageHeader, { props: { title: '分组', filtersActiveCount: 1 }, slots })
    await nextTick()
    expect(w.find('#q').exists()).toBe(true)
    expect(document.querySelector('#status')).toBeNull()
    const open = w.get('[data-testid="filter-sheet-open"]')
    expect(open.attributes('aria-label')).toBe('Filters, 1 active')
    await open.trigger('click')
    expect(document.querySelector('[data-testid="filter-sheet"] #status')).not.toBeNull()
  })

  it('keeps #filters-primary inline when there is nothing else to fold', async () => {
    const w = mountPinned(SPageHeader, { props: { title: '分组' }, slots: { 'filters-primary': () => h('input', { id: 'q' }) } })
    await nextTick()
    expect(w.find('#q').exists()).toBe(true)
    expect(w.find('[data-testid="filter-sheet-open"]').exists()).toBe(false)
  })

  it('puts #filters-primary before #filters on a wide screen', async () => {
    const slots = { filters: () => h('select', { id: 'status' }), 'filters-primary': () => h('input', { id: 'q' }) }
    const w = mountPinned(SPageHeader, { props: { title: '分组' }, slots }, { compact: false })
    await nextTick()
    expect(w.findAll('input, select').map(e => e.attributes('id'))).toEqual(['q', 'status'])
  })
})
