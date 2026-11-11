import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import SFilterChips from './SFilterChips.vue'

enableAutoUnmount(afterEach)

describe('SFilterChips', () => {
  const items = [
    { key: 'endpoint', label: 'Endpoint', value: '/v1/chat' },
    { key: 'user_id', label: 'User', value: '7' }
  ]

  it('shows each filter as a removable "label: value" chip with Clear all', async () => {
    const w = mount(SFilterChips, { props: { items } })
    expect(w.text()).toContain('Endpoint: /v1/chat')
    const remove = w.get('[data-filter-key="user_id"] button')
    expect(remove.attributes('aria-label')).toBe('Remove filter User')
    await remove.trigger('click')
    expect(w.emitted('remove')).toEqual([['user_id']])
    await w.get('[data-testid="filter-chips-clear"]').trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)
  })

  it('renders nothing without items', () => {
    expect(mount(SFilterChips, { props: { items: [] } }).find('[data-testid="filter-chips"]').exists()).toBe(false)
  })
})
