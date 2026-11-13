// The super admin rows of the users page (T79): only the super admin itself
// acts on its row, and only to hand the role over; password resets go to
// other, non-super users.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'

const mocks = vi.hoisted(() => ({ users: [] as object[], me: { id: 1 }, perms: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => {
  const real = await original<typeof import('@sub2api/host')>()
  const api = {
    ...real.api,
    get: vi.fn(async () => []),
    list: vi.fn(async () => ({ items: mocks.users, page: { page: 1, page_size: 20, total: mocks.users.length }, paged: true }))
  }
  return { ...real, api }
})
vi.mock('@/composables/lookups', async (original) => ({ ...(await original<object>()), fetchFirstPage: async () => [] }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => mocks.perms.has(k), me: mocks.me }) }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: vi.fn() }) }))
enableAutoUnmount(afterEach)

import UsersView from './UsersView.vue'

const SDropdown = { props: ['actions'], emits: ['select'], template: '<div class="row-actions"><button v-for="a in actions.filter(x => !x.hidden)" :key="a.key" :data-action="a.key" @click="$emit(\'select\', a.key)">{{ a.key }}</button></div>' }
const user = (id: number, roles: string[]) => ({ id, email: `u${id}@x`, display_name: '', roles, status: 'active' })
const stubs = { SDropdown, Teleport: true, UserCreateDialog: true, UserPricingDrawer: true, UserSegmentMoveDialog: true, AdjustBalanceModal: true, ResetPasswordDialog: true, TransferSuperAdminDialog: true }

async function render() {
  const w = mount(UsersView, { global: { plugins: [i18n], stubs, directives: { permission: {} } } })
  await flushPromises()
  return w
}
/** The visible action keys of the row of user id ([] when the row has no menu). */
function actions(w: Awaited<ReturnType<typeof render>>, id: number) {
  const row = w.findAll('tr, [data-row]').find((r) => r.text().includes(`u${id}@x`))
  return row?.findAll('.row-actions button').map((b) => b.attributes('data-action')) ?? []
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  mocks.perms = new Set(['user:read', 'user:update', 'user:delete', 'user:password:reset'])
  mocks.users = [user(1, ['super_admin']), user(2, ['user']), user(3, ['super_admin'])]
})

describe('UsersView super admin rows', () => {
  it('badges super admin rows', async () => {
    const w = await render()
    expect(w.findAll('[data-testid="super-admin-badge"]')).toHaveLength(2)
  })

  it('gives the super admin only "transfer" on its own row and nothing on another super admin row', async () => {
    const w = await render()
    expect(actions(w, 1)).toEqual(['transfer'])
    expect(actions(w, 3)).toEqual([])
  })

  it('offers a password reset on other users with user:password:reset', async () => {
    let w = await render()
    expect(actions(w, 2)).toContain('password')
    mocks.perms.delete('user:password:reset')
    w.unmount()
    w = await render()
    expect(actions(w, 2)).not.toContain('password')
  })

  it('offers no password reset on the caller itself', async () => {
    mocks.me = { id: 2 }
    const w = await render()
    expect(actions(w, 2)).not.toContain('password')
    mocks.me = { id: 1 }
  })

  it('opens the transfer dialog from the own row', async () => {
    const w = await render()
    await w.get('.row-actions [data-action="transfer"]').trigger('click')
    expect(w.findComponent({ name: 'TransferSuperAdminDialog' }).props('open')).toBe(true)
  })
})
