import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
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
vi.mock('@/composables/useList', async importOriginal => ({ ...(await importOriginal<object>()), useList: (_path: string, filters: Record<string, unknown>) => ({ items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive(filters), reload: vi.fn() }) }))

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

  /** The More filters panel of a wide screen, and its toggle. */
  const advanced = (w: VueWrapper) => w.get('[data-testid="filter-advanced"]')
  const toggleAdvanced = (w: VueWrapper) => w.get('[data-testid="filter-advanced-toggle"]').trigger('click')
  const inAdvanced = (w: VueWrapper, field: string) => w.get(`[data-testid="filter-${field}"]`).element.closest('[data-testid="filter-advanced"]') !== null

  it('retains selected groups when query IDs are strings, on a user\'s first row and behind an operator\'s More filters', async () => {
    const groupOptions = [{ value: '', label: 'All' }, { value: 7, label: 'Team' }]
    for (const admin of [false, true]) {
      const w = mount(UsageFilters, { props: { modelValue: { group_id: '7' }, groupOptions, admin }, global })
      expect(inAdvanced(w, 'group_id')).toBe(admin)
      const select = w.get('[data-testid="filter-group_id"]')
      expect(select.text()).toContain('Team')
      expect((select.element as HTMLSelectElement).value).toBe('1')
      await w.get('form').trigger('submit')
      expect(w.emitted('update:modelValue')![0]![0]).toMatchObject({ group_id: '7' })
    }
  })

  it('applies complete filters only on search and resets without changing time bounds', async () => {
    const w = mount(UsageFilters, {
      props: { modelValue: { from: '2026-10-01T00:00:00Z', client_request_id: 'request-one' }, admin: true, logType: 'errors' },
      global,
      attachTo: document.body
    })
    await w.get('[data-testid="filter-api_key"]').setValue('7')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(advanced(w).isVisible()).toBe(false)
    await toggleAdvanced(w)
    expect(advanced(w).isVisible()).toBe(true)
    await w.get('[data-testid="filter-client_ip"]').setValue('192.0.2.7')
    await w.get('[data-testid="filter-status_code"]').setValue('429')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    await w.get('form').trigger('submit')
    const first = w.emitted('update:modelValue')![0]![0]
    // the id-or-name box sets the id and clears the name; a parameter without a field is kept
    expect(first).toMatchObject({ client_ip: '192.0.2.7', api_key_id: '7', api_key_name: '', status_code: '429', client_request_id: 'request-one' })
    expect(first).not.toHaveProperty('from')
    await w.get('[data-testid="reset-usage-filters"]').trigger('click')
    expect(Object.values(w.emitted('update:modelValue')![1]![0] as Record<string, string>).every(value => value === '')).toBe(true)
    expect(w.emitted('reset')).toHaveLength(1)
    document.body.innerHTML = ''
  })

  it('offers the account filter only to an operator who may read accounts', async () => {
    const w = mount(UsageFilters, { props: { modelValue: {}, admin: true }, global })
    expect(inAdvanced(w, 'user')).toBe(false)
    expect(w.find('[data-testid="filter-account"]').exists()).toBe(false)
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).not.toHaveProperty('account_id')
    expect(w.emitted('update:modelValue')![0]![0]).not.toHaveProperty('account_name')
    await w.setProps({ accounts: true })
    expect(inAdvanced(w, 'account')).toBe(true)
    await w.get('[data-testid="filter-account"]').setValue('Main')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![1]![0]).toMatchObject({ account_id: '', account_name: 'Main' })
  })

  it('filters operators by protocol conversion (CONVERT-MATRIX §6.2)', async () => {
    const locale = i18n.global.locale.value
    i18n.global.locale.value = 'zh'
    const w = mount(UsageFilters, { props: { modelValue: { conversion: 'lossy' }, admin: true }, global })
    expect(inAdvanced(w, 'conversion')).toBe(true)
    const select = w.get('[data-testid="filter-conversion"]')
    const options = select.findAll('option')
    expect(options.map(option => option.text())).toEqual(['协议转换', '原生', '已转换', '良好', '一般', '不推荐', '本地估算', '有丢失'])
    expect(options[(select.element as HTMLSelectElement).selectedIndex].text()).toBe('有丢失')
    // set behind the folded More filters: counted on the toggle, listed as a chip
    expect(w.get('[data-testid="filter-advanced-count"]').text()).toBe('1')
    expect(w.get('[data-filter-key="conversion"]').text()).toContain('协议转换：有丢失')
    await select.setValue('4')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).toMatchObject({ conversion: 'fair' })
    const self = mount(UsageFilters, { props: { modelValue: {} }, global })
    expect(self.find('[data-testid="filter-conversion"]').exists()).toBe(false)
    i18n.global.locale.value = locale
  })

  it('selects the request type behind More filters from the types under the search, keeping a preset one', async () => {
    const w = mount(UsageFilters, { props: { modelValue: { protocol: 'vid.gen' }, protocolOptions: ['anthropic.messages', 'openai.chat'] }, global })
    expect(inAdvanced(w, 'protocol')).toBe(true)
    const select = w.get('[data-testid="filter-protocol"]')
    const options = select.findAll('option')
    expect(options.map(option => option.text()).slice(1)).toEqual(['anthropic.messages', 'openai.chat', 'vid.gen'])
    expect(options[0].text()).not.toContain('usage.search.')
    expect(options[(select.element as HTMLSelectElement).selectedIndex].text()).toBe('vid.gen')
    await select.setValue('2')
    await w.get('form').trigger('submit')
    expect(w.emitted('update:modelValue')![0]![0]).toMatchObject({ protocol: 'openai.chat' })
  })

  it('keeps administrative fields out of self-service and synchronizes external request-id filters', async () => {
    const w = mount(UsageFilters, { props: { modelValue: {} }, global })
    for (const field of ['user', 'account', 'node_id', 'conversion']) expect(w.find(`[data-testid="filter-${field}"]`).exists()).toBe(false)
    expect(inAdvanced(w, 'request_id')).toBe(true)
    expect(w.find('[data-testid="filter-chips"]').exists()).toBe(false)
    // a request id set from outside fills its field; a client request id, which has none, shows as a chip
    await w.setProps({ modelValue: { request_id: 'req-9', client_request_id: 'selected-request' } })
    expect((w.get('[data-testid="filter-request_id"]').element as HTMLInputElement).value).toBe('req-9')
    expect(w.get('[data-filter-key="client_request_id"]').text()).toContain('selected-request')
    await w.get('form').trigger('submit')
    const applied = w.emitted('update:modelValue')![0]![0]
    expect(applied).toMatchObject({ request_id: 'req-9', client_request_id: 'selected-request' })
    expect(applied).not.toHaveProperty('user_id')
    await w.get('[data-filter-key="client_request_id"] button').trigger('click')
    expect(w.emitted('update:modelValue')![1]![0]).toEqual({ client_request_id: '' })
    expect(w.text()).not.toContain('usage.search.')
  })

  it('drops the account type with its plugin chip, and Clear all clears the chips only', async () => {
    const w = mount(UsageFilters, { props: { modelValue: { model_contains: 'gpt', plugin_key: 'p', account_type: 'apikey' }, admin: true }, global })
    // the API refuses account_type without plugin_key
    await w.get('[data-filter-key="plugin_key"] button').trigger('click')
    expect(w.emitted('update:modelValue')![0]![0]).toEqual({ plugin_key: '', account_type: '' })
    await w.get('[data-testid="filter-chips-clear"]').trigger('click')
    const cleared = w.emitted('update:modelValue')![1]![0] as Record<string, string>
    expect(cleared).toMatchObject({ plugin_key: '', account_type: '' })
    expect(cleared).not.toHaveProperty('model_contains')
  })

  it('ends the filter row with reset and search when there is no stats or actions row', () => {
    const bare = mount(UsageFilters, { props: { modelValue: {} }, global })
    expect(bare.find('.mt-3').exists()).toBe(false)
    expect(bare.get('[data-testid="filter-success"]').element.closest('form > div')).toBe(bare.get('[data-testid="search-usage"]').element.closest('form > div'))
    const full = mount(UsageFilters, { props: { modelValue: {} }, slots: { stats: '<span>stats</span>' }, global })
    expect(full.get('.mt-3').find('[data-testid="search-usage"]').exists()).toBe(true)
    expect(full.findAll('[data-testid="search-usage"]')).toHaveLength(1)
  })

  it('puts the tools after the actions, before Reset / Search, on a wide screen', () => {
    const w = mount(UsageFilters, { props: { modelValue: {} }, slots: { actions: '<button type="button" class="act" />', tools: '<button type="button" class="tool" />' }, global })
    expect(w.get('.mt-3').findAll('button').map(b => b.classes('act') ? 'act' : b.classes('tool') ? 'tool' : b.attributes('data-testid'))).toEqual(['act', 'tool', 'reset-usage-filters', 'search-usage'])
  })

  it('keeps the range, the log type and the first row in sight on a phone, folds More filters into the Filters sheet and applies it on Done', async () => {
    const logTypes = [{ value: 'records', label: 'Records' }, { value: 'errors', label: 'Errors' }]
    const w = mountPinned(UsageFilters, {
      props: { modelValue: { protocol: 'openai.chat', stream: 'true', success: 'false' }, logTypes, logType: 'errors' },
      slots: { range: '<button class="range">Today</button>', stats: '<span>stats</span>', tools: '<button type="button" class="tool">Export</button>' },
      global
    })
    expect(w.find('.tool').exists()).toBe(false)
    for (const key of ['log-type', 'model_contains', 'group_name', 'api_key']) expect(w.find(`[data-testid="filter-${key}"]`).exists()).toBe(true)
    expect(w.find('.range').exists()).toBe(true)
    for (const key of ['protocol', 'client_ip']) expect(w.find(`[data-testid="filter-${key}"]`).exists()).toBe(false)
    expect(w.find('[data-testid="filter-advanced-toggle"]').exists()).toBe(false)
    // only the request type is a sheet filter: the stream has no field (a chip) and failed requests set the status themselves
    expect(w.get('[data-testid="filter-sheet-open"]').text()).toContain('1')
    expect(w.find('[data-filter-key="stream"]').exists()).toBe(true)
    expect(w.find('[data-filter-key="success"]').exists()).toBe(false)
    await w.get('[data-testid="filter-sheet-open"]').trigger('click')
    await flushPromises()
    const sheet = document.querySelector('[data-testid="filter-sheet"]')!
    expect(sheet.querySelector('[data-testid="filter-protocol"]')).not.toBeNull()
    expect(sheet.querySelector('[data-testid="filter-status_code"]')).not.toBeNull()
    expect(document.querySelector('[role="dialog"] .tool')).not.toBeNull()
    const requestId = sheet.querySelector<HTMLInputElement>('input[data-testid="filter-request_id"]')!
    requestId.value = 'req-1'
    requestId.dispatchEvent(new Event('input'))
    expect(w.emitted('update:modelValue')).toBeUndefined()
    document.querySelector<HTMLButtonElement>('[data-testid="filter-sheet-done"]')!.click()
    await flushPromises()
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ request_id: 'req-1', protocol: 'openai.chat', stream: 'true' })
    expect(document.querySelector('[data-testid="filter-sheet"]')).toBeNull()
    document.body.innerHTML = ''
  })
})
