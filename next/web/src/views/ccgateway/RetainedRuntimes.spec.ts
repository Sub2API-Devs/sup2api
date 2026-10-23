import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RetainedRuntimes from './RetainedRuntimes.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), confirm: vi.fn(), manage: true }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...await importOriginal<typeof import('@sub2api/host')>(), api: { get: mocks.get, post: mocks.post } }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<object>(), confirm: (...a: unknown[]) => mocks.confirm(...a), toast: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (p: string) => p !== 'settings:manage' || mocks.manage }) }))

const kept = { key: '30', account_id: 30, account_name: 'ccg-audit-kept', account_type: 'managed', deleted_at: '2026-10-24T01:00:00Z', purge_after: '2026-10-27T01:00:00Z', due: false }
const render = async () => {
  const wrapper = mount(RetainedRuntimes, { global: { plugins: [i18n] } })
  await flushPromises()
  return wrapper
}

describe('runtimes kept after account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.get.mockResolvedValue({ runtimes: [kept] })
    mocks.post.mockResolvedValue({ accepted: true })
    mocks.confirm.mockResolvedValue(true)
    i18n.global.locale.value = 'zh'
  })
  it('shows nothing when no runtime is kept', async () => {
    mocks.get.mockResolvedValue({ runtimes: [] })
    const wrapper = await render()
    expect(mocks.get).toHaveBeenCalledWith('/system/ccgateway/runtimes/retained')
    expect(wrapper.find('[data-testid="ccgateway-retained"]').exists()).toBe(false)
  })
  it('lists a kept runtime and removes it after confirmation', async () => {
    const wrapper = await render()
    expect(wrapper.text()).toContain('ccg-audit-kept')
    expect(wrapper.text()).toContain('#30')
    mocks.get.mockResolvedValue({ runtimes: [] })
    await wrapper.get('[data-testid="ccgateway-retained-purge-30"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtimes/30/purge')
    expect(wrapper.find('[data-testid="ccgateway-retained"]').exists()).toBe(false)
  })
  it('a declined confirmation removes nothing', async () => {
    mocks.confirm.mockResolvedValue(false)
    const wrapper = await render()
    await wrapper.get('[data-testid="ccgateway-retained-purge-30"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
  })
  it('a due removal is retried without asking again', async () => {
    mocks.get.mockResolvedValue({ runtimes: [{ ...kept, due: true }] })
    const wrapper = await render()
    expect(wrapper.text()).toContain('清理中')
    const retry = wrapper.get('[data-testid="ccgateway-retained-purge-30"]')
    expect(retry.text()).toBe('重试清理')
    await retry.trigger('click')
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtimes/30/purge')
  })
  it('read-only users see the list without the remove action', async () => {
    mocks.manage = false
    const wrapper = await render()
    expect(wrapper.text()).toContain('ccg-audit-kept')
    expect(wrapper.find('[data-testid="ccgateway-retained-purge-30"]').exists()).toBe(false)
  })
})
