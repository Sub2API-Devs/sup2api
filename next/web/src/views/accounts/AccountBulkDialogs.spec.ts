import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Account, AccountType } from '@/api/types'
import EntityMultiPicker from '@/components/EntityMultiPicker.vue'
import EntityPicker from '@/components/EntityPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import { i18n } from '@/i18n'
import AccountBulkEditDialog from './AccountBulkEditDialog.vue'
import AccountBulkDeleteDialog from './AccountBulkDeleteDialog.vue'

const mocks = vi.hoisted(() => ({ patch: vi.fn(), del: vi.fn(), toast: vi.fn() }))
// The group and proxy pickers look entities up; nothing answers here.
vi.mock('@sub2api/host', async (original) => ({ ...await original<typeof import('@sub2api/host')>(), api: { patch: mocks.patch, del: mocks.del, get: async () => ({ items: [], more: false }) } }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), toast: mocks.toast }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
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
    // A field one selected account's type fixes (common controls) is disabled.
    expect(w.get('[data-testid="bulk-field-auto_disable"] [role="switch"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="bulk-field-auto_disable"]').text()).toContain('1 个所选账号的类型不允许修改此项')
    expect(w.get('[data-testid="bulk-field-weight"] input').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="bulk-edit-apply"]').trigger('click')
    await flushPromises()

    expect(mocks.patch.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ['/accounts/1', { priority: 3 }],
      ['/accounts/2', { priority: 3 }]
    ])
    expect(w.get('[data-testid="bulk-failures"]').text()).toContain('a2')
    expect(w.emitted('saved')![0][0]).toEqual([{ id: 1, priority: 3 }])
    expect(w.emitted('update:open')).toBeUndefined()
    expect(mocks.toast).toHaveBeenCalledWith('成功 1，失败 1，跳过 1', 'warning')
  })

  it('applies the session limit and its period as one field, refusing a period over 24 hours or not a whole number', async () => {
    mocks.patch.mockImplementation(async (path: string, body: object) => ({ id: Number(path.split('/')[2]), ...body }))
    const w = mount(AccountBulkEditDialog, {
      props: { open: true, accounts: [acc(1), acc(2, { spm_limit: 20, spm_window_seconds: 3600 })], typeOf: () => undefined },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    const field = w.get('[data-testid="bulk-field-spm_limit"]')
    expect(field.text()).toContain('会话数限制')
    await field.get('input[data-testid="bulk-spm_limit"]').setValue('20')
    await field.get('select[data-testid="bulk-spm_limit-window-unit"]').setValue('1')
    for (const bad of ['25', '1.5']) {
      await field.get('input[data-testid="bulk-spm_limit-window"]').setValue(bad)
      expect(w.get('[data-testid="bulk-edit-apply"]').attributes('disabled')).toBeDefined()
    }
    await field.get('input[data-testid="bulk-spm_limit-window"]').setValue('1')
    await w.get('[data-testid="bulk-edit-apply"]').trigger('click')
    await flushPromises()
    expect(mocks.patch.mock.calls.map((c) => [c[0], c[1]])).toEqual([['/accounts/1', { spm_limit: 20, spm_window_seconds: 3600 }]])
  })

  it('picking groups or a proxy ticks the field and patches their ids as numbers', async () => {
    mocks.patch.mockImplementation(async (path: string, body: object) => ({ id: Number(path.split('/')[2]), ...body }))
    const w = mount(AccountBulkEditDialog, {
      props: { open: true, accounts: [acc(1), acc(2, { group_ids: [2, 5], proxy_id: 9 })], typeOf: () => undefined },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    const ticked = (k: string) => (w.get(`[data-testid="bulk-field-${k}"] input[type="checkbox"]`).element as HTMLInputElement).checked
    expect([ticked('groups'), ticked('proxy')]).toEqual([false, false])
    w.getComponent(EntityMultiPicker).vm.$emit('update:ids', ['2', '5'])
    w.getComponent(ProxyPicker).getComponent(EntityPicker).vm.$emit('update:id', '9')
    await flushPromises()
    expect([ticked('groups'), ticked('proxy')]).toEqual([true, true])
    expect(w.getComponent(EntityMultiPicker).props('ids')).toEqual(['2', '5'])
    await w.get('[data-testid="bulk-edit-apply"]').trigger('click')
    await flushPromises()
    // The second account has them already.
    expect(mocks.patch.mock.calls.map((c) => [c[0], c[1]])).toEqual([['/accounts/1', { group_ids: [2, 5], proxy_id: 9 }]])
  })

  it('"no proxy" is the ticked field with none picked: ticked alone, or a picked proxy cleared', async () => {
    mocks.patch.mockImplementation(async (path: string, body: object) => ({ id: Number(path.split('/')[2]), ...body }))
    const w = mount(AccountBulkEditDialog, {
      props: { open: true, accounts: [acc(1), acc(2, { proxy_id: 9 })], typeOf: () => undefined },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    // Asked for anew: reopening renders the dialog again.
    const tick = () => w.get<HTMLInputElement>('[data-testid="bulk-field-proxy"] input[type="checkbox"]')
    const picker = () => w.getComponent(ProxyPicker).getComponent(EntityPicker)
    const apply = async () => {
      await w.get('[data-testid="bulk-edit-apply"]').trigger('click')
      await flushPromises()
      return mocks.patch.mock.calls.map((c) => [c[0], c[1]])
    }
    await tick().setValue(true)
    // The first account has no proxy already.
    expect(await apply()).toEqual([['/accounts/2', { proxy_id: null }]])

    mocks.patch.mockClear()
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(tick().element.checked).toBe(false)
    picker().vm.$emit('update:id', '9')
    await flushPromises()
    expect(picker().props('id')).toBe('9')
    picker().vm.$emit('update:id', '')
    await flushPromises()
    expect(tick().element.checked).toBe(true)
    expect(picker().props('id')).toBe('')
    expect(await apply()).toEqual([['/accounts/2', { proxy_id: null }]])
  })

  it('disables every number field a selected type fixes or locks', async () => {
    const types: Record<number, AccountType> = {
      1: { common_controls: { weight: { locked: true, default: 2 } } } as unknown as AccountType,
      2: { common_controls: { rpm_limit: { configurable: false }, priority: { visible: false } } } as unknown as AccountType
    }
    const w = mount(AccountBulkEditDialog, {
      props: { open: true, accounts: [acc(1), acc(2)], typeOf: (a: Account) => types[a.id] },
      global: { plugins: [i18n], stubs: { SModal } }
    })
    const disabled = (k: string) => w.get(`[data-testid="bulk-field-${k}"] input[type="number"]`).attributes('disabled') !== undefined
    expect(['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit', 'spm_limit'].filter(disabled)).toEqual(['weight', 'rpm_limit'])
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
