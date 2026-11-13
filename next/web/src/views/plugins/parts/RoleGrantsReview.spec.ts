import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { PluginRoleGrant } from '@/api/types'

const mocks = vi.hoisted(() => ({ post: vi.fn(async () => ({})), get: vi.fn(async () => []), lacks: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { post: mocks.post, get: mocks.get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => !mocks.lacks.has(k), me: { id: 1, superuser: false }, permissionsEpoch: 0 }) }))

import RoleGrantsReview from './RoleGrantsReview.vue'

const grant = (version: string, role: string, needs = true): PluginRoleGrant => ({ version, permission: 'plugin.mod:mod:read', role, sensitive: needs, via: 'default', needs_consent: needs })
const render = () =>
  mount(RoleGrantsReview, { props: { pluginKey: 'mod', grants: [grant('0.2.0', 'user'), grant('0.3.0', 'lead'), grant('0.3.0', 'admin', false)] }, global: { plugins: [i18n] } })

describe('RoleGrantsReview', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    mocks.post.mockClear()
    mocks.lacks = new Set()
  })

  it('lists the held-back grants and confirms them version by version', async () => {
    const w = render()
    expect(w.findAll('li')).toHaveLength(3)
    expect(w.findAll('[data-needs-consent]')).toHaveLength(2)
    await w.get('[data-testid="role-grants-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/plugins/mod/versions/0.2.0/role-grants/confirm', '/plugins/mod/versions/0.3.0/role-grants/confirm'])
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('rejects them all', async () => {
    const w = render()
    await w.get('[data-testid="role-grants-reject"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/plugins/mod/versions/0.2.0/role-grants/reject', '/plugins/mod/versions/0.3.0/role-grants/reject'])
  })

  it.each(['plugin:install', 'role:define'])('only tells a caller without %s, with no buttons', (perm) => {
    mocks.lacks = new Set([perm])
    const w = render()
    expect(w.find('[data-testid="role-grants-confirm"]').exists()).toBe(false)
    expect(w.text()).toContain('plugin:install')
  })
})
