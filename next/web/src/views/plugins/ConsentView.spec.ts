import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { SEmpty, SHint, SIcon } from '@sub2api/ui'
import { i18n } from '@/i18n'
import type { PluginReview } from '@/api/types'
import ConsentView from './ConsentView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), can: true }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post }, isApiError: () => false }))
vi.mock('vue-router', () => ({ RouterLink: { template: '<a><slot /></a>' }, useRoute: () => ({ params: { key: 'demo', version: '1.2.0' } }), useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => mocks.can }) }))
vi.mock('./parts/PluginGatewayDecl.vue', () => ({ default: { name: 'PluginGatewayDecl', props: ['platforms', 'accountTypes', 'section'], template: '<div />' } }))
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), fetchFirstPage: async () => [{ key: 'admin', name: { en: 'Admin', zh: '管理员' } }] }))
enableAutoUnmount(afterEach)

const review = (over: Partial<PluginReview> = {}): PluginReview => ({
  plugin_key: 'demo',
  version: '1.2.0',
  name: { en: 'Demo', zh: '示例' },
  publisher: 'acme',
  trust: 'community',
  signature_status: 'valid',
  host_compat_ok: true,
  host_compat: '>=1.0.0',
  capabilities: [],
  gateway_endpoints: [],
  hooks: [],
  jobs: [],
  events: [],
  routes: [],
  menus: [],
  user_permissions: [{ key: 'demo.read', label: { en: 'Read', zh: '读取' } }],
  external_services: [],
  host_permissions: [
    { id: 'http.client', risk: 'high' },
    { id: 'storage.read', risk: 'low' }
  ],
  diff: null,
  ...over
})

function render(r: PluginReview) {
  mocks.get.mockResolvedValue(r)
  return mountView()
}

// A missing import of a @sub2api/ui component is only a runtime warning: Vue
// renders an unknown element and everything that component drew disappears.
// Turning that warning into a failure is what guards the page structure.
function mountView() {
  return mount(ConsentView, {
    global: {
      plugins: [i18n, createPinia()],
      stubs: { teleport: true },
      config: {
        warnHandler: (msg) => {
          if (msg.includes('Failed to resolve component')) throw new Error(msg)
        }
      }
    }
  })
}

describe('plugin consent page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can = true
    i18n.global.locale.value = 'zh'
    mocks.post.mockResolvedValue({})
  })

  it('sends the ticked permissions as grants, the rest as denied, with the roles for new permissions', async () => {
    const w = render(review())
    await flushPromises()
    // Low risk is granted automatically (no checkbox); the high-risk one starts
    // unticked and has to be ticked. The provides card comes first, so its admin
    // role checkbox (already ticked) is the first one in the DOM.
    const boxes = w.findAll('input[type="checkbox"]')
    expect(boxes.length).toBe(2)
    await boxes[1].setValue(true)
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/plugins/demo/versions/1.2.0/consent', {
      grants: [{ permission: 'http.client' }, { permission: 'storage.read' }],
      denied: [],
      role_keys_for_new_permissions: ['admin']
    })
    expect(mocks.push).toHaveBeenCalledWith({ path: '/plugins/demo', query: { consented: '1.2.0' } })
  })

  it('keeps a scope on the grant it belongs to', async () => {
    const w = render(review({ host_permissions: [{ id: 'storage.read', risk: 'low', scope: { domains: ['a.example'] } } as never] }))
    await flushPromises()
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1].grants).toEqual([{ permission: 'storage.read', scope: { domains: ['a.example'] } }])
  })

  it('blocks approval when a permission needs a right the caller lacks', async () => {
    mocks.can = false
    const w = render(review({ host_permissions: [{ id: 'db.core_views', risk: 'critical', requires: 'plugin:grant:critical' }] }))
    await flushPromises()
    expect((w.get('[data-testid="consent-approve"]').element as HTMLButtonElement).disabled).toBe(true)
    expect(w.text()).toContain('db.core_views')
  })

  it('asks for the missing required permissions instead of submitting', async () => {
    const w = render(review({ host_permissions: [{ id: 'http.client', risk: 'high' }] }))
    await flushPromises()
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('keeps the page structure: icons and hints render after a split into child components', async () => {
    const w = render(review())
    await flushPromises()
    // Resolved components (not unknown elements): the back arrow and the publisher hint.
    expect(w.findComponent(SIcon).exists()).toBe(true)
    expect(w.findComponent(SHint).exists()).toBe(true)
    expect(w.find('svg').exists()).toBe(true)
    expect(w.text()).toContain(i18n.global.t('plugins.publisher'))
  })

  it('shows the empty state when the review cannot be loaded', async () => {
    mocks.get.mockRejectedValue(new Error('not found'))
    const w = mountView()
    await flushPromises()
    expect(w.findComponent(SEmpty).exists()).toBe(true)
    expect(w.text()).toContain(i18n.global.t('plugins.consent.notFound'))
  })
})
