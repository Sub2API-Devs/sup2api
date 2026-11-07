import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import UsageFilters from './UsageFilters.vue'
import UsageOverviewView from './UsageOverviewView.vue'
import UsageView from './UsageView.vue'
import UsageIPPanel from './UsageIPPanel.vue'
import { mountPinned } from '@sub2api/ui/testing'

const get = vi.hoisted(() => vi.fn(async () => []))
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
vi.mock('@sub2api/host', () => ({ api: { get, list: async () => ({ items: [], page: {} }) } }))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (permission: string) => permission === 'usage:all:read' }) }))
vi.mock('@/composables/useList', () => ({ useList: (_path: string, filters: Record<string, unknown>) => ({ items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive(filters), reload: vi.fn() }) }))

enableAutoUnmount(afterEach)
const global = { plugins: [i18n] }

describe('shared usage search', () => {
  it('uses the same search criteria for the totals and every chart', async () => {
    const w = mount(UsageOverviewView, { props: { admin: true }, global: { plugins: [i18n, createPinia()], stubs: { SChart: true } } })
    await flushPromises()
    w.getComponent(UsageFilters).vm.$emit('update:modelValue', { client_ip: '192.0.2.7', api_key_name: 'laptop', status_code: '429', stream: 'true' })
    await flushPromises()
    // default range today: hourly buckets; an operator's second breakdown is by group
    for (const group_by of ['none', 'model', 'group', 'hour']) {
      expect(get).toHaveBeenCalledWith('/usage/summary', expect.objectContaining({ client_ip: '192.0.2.7', api_key_name: 'laptop', status_code: '429', stream: 'true', group_by }))
    }
  })

  it('shows client IP statistics on their tab and filters records when an address is selected', async () => {
    route.query = { tab: 'ips' }
    const w = mount(UsageView, { global: { plugins: [i18n, createPinia()], stubs: { UsageTable: true, SChart: true } } })
    await flushPromises()
    expect(w.get('[data-testid="usage-ip-panel"]').isVisible()).toBe(true)
    w.getComponent(UsageIPPanel).vm.$emit('filter', '192.0.2.7')
    await flushPromises()
    expect(w.getComponent(UsageFilters).props('modelValue').client_ip).toBe('192.0.2.7')
    expect(get).toHaveBeenCalledWith('/usage/summary', expect.objectContaining({ client_ip: '192.0.2.7', group_by: 'ip' }))
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

  it('offers the account filters only to an operator who may read accounts', async () => {
    const w = mount(UsageFilters, { props: { modelValue: {}, admin: true }, global })
    await w.get('[data-testid="toggle-usage-filters"]').trigger('click')
    expect(w.find('[data-testid="filter-user_id"]').exists()).toBe(true)
    expect(w.find('[data-testid="filter-account_id"]').exists()).toBe(false)
    expect(w.find('[data-testid="filter-account_name"]').exists()).toBe(false)
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).not.toHaveProperty('account_id')
    await w.setProps({ accounts: true })
    expect(w.find('[data-testid="filter-account_id"]').exists()).toBe(true)
    expect(w.find('[data-testid="filter-account_name"]').exists()).toBe(true)
  })

  it('selects the request type on the first row from the types under the search, keeping a preset one', async () => {
    const w = mount(UsageFilters, { props: { modelValue: { protocol: 'vid.gen' }, protocolOptions: ['anthropic.messages', 'openai.chat'] }, global })
    const select = w.get('[data-testid="filter-protocol"]')
    const options = select.findAll('option')
    expect(options.map(option => option.text()).slice(1)).toEqual(['anthropic.messages', 'openai.chat', 'vid.gen'])
    expect(options[0].text()).not.toContain('usage.search.')
    expect(options[(select.element as HTMLSelectElement).selectedIndex].text()).toBe('vid.gen')
    expect(w.find('[data-testid="usage-advanced-filters"]').exists()).toBe(false)
    await select.setValue('2')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).toMatchObject({ protocol: 'openai.chat' })
    await w.get('[data-testid="toggle-usage-filters"]').trigger('click')
    expect(w.find('[data-testid="filter-protocol"]').element.closest('[data-testid="usage-advanced-filters"]')).toBeNull()
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

  it('ends the filter row with reset and search when there is no stats or actions row', () => {
    const bare = mount(UsageFilters, { props: { modelValue: {} }, global })
    expect(bare.find('.mt-3').exists()).toBe(false)
    expect(bare.get('[data-testid="filter-success"]').element.closest('form > div')).toBe(bare.get('[data-testid="search-usage"]').element.closest('form > div'))
    const full = mount(UsageFilters, { props: { modelValue: {} }, slots: { stats: '<span>stats</span>' }, global })
    expect(full.get('.mt-3').find('[data-testid="search-usage"]').exists()).toBe(true)
    expect(full.findAll('[data-testid="search-usage"]')).toHaveLength(1)
  })

  it('keeps the range and the text searches in sight on a phone and folds the rest into the Filters sheet', async () => {
    const logTypes = [{ value: 'records', label: 'Records' }, { value: 'errors', label: 'Errors' }]
    const w = mountPinned(UsageFilters, {
      props: { modelValue: { protocol: 'openai.chat', stream: 'true' }, logTypes, logType: 'errors' },
      slots: { range: '<button class="range">Today</button>', stats: '<span>stats</span>' },
      global
    })
    for (const key of ['model_contains', 'api_key_name', 'client_ip']) expect(w.find(`[data-testid="filter-${key}"]`).exists()).toBe(true)
    expect(w.find('.range').exists()).toBe(true)
    expect(w.find('[data-testid="filter-protocol"]').exists()).toBe(false)
    // log type, request type and stream are set
    expect(w.get('[data-testid="filter-sheet-open"]').text()).toContain('3')
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    await flushPromises()
    // the More filters fields come along, with no toggle
    const sheet = document.querySelector('[data-testid="filter-sheet"]')!
    expect(sheet.querySelector('[data-testid="filter-protocol"]')).not.toBeNull()
    expect(sheet.querySelector('[data-testid="filter-request_id"]')).not.toBeNull()
    document.body.innerHTML = ''
  })
})
