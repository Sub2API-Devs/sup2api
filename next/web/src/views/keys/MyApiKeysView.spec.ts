import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import MyApiKeysView from './MyApiKeysView.vue'

const { post, put, reload, notifyError, deleteWithConfirm } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), reload: vi.fn(), notifyError: vi.fn(), deleteWithConfirm: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { post, put } }))
vi.mock('@/composables/useList', () => ({ useList: () => ({ items: ref([{ id: 7, name: 'laptop', group_id: 1, status: 'active', created_at: '', allowed_ips: ['192.0.2.0/24'] }]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(1), reload }) }))
vi.mock('@/composables/lookups', () => ({ fetchMyGroups: async () => [{ id: 1, name: 'default' }] }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (value: string) => value }) }))
vi.mock('@/composables/crud', () => ({ deleteWithConfirm }))
vi.mock('@/utils/errors', () => ({ fieldErrors: () => ({ allowed_ips: 'invalid IP' }), notifyError }))
enableAutoUnmount(afterEach)
function render() {
  i18n.global.locale.value = 'zh'
  return mount(MyApiKeysView, { global: { plugins: [i18n], stubs: { Teleport: true, ApiKeyCell: true, KeyGroupCell: true } } })
}

describe('API key IP configuration', () => {
  beforeEach(() => { vi.clearAllMocks(); put.mockResolvedValue({}) })
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
})
