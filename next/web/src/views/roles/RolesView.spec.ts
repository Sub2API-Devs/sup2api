import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import { ApiError } from '@sub2api/host'
import RolesView from './RolesView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(async () => []), post: vi.fn(async () => ({ id: 1 })), put: vi.fn(async () => ({})), patch: vi.fn(async () => ({})), list: vi.fn(async () => ({ items: [], page: { total: 0 } })) }))
vi.mock('@sub2api/host', async (original) => ({ ...await original<typeof import('@sub2api/host')>(), api: mocks }))
const lookups = vi.hoisted(() => ({ roles: [] as object[] }))
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), fetchFirstPage: async () => lookups.roles }))
const auth = vi.hoisted(() => ({ me: null as object | null, perms: null as string[] | null }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get me() { return auth.me },
    has: (p: string | string[]) => !auth.perms || [p].flat().some(k => auth.perms!.includes(k)),
    refreshPermissions: async () => undefined
  })
}))
enableAutoUnmount(afterEach)

const SFormModal = { props: ['open'], emits: ['submit'], template: '<form v-if="open" @submit.prevent="$emit(\'submit\')"><slot /></form>' }

async function create(key: string) {
  auth.me = null
  auth.perms = null
  lookups.roles = []
  const w = mount(RolesView, { global: { plugins: [i18n, createPinia()], stubs: { SFormModal, teleport: true } } })
  await flushPromises()
  await w.find('button').trigger('click')
  await w.find('input[placeholder="auditor"]').setValue(key)
  await w.find('input[placeholder="Auditor"]').setValue('Role')
  await w.find('form').trigger('submit')
  await flushPromises()
  return w
}

describe('RolesView role key', () => {
  it('accepts the server limit of 50 characters', async () => {
    mocks.post.mockClear()
    const key = 'a' + 'b'.repeat(49)
    await create(key)
    expect(mocks.post).toHaveBeenCalledWith('/roles', expect.objectContaining({ key }))
  })

  it('rejects longer, one-letter or non-letter-leading keys before posting', async () => {
    for (const key of ['a' + 'b'.repeat(50), 'a', '1ab', 'Ab']) {
      mocks.post.mockClear()
      const w = await create(key)
      expect(mocks.post).not.toHaveBeenCalled()
      expect(w.text()).toContain(i18n.global.t('roles.keyInvalid'))
    }
  })
})

describe('RolesView reserved key', () => {
  it('shows the reserved key error in the console language', async () => {
    const prev = i18n.global.locale.value
    mocks.post.mockRejectedValueOnce(new ApiError(400, { code: 'invalid_argument', message: 'key is reserved', details: { fields: [{ field: 'key', code: 'reserved', message: 'key is reserved' }] } }))
    i18n.global.locale.value = 'zh'
    const w = await create('supplier')
    expect(w.text()).toContain(i18n.global.t('roles.keyReserved'))
    expect(w.text()).not.toContain('key is reserved')
    i18n.global.locale.value = prev
  })
})

describe('RolesView permissions (T77)', () => {
  const role = (over: object) => ({ id: 1, key: 'lead', name: 'Lead', builtin: false, superuser: false, permission_keys: ['user:read'], assignable_role_keys: ['user'], assign_custom: false, ...over })
  const roles = [
    role({ id: 1, key: 'admin', name: 'Admin', builtin: true }),
    role({ id: 2, key: 'lead', name: 'Lead' }),
    role({ id: 3, key: 'super_admin', name: 'Super', builtin: true, superuser: true })
  ]

  async function open(id: number, { superuser = false, perms = ['role:define'] } = {}) {
    auth.me = { roles: [], superuser }
    auth.perms = perms
    lookups.roles = roles
    const w = mount(RolesView, { global: { plugins: [i18n, createPinia()], stubs: { SFormModal, teleport: true } } })
    await flushPromises()
    const target = roles.find(r => r.id === id)!
    await w.findAll('button').find(b => b.text().includes(String(target.name)))!.trigger('click')
    await flushPromises()
    return w
  }

  it('shows a built-in role read-only to a non-super admin', async () => {
    const w = await open(1)
    expect(w.find('[data-testid="role-save"]').exists()).toBe(false)
    expect(w.find('[data-testid="role-menu"]').exists()).toBe(false)
    expect(w.find('[data-testid="role-builtin-locked"]').exists()).toBe(true)
    expect(w.get('[data-testid="role-assignable"] input[data-role="admin"]').attributes('disabled')).toBeDefined()
  })

  it('lets the super admin edit a built-in role', async () => {
    const w = await open(1, { superuser: true })
    expect(w.find('[data-testid="role-save"]').exists()).toBe(true)
    expect(w.find('[data-testid="role-builtin-locked"]').exists()).toBe(false)
  })

  it('saves the managed roles with PUT /roles/:id/assignable including assign_custom', async () => {
    mocks.put.mockClear()
    const w = await open(2)
    // The super admin role is never offered.
    expect(w.find('[data-testid="role-assignable"] [data-role="super_admin"]').exists()).toBe(false)
    await w.get('[data-testid="role-assignable"] input[data-role="lead"]').setValue(true)
    await w.get('[data-testid="role-assign-custom"]').trigger('click')
    await w.get('[data-testid="role-save"]').trigger('click')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.put).toHaveBeenCalledWith('/roles/2/assignable', { role_keys: ['lead', 'user'], assign_custom: true })
  })

  it('shows what a refused save lacked', async () => {
    mocks.put.mockRejectedValueOnce(new ApiError(403, { code: 'permission_denied', message: 'no', details: { missing_assignable: ['admin'] } }))
    const w = await open(2)
    await w.get('[data-testid="role-assignable"] input[data-role="admin"]').setValue(true)
    await w.get('[data-testid="role-save"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="role-save-missing"]').text()).toContain('admin')
  })

  it('without role:define: no create button and no editing', async () => {
    const w = await open(2, { perms: ['role:read'] })
    expect(w.find('[data-testid="role-create"]').exists()).toBe(false)
    expect(w.find('[data-testid="role-save"]').exists()).toBe(false)
  })

  it('sends only the changed parts, and after a partial failure shows what was saved', async () => {
    mocks.put.mockClear()
    mocks.patch.mockClear()
    mocks.put.mockRejectedValueOnce(new ApiError(403, { code: 'permission_denied', message: 'no', details: { missing: ['a:b'], missing_assign_custom: true } }))
    const w = await open(2)
    const name = w.findAll('input').find(i => (i.element as HTMLInputElement).value === 'Lead')!
    await name.setValue('Lead 2')
    await w.get('[data-testid="role-assign-custom"]').trigger('click')
    lookups.roles = roles.map(r => (r.id === 2 ? { ...r, name: 'Lead 2' } : r))
    await w.get('[data-testid="role-save"]').trigger('click')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledTimes(1)
    // Permissions unchanged: only the managed roles were PUT (and refused).
    expect(mocks.put.mock.calls.map(c => (c as unknown[])[0])).toEqual(['/roles/2/assignable'])
    expect(w.get('[data-testid="role-save-missing"]').text()).toContain('a:b')
    // The saved name is shown; the refused switch is back to what the role has.
    expect(w.text()).toContain('Lead 2')
    expect(w.get('[data-testid="role-assign-custom"]').attributes('aria-checked')).toBe('false')
  })

  it('offers delete on a custom role and restore on a built-in role to the super admin', async () => {
    expect((await open(2)).find('[data-testid="role-menu"]').exists()).toBe(true)
    expect((await open(1, { superuser: true })).find('[data-testid="role-menu"]').exists()).toBe(true)
    expect((await open(3, { superuser: true })).find('[data-testid="role-assignable"]').exists()).toBe(false)
  })
})
