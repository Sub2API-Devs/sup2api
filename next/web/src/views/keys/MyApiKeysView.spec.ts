import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import MyApiKeysView from './MyApiKeysView.vue'
import KeyGroupSwitch from './KeyGroupSwitch.vue'

const { get, post, put, patch, reload, notifyError, deleteWithConfirm } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), reload: vi.fn(), notifyError: vi.fn(), deleteWithConfirm: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get, post, put, patch } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/composables/useList', () => ({ useList: () => ({ items: ref([{ id: 7, name: 'laptop', group_id: 1, status: 'active', created_at: '', allowed_ips: ['192.0.2.0/24'] }]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(1), reload }) }))
vi.mock('@/composables/lookups', () => ({ fetchMyGroups: async () => [{ id: 1, name: 'default' }, { id: 2, name: 'vip' }] }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (value: string) => value }) }))
vi.mock('@/composables/crud', () => ({ deleteWithConfirm }))
vi.mock('@/utils/errors', () => ({ fieldErrors: () => ({ allowed_ips: 'invalid IP' }), notifyError }))
enableAutoUnmount(afterEach)
function render() {
  i18n.global.locale.value = 'zh'
  return mount(MyApiKeysView, { global: { plugins: [i18n], stubs: { Teleport: true, ApiKeyCell: true, KeyGroupCell: true } } })
}

describe('API key IP configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    put.mockResolvedValue({})
    // Today's and all-time usage per key (group_by=api_key).
    get.mockImplementation(async (_path: string, q: { from: string }) => [{ key: '7', requests: q.from.startsWith('1970') ? 12 : 3, total_cost: q.from.startsWith('1970') ? '1.5' : '0.25' }])
  })
  it('loads and saves an owner key allowlist, including explicit clearing', async () => {
    const w = render()
    await w.get('[data-testid="edit-key-ips"]').trigger('click')
    expect((w.get('[data-testid="edit-key-ip-list"]').element as HTMLTextAreaElement).value).toBe('192.0.2.0/24')
    await w.get('[data-testid="edit-key-ip-list"]').setValue('2001:db8::/32\n192.0.2.7')
    await w.get('[data-testid="save-key-ips"]').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('/me/api-keys/7/ip-allowlist', { allowed_ips: ['2001:db8::/32', '192.0.2.7'] })
    expect(reload).toHaveBeenCalled()
    await w.get('[data-testid="edit-key-ips"]').trigger('click')
    await w.get('[data-testid="edit-key-ip-list"]').setValue('')
    await w.get('[data-testid="save-key-ips"]').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenLastCalledWith('/me/api-keys/7/ip-allowlist', { allowed_ips: [] })
  })
  it('keeps validation errors visible instead of closing the editor', async () => {
    put.mockRejectedValueOnce(new Error('invalid'))
    const w = render()
    await w.get('[data-testid="edit-key-ips"]').trigger('click')
    await w.get('[data-testid="edit-key-ip-list"]').setValue('bad-ip')
    await w.get('[data-testid="save-key-ips"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="edit-key-ip-list"]').exists()).toBe(true)
    expect(w.text()).toContain('invalid IP')
    expect(reload).not.toHaveBeenCalled()
  })
  it('includes the allowlist when creating a key', async () => {
    post.mockResolvedValueOnce({})
    const w = render()
    await flushPromises()
    await w.get('button.btn-primary').trigger('click')
    await w.get('form input').setValue('new-key')
    await w.get('[data-testid="create-key-ips"]').setValue('192.0.2.7\n2001:db8::/32')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys', expect.objectContaining({ name: 'new-key', allowed_ips: ['192.0.2.7', '2001:db8::/32'] }))
  })
  it('marks an IP-restricted key and deletes from the row', async () => {
    const w = render()
    expect(w.find('[data-testid="key-ip-restricted"]').exists()).toBe(true)
    await w.get('[data-testid="delete-key"]').trigger('click')
    expect(deleteWithConfirm).toHaveBeenCalledWith('/me/api-keys/7', expect.stringContaining('laptop'), reload)
  })
  it('shows the usage of each key today and in total', async () => {
    const w = render()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/me/usage/summary', expect.objectContaining({ group_by: 'api_key', from: new Date(0).toISOString() }))
    const usage = w.get('[data-testid="key-usage"]').text()
    expect(usage).toContain('$0.25')
    expect(usage).toContain('3 次')
    expect(usage).toContain('$1.50')
    expect(usage).toContain('12 次')
  })
  it('switches a key off and moves it to another group in place', async () => {
    patch.mockResolvedValueOnce({ id: 7, name: 'laptop', group_id: 1, status: 'disabled', created_at: '' })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="key-enabled-switch"]').trigger('click')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/me/api-keys/7', { status: 'disabled' })
    expect((w.get('[data-testid="key-enabled-switch"]').element as HTMLInputElement).checked).toBe(false)
    patch.mockResolvedValueOnce({ id: 7, name: 'laptop', group_id: 2, status: 'disabled', created_at: '' })
    // The menu itself is SDropdown's (it closes at once without layout here).
    w.findComponent(KeyGroupSwitch).vm.$emit('change', 2)
    await flushPromises()
    expect(patch).toHaveBeenLastCalledWith('/me/api-keys/7', { group_id: 2 })
    expect(reload).not.toHaveBeenCalled()
  })
  it('saves the caps of a key from its limits cell, field errors kept in the editor', async () => {
    const w = render()
    await flushPromises()
    await w.get('[data-testid="edit-key-limits"]').trigger('click')
    await w.get('[data-testid="key-limit-rpm_limit"]').setValue('30')
    patch.mockRejectedValueOnce(new Error('invalid'))
    await w.get('[data-testid="save-key-limits"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="save-key-limits"]').exists()).toBe(true)
    patch.mockResolvedValueOnce({ id: 7, name: 'laptop', group_id: 1, status: 'active', created_at: '', rpm_limit: 30, tpm_limit: 0, max_concurrency: 0 })
    await w.get('[data-testid="save-key-limits"]').trigger('click')
    await flushPromises()
    expect(patch).toHaveBeenLastCalledWith('/me/api-keys/7', { rpm_limit: 30, tpm_limit: 0, max_concurrency: 0 })
    expect(w.find('[data-testid="save-key-limits"]').exists()).toBe(false)
    expect(w.get('[data-testid="key-limits"]').text()).toContain('30')
  })
})
