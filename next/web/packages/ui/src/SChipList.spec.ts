import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import SChipList from './SChipList.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

const items = ['alpha', 'beta', 'gamma', 'delta'].map((label) => ({ key: label, label }))

describe('SChipList', () => {
  it('shows the first `max` chips and folds the rest into a +N chip listing every item', async () => {
    const w = mount(SChipList, { props: { items: [{ ...items[0], tone: 'danger' as const, title: 'First' }, ...items.slice(1)] }, attachTo: document.body })
    expect(w.classes()).toContain('whitespace-nowrap')
    const more = w.get('[data-testid="chip-list-more"]')
    expect(more.text()).toBe('+2')
    expect(w.text()).not.toContain('gamma')
    expect(w.get('[title="First"]').text()).toBe('alpha')
    expect(w.get('[title="First"]').classes().join(' ')).toContain('h-5')
    await more.trigger('focusin')
    await flushPromises()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('alphabetagammadelta')
  })

  it('needs no +N chip when every item fits, and renders nothing without items', () => {
    const w = mount(SChipList, { props: { items: items.slice(0, 1), max: 1, size: 'sm' } })
    expect(w.find('[data-testid="chip-list-more"]').exists()).toBe(false)
    expect(w.text()).toBe('alpha')
    expect(mount(SChipList, { props: { items: [] } }).find('[data-testid="chip-list"]').exists()).toBe(false)
  })
})
