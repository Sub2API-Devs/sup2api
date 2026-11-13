import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { PluginRoleGrant } from '@/api/types'

// The managed roles: built-in user and admin, custom lead.
const managed = [
  { key: 'user', builtin: true, grantable: true },
  { key: 'admin', builtin: true, grantable: true },
  { key: 'lead', builtin: false, grantable: true }
]
const mocks = vi.hoisted(() => ({ post: vi.fn(async () => ({})), get: vi.fn(async () => [] as unknown[]), lacks: new Set<string>(), me: { id: 1, superuser: true, roles: ['super_admin'] } }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { post: mocks.post, get: mocks.get } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), confirm: async () => true, toast: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => !mocks.lacks.has(k), me: mocks.me, permissionsEpoch: 0 }) }))

import { ApiError } from '@sub2api/host'
import RoleGrantsReview from './RoleGrantsReview.vue'

const grant = (version: string, role: string, needs = true): PluginRoleGrant => ({ version, permission: 'plugin.mod:mod:read', role, sensitive: needs, via: 'default', needs_consent: needs })
const all = [grant('0.2.0', 'user'), grant('0.3.0', 'lead'), grant('0.3.0', 'admin', false)]
const render = async (grants = all) => {
  const w = mount(RoleGrantsReview, { props: { pluginKey: 'mod', grants }, global: { plugins: [i18n] } })
  await flushPromises() // the managed roles
  return w
}

describe('RoleGrantsReview', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    mocks.post.mockClear()
    mocks.lacks = new Set()
    mocks.get.mockResolvedValue(managed)
    mocks.me.superuser = true
    mocks.me.roles = ['super_admin']
  })

  it('lists the held-back grants and confirms them version by version', async () => {
    const w = await render()
    expect(w.findAll('li')).toHaveLength(3)
    expect(w.findAll('[data-needs-consent]')).toHaveLength(2)
    await w.get('[data-testid="role-grants-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/plugins/mod/versions/0.2.0/role-grants/confirm', '/plugins/mod/versions/0.3.0/role-grants/confirm'])
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('rejects them all', async () => {
    const w = await render()
    await w.get('[data-testid="role-grants-reject"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/plugins/mod/versions/0.2.0/role-grants/reject', '/plugins/mod/versions/0.3.0/role-grants/reject'])
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('counts a version settled meanwhile (404) as done and goes on; another error stops and still reloads', async () => {
    mocks.post.mockRejectedValueOnce(new ApiError(404, { code: 'not_found', message: '' }))
    const w = await render()
    await w.get('[data-testid="role-grants-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(2)
    mocks.post.mockClear()
    mocks.post.mockRejectedValueOnce(new ApiError(403, { code: 'permission_denied', message: '' }))
    await w.get('[data-testid="role-grants-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(w.emitted('changed')).toHaveLength(2)
  })

  it.each(['plugin:install', 'role:define'])('only tells a caller without %s, with no buttons', async (perm) => {
    mocks.lacks = new Set([perm])
    const w = await render()
    expect(w.find('[data-testid="role-grants-confirm"]').exists()).toBe(false)
    expect(w.find('[data-testid="role-grants-reject"]').exists()).toBe(false)
    expect(w.text()).toContain('plugin:install')
  })

  it('offers no buttons to an administrator for grants to built-in roles (only the super admin names them)', async () => {
    mocks.me.superuser = false
    mocks.me.roles = ['admin']
    const w = await render()
    expect(w.find('[data-testid="role-grants-confirm"]').exists()).toBe(false)
    const custom = await render([grant('0.3.0', 'lead')])
    expect(custom.find('[data-testid="role-grants-confirm"]').exists()).toBe(true)
  })
})
