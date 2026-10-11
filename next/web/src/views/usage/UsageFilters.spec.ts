import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { i18n } from '@/i18n'
import UsageFilters from './UsageFilters.vue'
import UsageView from './UsageView.vue'

const get = vi.hoisted(() => vi.fn(async () => []))
vi.mock('@sub2api/host', () => ({ api: { get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (permission: string) => permission === 'usage:all:read' }) }))
vi.mock('@/composables/useList', () => ({ useList: (_path: string, filters: Record<string, unknown>) => ({ items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive(filters), reload: vi.fn() }) }))

enableAutoUnmount(afterEach)
const global = { plugins: [i18n] }

describe('shared usage search', () => {
  it('uses the same search criteria for the overview statistics', async () => {
    const w = mount(UsageView, { global: { ...global, stubs: { UsageTable: true, SChart: true } } })
    await flushPromises()
    w.getComponent(UsageFilters).vm.$emit('update:modelValue', { client_ip: '192.0.2.7', api_key_name: 'laptop', status_code: '429', stream: 'true' })
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith('/usage/summary', expect.objectContaining({ client_ip: '192.0.2.7', api_key_name: 'laptop', status_code: '429', stream: 'true', group_by: 'day' }))
  })

  it('retains selected groups when query IDs are strings', async () => {
    const w = mount(UsageFilters, { props: { modelValue: { group_id: '7' }, groupOptions: [{ value: '', label: 'All' }, { value: 7, label: 'Team' }] }, global })
    await w.get('[data-testid="toggle-usage-filters"]').trigger('click')
    const selected = w.findAll('select').find(select => select.text().includes('Team'))!
    expect((selected.element as HTMLSelectElement).value).toBe('1')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).toMatchObject({ group_id: '7' })
  })

  it('applies complete filters only on search and resets without changing time bounds', async () => {
    const w = mount(UsageFilters, { props: { modelValue: { from: '2026-10-01T00:00:00Z', client_request_id: 'request-one' }, admin: true }, global })
    await w.get('[data-testid="filter-client_ip"]').setValue('192.0.2.7')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    await w.get('[data-testid="toggle-usage-filters"]').trigger('click')
    await w.get('[data-testid="filter-api_key_id"]').setValue('7')
    await w.get('[data-testid="filter-status_code"]').setValue('429')
    await w.get('form').trigger('submit')
    const first = w.emitted('update:modelValue')![0]![0]
    expect(first).toMatchObject({ client_ip: '192.0.2.7', api_key_id: '7', status_code: '429', client_request_id: 'request-one' })
    expect(first).not.toHaveProperty('from')
    await w.get('[data-testid="reset-usage-filters"]').trigger('click')
    expect(Object.values(w.emitted('update:modelValue')![1]![0] as Record<string, string>).every(value => value === '')).toBe(true)
  })

  it('keeps administrative fields out of self-service and synchronizes external request-id filters', async () => {
    const w = mount(UsageFilters, { props: { modelValue: {} }, global })
    await w.get('[data-testid="toggle-usage-filters"]').trigger('click')
    expect(w.find('[data-testid="filter-user_id"]').exists()).toBe(false)
    expect(w.find('[data-testid="filter-account_id"]').exists()).toBe(false)
    expect(w.find('[data-testid="filter-node_id"]').exists()).toBe(false)
    expect(w.find('[data-testid="filter-request_id"]').exists()).toBe(true)
    await w.setProps({ modelValue: { client_request_id: 'selected-request' } })
    expect((w.get('[data-testid="filter-client_request_id"]').element as HTMLInputElement).value).toBe('selected-request')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).not.toHaveProperty('user_id')
    expect(w.text()).not.toContain('usage.search.')
  })
})
