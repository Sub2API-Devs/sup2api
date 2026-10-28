import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Account, AccountType } from '@/api/types'
import { i18n } from '@/i18n'
import AccountBulkEditDialog from './AccountBulkEditDialog.vue'
import AccountBulkDeleteDialog from './AccountBulkDeleteDialog.vue'

const mocks = vi.hoisted(() => ({ patch: vi.fn(), del: vi.fn(), toast: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...await original<typeof import('@sub2api/host')>(), api: { patch: mocks.patch, del: mocks.del } }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), toast: mocks.toast }))
vi.mock('@/composables/lookups', () => ({ useGroupsLookup: () => ({ groups: ref([{ id: 1, name: 'g1' }, { id: 2, name: 'g2' }]) }), useProxiesLookup: () => ({ proxies: ref([]) }) }))
enableAutoUnmount(afterEach)

const acc = (id: number, over: Partial<Account> = {}) => ({ id, name: `a${id}`, plugin_key: 'p', type: 't', priority: 10, weight: 1, max_concurrency: 10, tpm_limit: 0, rpm_limit: 0, group_ids: [1], proxy_id: null, auto_disable: true, ...over }) as unknown as Account
const SModal = { props: ['open', 'title'], template: '<div v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>' }

describe('bulk account dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })

  it('patches each account with the ticked fields only and lists the failures', async () => {
    mocks.patch.mockImplementation(async (path: string, body: object) => {
      if (path === '/accounts/2') throw new Error('无权修改')
      return { id: Number(path.split('/')[2]), ...body }
    })
    const fixed = { common_controls: { auto_disable: { configurable: false } } } as unknown as AccountType
    const w = mount(AccountBulkEditDialog, {
      props: { open: false, accounts: [acc(1), acc(2), acc(3, { priority: 3 })], typeOf: (a: Account) => (a.id === 3 ? fixed : undefined) },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    await w.setProps({ open: true })
    expect(w.get('[data-testid="bulk-edit-apply"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="bulk-field-priority"] input[type="number"]').setValue('3')
    await w.get('[data-testid="bulk-field-auto_disable"] [role="switch"]').setValue(false)
    expect(w.text()).toContain('1 个账号的类型固定了此项')
    await w.get('[data-testid="bulk-edit-apply"]').trigger('click')
    await flushPromises()

    expect(mocks.patch.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ['/accounts/1', { priority: 3, auto_disable: false }],
      ['/accounts/2', { priority: 3, auto_disable: false }]
    ])
    expect(w.get('[data-testid="bulk-failures"]').text()).toContain('a2')
    expect(w.emitted('saved')![0][0]).toEqual([{ id: 1, priority: 3, auto_disable: false }])
    expect(w.emitted('update:open')).toBeUndefined()
    expect(mocks.toast).toHaveBeenCalledWith('成功 1，失败 1，跳过 1', 'warning')
  })

  it('deletes every selected account, keeping resources only where the type allows it', async () => {
    mocks.del.mockResolvedValue(undefined)
    const w = mount(AccountBulkDeleteDialog, {
      props: { open: false, accounts: [acc(1), acc(2)], retentionOf: (a: Account) => (a.id === 2 ? 7 : 0) },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    await w.setProps({ open: true })
    await w.get('[data-testid="bulk-delete-resources"] input[value="retain"]').setValue(true)
    await w.get('[data-testid="bulk-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del.mock.calls.map((c) => [c[0], c[1]])).toEqual([['/accounts/1', undefined], ['/accounts/2', { retain_resources: 1 }]])
    expect(w.emitted('deleted')![0][0]).toEqual([1, 2])
    expect(w.emitted('update:open')![0]).toEqual([false])
  })
})
