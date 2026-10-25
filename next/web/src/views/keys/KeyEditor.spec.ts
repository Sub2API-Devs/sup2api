import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey, Group } from '@/api/types'
import KeyEditor from './KeyEditor.vue'

const { post, patch, confirm } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), confirm: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { post, patch } }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), confirm }))
vi.mock('@/composables/platforms', () => ({ usePlatforms: () => ({ load: vi.fn(), label: (v: string) => v, endpointsOf: () => [] }) }))
vi.mock('@/utils/errors', () => ({ fieldErrors: (e: { fields?: Record<string, string> }) => e?.fields ?? {}, notifyError: vi.fn() }))
enableAutoUnmount(afterEach)

const groups = [{ id: 1, name: 'default', rate_multiplier: '1' }, { id: 2, name: 'vip', rate_multiplier: '0.8' }] as Group[]
const key = { id: 7, name: 'laptop', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', allowed_ips: ['192.0.2.0/24'],
  expires_at: null, rpm_limit: 60, tpm_limit: 0, max_concurrency: 0, quota_limit: '10', quota_used: '4' } as ApiKey
const render = (apiKey: ApiKey | null) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyEditor, { props: { open: true, apiKey, groups }, global: { plugins: [i18n], stubs: { Teleport: true } } })
}
const input = (w: ReturnType<typeof render>, id: string) => w.get(`[data-testid="${id}"]`)

describe('API key editor', () => {
  beforeEach(() => vi.clearAllMocks())
  it('saves every field of a key with one PATCH, leaving an unchanged group out', async () => {
    patch.mockResolvedValue({ ...key, name: 'renamed' })
    const w = render(key)
    expect((input(w, 'key-name').element as HTMLInputElement).value).toBe('laptop')
    expect((input(w, 'key-ips').element as HTMLTextAreaElement).value).toBe('192.0.2.0/24')
    await input(w, 'key-name').setValue('renamed')
    await input(w, 'key-ips').setValue('2001:db8::/32\n192.0.2.7')
    await input(w, 'key-limit-tpm_limit').setValue('5000')
    await input(w, 'save-key').trigger('click')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/me/api-keys/7', {
      name: 'renamed', allowed_ips: ['2001:db8::/32', '192.0.2.7'], expires_at: null,
      rpm_limit: 60, tpm_limit: 5000, max_concurrency: 0, quota_limit: 10
    })
    expect(w.emitted('saved')).toEqual([[{ ...key, name: 'renamed' }]])
    expect(w.emitted('update:open')).toEqual([[false]])
  })
  it('creates a key with POST, an empty expiry left out', async () => {
    post.mockResolvedValue({ ...key, id: 8, key: 'sk-s2a-new' })
    const w = render(null)
    expect(w.find('[data-testid="reset-key-quota"]').exists()).toBe(false)
    await input(w, 'key-name').setValue('new-key')
    await input(w, 'key-ips').setValue('192.0.2.7')
    await input(w, 'save-key').trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/me/api-keys', { name: 'new-key', group_id: 1, allowed_ips: ['192.0.2.7'], rpm_limit: 0, tpm_limit: 0, max_concurrency: 0, quota_limit: 0 })
  })
  it('keeps the editor open with the field errors of a refused save', async () => {
    patch.mockRejectedValueOnce({ fields: { allowed_ips: 'invalid IP' } })
    const w = render(key)
    await input(w, 'key-name').setValue(' ')
    await input(w, 'save-key').trigger('click')
    expect(patch).not.toHaveBeenCalled()
    expect(w.text()).toContain('必填')
    await input(w, 'key-name').setValue('laptop')
    await input(w, 'save-key').trigger('click')
    await flushPromises()
    expect(w.emitted('update:open')).toBeUndefined()
    expect(w.text()).toContain('invalid IP')
  })
  it('resets the used quota after confirmation', async () => {
    const k = { ...key }
    const w = render(k)
    confirm.mockResolvedValueOnce(false)
    await input(w, 'reset-key-quota').trigger('click')
    await flushPromises()
    expect(patch).not.toHaveBeenCalled()
    confirm.mockResolvedValueOnce(true)
    patch.mockResolvedValueOnce({ ...k, quota_used: '0' })
    await input(w, 'reset-key-quota').trigger('click')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/me/api-keys/7', { reset_quota: true })
    expect(k.quota_used).toBe('0')
  })
})
