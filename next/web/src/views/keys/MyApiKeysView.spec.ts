import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { rangeBounds } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { startOfToday } from '@/utils/format'
import MyApiKeysView from './MyApiKeysView.vue'
import KeyEditor from './KeyEditor.vue'
import KeyGroupSwitch from './KeyGroupSwitch.vue'

const { get, post, patch, reload, notifyError, deleteWithConfirm } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), reload: vi.fn(), notifyError: vi.fn(), deleteWithConfirm: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get, post, patch } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
const row = () => ({ id: 7, name: 'laptop', group_id: 1, status: 'active', created_at: '', allowed_ips: ['192.0.2.0/24'], quota_limit: '10', quota_used: '4', rpm_limit: 60, live: { rpm: 12, tpm: 300, concurrency: 1 } })
const items = ref([row()])
vi.mock('@/composables/useList', () => ({ useList: () => ({ items, loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(1), reload }) }))
vi.mock('@/composables/lookups', () => ({ fetchMyGroups: async () => [{ id: 1, name: 'default', rate_multiplier: '1' }, { id: 2, name: 'vip', rate_multiplier: '0.8' }] }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (value: string) => value, endpointsOf: () => [] }) }))
vi.mock('@/composables/crud', () => ({ deleteWithConfirm }))
vi.mock('@/utils/errors', () => ({ fieldErrors: () => ({}), notifyError }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light' }) }))
enableAutoUnmount(afterEach)
function render() {
  i18n.global.locale.value = 'zh'
  return mount(MyApiKeysView, { global: { plugins: [i18n], stubs: { Teleport: true, ApiKeyCell: true, SChart: true } } })
}

describe('API key list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    items.value = [row()]
    // Today's and all-time usage per key (group_by=api_key).
    get.mockImplementation(async (_path: string, q: { from: string }) => [{ key: '7', requests: q.from === startOfToday().toISOString() ? 3 : 12, total_cost: q.from === startOfToday().toISOString() ? '0.25' : '1.5' }])
  })
  it('opens the usage of a key in a drawer, 7 days first, then 30', async () => {
    const w = render()
    await flushPromises()
    expect(w.find('[data-testid="key-usage-drawer"]').exists()).toBe(false)
    await w.get('[data-testid="open-key-usage"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="key-usage-drawer"]').exists()).toBe(true)
    const seven = new Date()
    seven.setHours(0, 0, 0, 0)
    seven.setDate(seven.getDate() - 6)
    for (const g of ['none', 'day', 'model']) expect(get).toHaveBeenCalledWith('/me/usage/summary', expect.objectContaining({ api_key_id: '7', group_by: g, from: seven.toISOString() }))
    get.mockClear()
    await w.get('[data-testid="key-usage-days"]').findAll('input')[1].setValue(true)
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/me/usage/summary', expect.objectContaining({ api_key_id: '7', group_by: 'day' }))
    expect(new Date(get.mock.calls[0][1].from).getTime()).toBeLessThan(seven.getTime())
  })
  it('marks an IP-restricted key and deletes from the row', async () => {
    const w = render()
    expect(w.find('[data-testid="key-ip-restricted"]').exists()).toBe(true)
    await w.get('[data-testid="delete-key"]').trigger('click')
    expect(deleteWithConfirm).toHaveBeenCalledWith('/me/api-keys/7', expect.stringContaining('laptop'), reload)
  })
  it('shows the usage of each key today and in the last 30 days', async () => {
    const w = render()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/me/usage/summary', expect.objectContaining({ group_by: 'api_key', from: rangeBounds('30d').from }))
    const usage = w.get('[data-testid="key-usage"]').text()
    expect(usage).toContain('$0.25')
    expect(usage).toContain('3 次')
    expect(usage).toContain('$1.50')
    expect(usage).toContain('12 次')
  })
  it('shows RPM, TPM and concurrency, capped or not', async () => {
    const w = render()
    const limits = w.get('[data-testid="key-limits"]')
    expect(limits.get('[data-limit="rpm_limit"]').text().replace(/\s+/g, '')).toBe('RPM12/60')
    expect(limits.get('[data-limit="tpm_limit"]').text().replace(/\s+/g, '')).toBe('TPM300/∞')
    expect(limits.get('[data-limit="max_concurrency"]').text().replace(/\s+/g, '')).toBe('并发1/∞')
    expect(limits.findAll('[role="progressbar"]')).toHaveLength(1)
  })
  it('switches a key off and moves it to another group in place', async () => {
    patch.mockResolvedValueOnce({ ...row(), status: 'disabled' })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="key-enabled-switch"]').trigger('click')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/me/api-keys/7', { status: 'disabled' })
    expect((w.get('[data-testid="key-enabled-switch"]').element as HTMLInputElement).checked).toBe(false)
    patch.mockResolvedValueOnce({ ...row(), status: 'disabled', group_id: 2 })
    // The menu itself is SDropdown's (it closes at once without layout here).
    w.findComponent(KeyGroupSwitch).vm.$emit('change', 2)
    await flushPromises()
    expect(patch).toHaveBeenLastCalledWith('/me/api-keys/7', { group_id: 2 })
    expect(reload).not.toHaveBeenCalled()
  })
  it('edits a key from its row and creates one with the same editor', async () => {
    const w = render()
    await flushPromises()
    await w.get('[data-testid="edit-key"]').trigger('click')
    const editor = w.findComponent(KeyEditor)
    expect(editor.props('open')).toBe(true)
    expect(editor.props('apiKey')).toMatchObject({ id: 7 })
    editor.vm.$emit('saved', { ...row(), name: 'renamed' })
    await flushPromises()
    expect(w.text()).toContain('renamed')
    expect(reload).not.toHaveBeenCalled()

    await w.get('[data-testid="create-key"]').trigger('click')
    expect(editor.props('apiKey')).toBeNull()
    editor.vm.$emit('saved', { ...row(), id: 8, key: 'sk-s2a-plaintext' })
    await flushPromises()
    expect(reload).toHaveBeenCalled()
    expect(w.text()).toContain('sk-s2a-plaintext')
  })
})
