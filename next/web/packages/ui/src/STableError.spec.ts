import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import STable from './STable.vue'

const columns = [{ key: 'name', label: 'Name' }]

describe('STable error state', () => {
  it('says the load failed instead of No data, with Retry when listened to', async () => {
    const onRetry = vi.fn()
    const w = mount(STable, { props: { columns, rows: [], error: new Error('x'), onRetry } })
    expect(w.get('[data-testid="table-error"]').text()).toContain('Failed to load')
    expect(w.text()).not.toContain('No data')
    await w.get('[data-testid="table-error"] button').trigger('click')
    expect(onRetry).toHaveBeenCalledOnce()
    const quiet = mount(STable, { props: { columns, rows: [], error: true, errorText: 'Boom' } })
    expect(quiet.get('[data-testid="table-error"]').text()).toBe('Boom')
    expect(quiet.find('[data-testid="table-error"] button').exists()).toBe(false)
  })

  it('keeps stale rows under a notice, and shows nothing when there is no error', () => {
    const w = mount(STable, { props: { columns, rows: [{ id: 1, name: 'a' }], error: 'x' } })
    expect(w.find('[data-testid="table-error"]').exists()).toBe(true)
    expect(w.text()).toContain('a')
    expect(mount(STable, { props: { columns, rows: [] } }).text()).toContain('No data')
  })
})
