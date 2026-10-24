import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Account } from '@/api/types'
import AccountDeleteDialog from './AccountDeleteDialog.vue'

const mocks = vi.hoisted(() => ({ del: vi.fn() }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...await importOriginal<typeof import('@sub2api/host')>(), api: mocks }))

enableAutoUnmount(afterEach)
const account = { id: 7, name: 'cc-7' } as Account

function render(retentionDays: number) {
  return mount(AccountDeleteDialog, { props: { open: true, account, retentionDays }, global: { plugins: [i18n], stubs: { Teleport: true } } })
}

describe('account deletion', () => {
  beforeEach(() => {
    mocks.del.mockReset().mockResolvedValue({})
    i18n.global.locale.value = 'zh'
  })
  it('a type without retention deletes at once and offers no choice', async () => {
    const wrapper = render(0)
    expect(wrapper.find('[data-testid="account-delete-resources"]').exists()).toBe(false)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7', undefined)
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })
  it('deleting now is the default for a retaining type', async () => {
    const wrapper = render(3)
    expect(wrapper.text()).toContain('保留 3 天后自动清理')
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7', undefined)
  })
  it('keeping the resources asks the core to retain them', async () => {
    const wrapper = render(3)
    const radios = wrapper.findAll('[data-testid="account-delete-resources"] input[type="radio"]')
    await radios[1].setValue(true)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith('/accounts/7', { retain_resources: 1 })
  })
  it('the wording names no plugin and describes the dialog', async () => {
    const wrapper = render(3)
    const dialog = wrapper.get('[role="dialog"]')
    const ids = dialog.attributes('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(wrapper.find(`[id="${id}"]`).exists()).toBe(true)
    await wrapper.findAll('[data-testid="account-delete-resources"] input[type="radio"]')[1].setValue(true)
    expect(wrapper.text()).toContain('保留 3 天后自动清理')
    expect(wrapper.text()).not.toMatch(/CCGateway|容器|数据卷/)
  })
  it('cannot be closed while the request runs', async () => {
    let finish: (v: unknown) => void = () => {}
    mocks.del.mockReturnValue(new Promise(resolve => (finish = resolve)))
    const wrapper = render(0)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    expect(wrapper.find('[data-overlay-close]').exists()).toBe(false)
    await wrapper.get('.modal-overlay').trigger('mousedown')
    expect(wrapper.emitted('update:open')).toBeUndefined()
    finish({})
    await flushPromises()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('deleted')).toHaveLength(1)
  })
  it('a failed deletion keeps the dialog open', async () => {
    mocks.del.mockRejectedValue(new Error('unavailable'))
    const wrapper = render(0)
    await wrapper.get('[data-testid="account-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
