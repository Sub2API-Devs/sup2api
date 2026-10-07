import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import Reauth from './CCGatewayAccountReauth.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<object>(), confirm: async () => true, toast: vi.fn() }))
const key = 'd0123456789abcdef'
const Flow = { name: 'CCGatewayAccountAuth', template: '<div />', emits: ['state', 'authorized'] }

describe('manual account replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.get.mockImplementation(async (url: string) => url.endsWith('/health') ? { healthy: true, logged_in: true } : { status: 'ready', current_image: 'old', target_image: 'new', image_update_available: true })
    mocks.post.mockResolvedValue({ key })
    mocks.del.mockResolvedValue({})
  })

  it('prepares migration but never switches merely because login succeeds', async () => {
    const w = mount(Reauth, { props: { accountId: 22, canEdit: true }, global: { plugins: [i18n], stubs: { CCGatewayAccountAuth: Flow } } })
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
    await w.get('[data-testid="ccgateway-reauth-start"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1]).toEqual({ authorization_mode: 'migrate' })
    w.findComponent(Flow).vm.$emit('state', { key, authorized: true })
    w.findComponent(Flow).vm.$emit('authorized')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    await w.get('[data-testid="ccgateway-replace-commit"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[1][0]).toBe(`/system/ccgateway/accounts/22/reauthorize/${key}/commit`)
    w.unmount()
  })

  it('supports fresh authorization and cancellation without touching the old account', async () => {
    const w = mount(Reauth, { props: { accountId: 22, canEdit: true }, global: { plugins: [i18n], stubs: { CCGatewayAccountAuth: Flow } } })
    await flushPromises()
    await w.get('input[value="fresh"]').setValue(true)
    await w.get('[data-testid="ccgateway-reauth-start"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1]).toEqual({ authorization_mode: 'fresh' })
    await w.get('[data-testid="ccgateway-reauth-cancel"]').trigger('click')
    await flushPromises()
    expect(mocks.del).toHaveBeenCalledWith(`/system/ccgateway/drafts/${key}`)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    w.unmount()
  })
})
