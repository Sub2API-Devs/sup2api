import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import type { CcgRuntimeHealth } from '@/api/types'
import Auth from './CCGatewayAccountAuth.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/composables/lookups', () => ({ useProxiesLookup: () => ({ proxies: ref([]) }) }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<object>(), toast: vi.fn() }))

describe('independent local credential flow regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })

  it.each([
    { healthy: true, logged_in: false, status_source: 'local_snapshot', credential_present: false, credential_source_unresolved: true },
    { healthy: true, logged_in: false, status_source: 'local_snapshot', credential_present: false, access_token_expired: true },
    { healthy: true, logged_in: true, status_source: 'local_snapshot', credential_present: true, access_token_expired: true },
  ] satisfies CcgRuntimeHealth[])('does not request a login link on actual component mount: %j', async (health) => {
    mocks.get.mockImplementation(async (url: string) => url.endsWith('/health') ? health : url.endsWith('/session') ? null : { status: 'ready' })
    const wrapper = mount(Auth, { props: { reauthKey: 'd0123456789abcdef', canEdit: true }, global: { plugins: [i18n] } })
    try {
      await flushPromises()
      expect(mocks.get).toHaveBeenCalledWith('/system/ccgateway/drafts/d0123456789abcdef/health')
      expect(mocks.post).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain(health.credential_present ? '在线有效性以实际请求为准' : '未进行在线验证')
    } finally {
      wrapper.unmount()
    }
  })

  it('retains automatic login link creation for a legacy explicitly logged-out draft', async () => {
    mocks.get.mockImplementation(async (url: string) => url.endsWith('/health') ? { healthy: true, logged_in: false } : url.endsWith('/session') ? null : { status: 'ready' })
    mocks.post.mockResolvedValue({})
    const wrapper = mount(Auth, { props: { reauthKey: 'd0123456789abcdef', canEdit: true }, global: { plugins: [i18n] } })
    try {
      await flushPromises()
      expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/start'))).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })
})
