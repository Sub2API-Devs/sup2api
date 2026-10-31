import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SFilterBar from './SFilterBar.vue'

describe('SFilterBar', () => {
  it('lays out filters, the #end slot and a Reset button only when @reset is bound', async () => {
    const onReset = vi.fn()
    const w = mount(SFilterBar, { props: { dirty: true, onReset, ariaLabel: 'Filters' }, slots: { default: () => h('input'), end: () => 'UTC' } })
    expect(w.attributes('role')).toBe('group')
    expect(w.classes()).toContain('card')
    expect(w.text()).toContain('UTC')
    await w.get('[data-testid="filter-reset"]').trigger('click')
    expect(onReset).toHaveBeenCalledOnce()
    const clean = mount(SFilterBar, { props: { onReset, card: false } })
    expect(clean.get('[data-testid="filter-reset"]').attributes('disabled')).toBeDefined()
    expect(clean.classes()).not.toContain('card')
    expect(mount(SFilterBar).find('[data-testid="filter-reset"]').exists()).toBe(false)
  })
})
