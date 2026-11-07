import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import SPageHeader from './SPageHeader.vue'
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
    stubMedia(true)
    const w = mount(shell({ actions: () => h('button', '新建分组') }), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('新建分组')
    expect(w.find('.mb-3').exists()).toBe(false)
  })

  it('keeps the actions in the page on a narrow screen', async () => {
    stubMedia(false)
    const w = mount(shell({ actions: () => h('button', '新建分组') }), { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('#page-actions')?.textContent).toBe('')
    expect(w.get('.mb-3').text()).toBe('新建分组')
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
