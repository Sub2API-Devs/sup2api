import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AccessKeysCard from './AccessKeysCard.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api }))
enableAutoUnmount(afterEach)

const modules = [
  { module: 'usage', label: { zh: '用量', en: 'Usage' }, source: 'core', status: 'active', permissions: [{ key: 'usage:self:read', label: { zh: '查看用量', en: 'View' }, description: {}, sensitive: false, status: 'active' }] }
]
const existing = { id: 1, name: 'ci', hint: 'abcd', permissions: ['usage:self:read', 'user:read'], lost: ['user:read'], expires_at: null, last_used_at: null, last_used_ip: '', created_at: '2026-11-05T00:00:00Z' }

const render = () => mount(AccessKeysCard, { global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })

describe('access keys card', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    api.get.mockReset()
    api.post.mockReset()
    api.patch.mockReset()
    api.get.mockImplementation(async (path: string) => (path.endsWith('/permissions') ? modules : []))
  })

  it('offers only the catalog of the user, needs a permission and the password, and shows the secret once', async () => {
    api.post.mockResolvedValue({ ...existing, key: 'sak_secret' })
    const w = render()
    await flushPromises()
    await w.get('[data-testid="access-key-add"]').trigger('click')
    await flushPromises()
    const tree = w.get('[data-testid="access-key-permissions"]')
    expect(tree.text()).toContain('用量')
    await w.get('[data-testid="access-key-name"] input, input[data-testid="access-key-name"]').setValue('ci')
    await w.get('[data-testid="access-key-password"] input, input[data-testid="access-key-password"]').setValue('pw')
    // No permission chosen yet: the form does not submit.
    expect((w.findAll('button').find((b) => b.text() === '保存')!.element as HTMLButtonElement).disabled).toBe(true)
    const boxes = tree.findAll('input[type="checkbox"]')
    await boxes[boxes.length - 1].setValue(true)
    await w.get('form[data-testid="access-key-form"]').trigger('submit')
    await flushPromises()
    const body = api.post.mock.calls[0][1]
    expect(api.post.mock.calls[0][0]).toBe('/me/access-keys')
    expect(body).toMatchObject({ name: 'ci', password: 'pw', permissions: ['usage:self:read'] })
    expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now() + 80 * 86400_000)
    expect(w.get('[data-testid="access-key-secret"]').text()).toBe('sak_secret')
    w.unmount()
  })

  it('marks permissions the user lost, and drops them when the key is saved', async () => {
    api.get.mockImplementation(async (path: string) => (path.endsWith('/permissions') ? modules : [existing]))
    api.patch.mockResolvedValue(existing)
    const w = render()
    await flushPromises()
    expect(w.get('[data-testid="access-key-lost"]').text()).toContain('1')
    await w.get('[data-testid="access-key-edit"]').trigger('click')
    await flushPromises()
    await w.get('[data-testid="access-key-password"] input, input[data-testid="access-key-password"]').setValue('pw')
    await w.get('form[data-testid="access-key-form"]').trigger('submit')
    await flushPromises()
    expect(api.patch).toHaveBeenCalledWith('/me/access-keys/1', { name: 'ci', password: 'pw', permissions: ['usage:self:read'] })
    w.unmount()
  })

  it('explains lost permissions come back, and the proof a chosen step-up permission needs', async () => {
    const stepUp = { key: 'user:password:reset', label: { zh: '重置密码', en: 'Reset' }, description: {}, sensitive: true, step_up: true, status: 'active' }
    const withStepUp = [{ ...modules[0], permissions: [...modules[0].permissions, stepUp] }]
    api.get.mockImplementation(async (path: string) => (path.endsWith('/permissions') ? withStepUp : [existing]))
    const w = render()
    await flushPromises()
    await w.get('[data-testid="access-key-edit"]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('重新获得后密钥会自动恢复')
    expect(w.find('[data-testid="access-key-step-up"]').exists()).toBe(false)
    const boxes = w.get('[data-testid="access-key-permissions"]').findAll('input[type="checkbox"]')
    await boxes[boxes.length - 1].setValue(true)
    expect(w.get('[data-testid="access-key-step-up"]').text()).toContain('X-Verify-Proof')
    w.unmount()
  })

  it('shows the refusal when a permission is not the user\'s', async () => {
    const { ApiError } = await import('@sub2api/host')
    api.post.mockRejectedValue(new ApiError(403, { code: 'permission_denied', message: '访问密钥只能拥有你自己的权限', details: { missing: ['user:delete'] } }))
    const w = render()
    await flushPromises()
    await w.get('[data-testid="access-key-add"]').trigger('click')
    await flushPromises()
    await w.get('[data-testid="access-key-name"] input, input[data-testid="access-key-name"]').setValue('ci')
    await w.get('[data-testid="access-key-password"] input, input[data-testid="access-key-password"]').setValue('pw')
    const boxes = w.get('[data-testid="access-key-permissions"]').findAll('input[type="checkbox"]')
    await boxes[boxes.length - 1].setValue(true)
    await w.get('form[data-testid="access-key-form"]').trigger('submit')
    await flushPromises()
    expect(w.get('[data-testid="access-key-error"]').text()).toContain('只能拥有你自己的权限')
    w.unmount()
  })

  it('lists the self module first and plugin modules after, marking step-up permissions', async () => {
    const item = (key: string, step_up = false) => ({ key, label: key, description: {}, sensitive: step_up, step_up, status: 'active' })
    api.get.mockImplementation(async (path: string) =>
      path.endsWith('/permissions')
        ? [
            { module: 'self', label: { zh: '我的账号', en: 'Self' }, source: 'core', status: 'active', permissions: [item('self:profile'), item('self:security', true)] },
            ...modules,
            { module: 'plugin.demo', label: { zh: '演示插件', en: 'Demo' }, source: 'plugin', plugin_key: 'demo', status: 'active', permissions: [item('plugin.demo.run')] }
          ]
        : []
    )
    const w = render()
    await flushPromises()
    await w.get('[data-testid="access-key-add"]').trigger('click')
    await flushPromises()
    const tree = w.get('[data-testid="access-key-permissions"]').text()
    expect(tree.indexOf('我的账号')).toBeLessThan(tree.indexOf('用量'))
    expect(tree.indexOf('用量')).toBeLessThan(tree.indexOf('演示插件'))
    expect(w.findAll('[data-testid="permission-step-up"]')).toHaveLength(1)
    w.unmount()
  })
})
