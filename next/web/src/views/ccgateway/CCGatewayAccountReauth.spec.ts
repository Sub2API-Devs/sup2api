import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import Reauth from './CCGatewayAccountReauth.vue'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), cancel: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<object>(), toast: vi.fn() }))
const key = '22'
const Flow = { name: 'CCGatewayAccountAuth', props: ['reauthAccountId', 'reauthKey'], template: '<div />', emits: ['state', 'authorized'], methods: { cancelAuthorization: () => mocks.cancel() } }

describe('in-place account authorization', () => {
 beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  mocks.get.mockImplementation(async (url: string) => url.endsWith('/health') ? { healthy: true, logged_in: true } : { status: 'ready', key, current_image: 'old', target_image: 'new' })
  mocks.post.mockImplementation(async (url: string) => url.endsWith('/commit') ? { id: 22 } : { key, in_place: true })
 })
 const render = () => mount(Reauth, { props: { accountId: 22, canEdit: true }, global: { plugins: [i18n], stubs: { CCGatewayAccountAuth: Flow } } })
 it('uses the existing account and commits after a completed authorization', async () => {
  const w = render(); await flushPromises()
  expect(mocks.post).not.toHaveBeenCalled()
  await w.get('[data-testid="ccgateway-reauth-start"]').trigger('click'); await flushPromises()
  expect(mocks.post.mock.calls[0][1]).toEqual({ authorization_mode: 'fresh' })
  expect(w.findComponent(Flow).props('reauthAccountId')).toBe(22)
  w.findComponent(Flow).vm.$emit('state', { key, authorized: false }); await flushPromises()
  expect(mocks.post).toHaveBeenCalledTimes(1)
  w.findComponent(Flow).vm.$emit('state', { key, authorized: true })
  w.findComponent(Flow).vm.$emit('authorized'); await flushPromises()
  expect(mocks.post.mock.calls[1][0]).toBe('/system/ccgateway/accounts/22/reauthorize/22/commit')
  expect(w.emitted('reauthorized')).toHaveLength(1)
  w.unmount(); expect(mocks.del).not.toHaveBeenCalled()
 })
 it('cancels only the login session and never deletes the runtime', async () => {
  const w=render(); await flushPromises()
  await w.get('[data-testid="ccgateway-reauth-start"]').trigger('click'); await flushPromises()
  await w.get('[data-testid="ccgateway-reauth-cancel"]').trigger('click'); await flushPromises()
  expect(mocks.cancel).toHaveBeenCalledTimes(1)
  expect(mocks.del).not.toHaveBeenCalled()
  expect(mocks.post).toHaveBeenCalledTimes(1)
  w.unmount()
 })
 it('does not resume an old replacement draft as the current runtime', async () => {
  sessionStorage.setItem('sub2api.ccgReauth.22','d0123456789abcdef')
  const w=render(); await flushPromises()
  expect(w.findComponent(Flow).exists()).toBe(false)
  expect(mocks.get.mock.calls.every(([url]) => !url.includes('/drafts/'))).toBe(true)
  w.unmount();expect(mocks.del).not.toHaveBeenCalled()
 })
})
