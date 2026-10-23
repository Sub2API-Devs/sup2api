import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Account, AccountType } from '@/api/types'
import AccountDeleteDialog from './AccountDeleteDialog.vue'

const mocks = vi.hoisted(() => ({ del: vi.fn() }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...await importOriginal<typeof import('@sub2api/host')>(), api: mocks }))

enableAutoUnmount(afterEach)
const account = { id: 7, name: 'cc-7' } as Account
const plain = { plugin_key: 'anthropic', type: 'apikey' } as unknown as AccountType
const retaining = { plugin_key: 'ccgateway', type: 'managed', lifecycle: { deletion: { retentionDays: 3 } } } as unknown as AccountType

function render(accountType: AccountType) {
  return mount(AccountDeleteDialog, { props: { open: true, account, accountType }, global: { plugins: [i18n], stubs: { Teleport: true } } })
}

describe('account deletion', () => {
  beforeEach(() => {
    mocks.del.mockReset().mockResolvedValue({})
    i18n.global.locale.value = 'zh'
  })
  it('a type without retention deletes at once and offers no choice', async () => {
    const wrapper = render(plain)
    expect(wrapper.find('[data-testid="account-delete-resources"]').exists()).toBe(false)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })
  it('deleting now is the default for a retaining type', async () => {
    const wrapper = render(retaining)
    expect(wrapper.text()).toContain('保留 3 天后自动清理')
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7')
  })
  it('keeping the resources asks the core to retain them', async () => {
    const wrapper = render(retaining)
    const radios = wrapper.findAll('[data-testid="account-delete-resources"] input[type="radio"]')
    await radios[1].setValue(true)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7?retain_resources=1')
  })
  it('a failed deletion keeps the dialog open', async () => {
    mocks.del.mockRejectedValue(new Error('unavailable'))
    const wrapper = render(plain)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
