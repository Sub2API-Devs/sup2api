import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { SEmpty, SHint, SIcon } from '@sub2api/ui'
import { i18n } from '@/i18n'
import type { PluginReview } from '@/api/types'
import ConsentView from './ConsentView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), can: true, lacks: new Set<string>(), superuser: true, epoch: 0, managed: [] as object[] }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post }, isApiError: () => false }))
vi.mock('vue-router', () => ({ RouterLink: { template: '<a><slot /></a>' }, useRoute: () => ({ params: { key: 'demo', version: '1.2.0' } }), useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => {
    const has = (k: string | string[]) => mocks.can && ![k].flat().some((x) => mocks.lacks.has(x))
    return {
      has,
      hasDynamic: has,
      me: { id: 1, roles: ['lead'], superuser: mocks.superuser },
      permissionsEpoch: mocks.epoch
    }
  }
}))
vi.mock('./parts/PluginGatewayDecl.vue', () => ({ default: { name: 'PluginGatewayDecl', props: ['platforms', 'accountTypes', 'section'], template: '<div />' } }))
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
  mocks.get.mockImplementation(async (path: string) => (path === '/me/assignable-roles' ? mocks.managed : r))
  return mountView()
}
const managed = (key: string, name: string, builtin: boolean) => ({ key, name: { en: name, zh: name }, builtin, grantable: true })

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
    mocks.lacks = new Set()
    mocks.superuser = true
    mocks.epoch++
    mocks.managed = [managed('admin', '管理员', true), managed('lead', 'Lead', false), managed('auditor', 'Auditor', false)]
    i18n.global.locale.value = 'zh'
    mocks.post.mockResolvedValue({})
  })

  const perm = (key: string, over: object = {}) => ({ key, label: { en: key, zh: key }, new: true, default_roles: ['admin'], ...over })
  const roleBox = (w: ReturnType<typeof render>, permKey: string, role: string) => w.get(`[data-permission="${permKey}"] input[data-role="${role}"]`)

  it('sends the ticked permissions as grants and roles only for the new permissions whose roles changed', async () => {
    const w = render(review({ user_permissions: [perm('demo.read'), perm('demo.write'), perm('demo.old', { new: false })] }))
    await flushPromises()
    // Each new permission starts at its manifest default roles.
    expect(w.text()).toContain('默认授予：管理员')
    expect((roleBox(w, 'demo.read', 'admin').element as HTMLInputElement).checked).toBe(true)
    expect(w.find('[data-permission="demo.old"] [data-testid="permission-roles"]').exists()).toBe(false)
    await roleBox(w, 'demo.write', 'auditor').setValue(true)
    await w.get('[data-testid="host-permissions"] input[type="checkbox"]').setValue(true)
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/plugins/demo/versions/1.2.0/consent', {
      grants: [{ permission: 'http.client' }, { permission: 'storage.read' }],
      denied: [],
      new_permission_roles: { 'demo.write': ['admin', 'auditor'] }
    })
    expect(mocks.push).toHaveBeenCalledWith({ path: '/plugins/demo', query: { consented: '1.2.0' } })
  })

  it('unticking every default sends an empty list; ticking back to the defaults sends nothing', async () => {
    const w = render(review({ user_permissions: [perm('demo.read'), perm('demo.write')], host_permissions: [{ id: 'storage.read', risk: 'low' }] }))
    await flushPromises()
    await roleBox(w, 'demo.read', 'admin').setValue(false)
    await roleBox(w, 'demo.write', 'lead').setValue(true)
    await roleBox(w, 'demo.write', 'lead').setValue(false)
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1].new_permission_roles).toEqual({ 'demo.read': [] })
  })

  it('leaves the default grants of a permission given other roles out of the grant list', async () => {
    const grants = [
      { permission: 'plugin.demo:demo.read', role: 'admin', sensitive: false, via: 'default', needs_consent: false },
      { permission: 'plugin.demo:demo.write', role: 'admin', sensitive: false, via: 'default', needs_consent: false }
    ]
    const w = render(review({ user_permissions: [perm('demo.read'), perm('demo.write')], new_role_grants: grants as never }))
    await flushPromises()
    expect(w.findAll('[data-testid="new-role-grants"] li')).toHaveLength(2)
    await roleBox(w, 'demo.read', 'lead').setValue(true)
    expect(w.findAll('[data-testid="new-role-grants"] li')).toHaveLength(1)
  })

  it('offers no role choice without role:define: the manifest defaults apply', async () => {
    mocks.lacks = new Set(['role:define'])
    const w = render(review({ user_permissions: [perm('demo.read')], host_permissions: [{ id: 'storage.read', risk: 'low' }] }))
    await flushPromises()
    expect(w.find('[data-testid="permission-roles"]').exists()).toBe(false)
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1].new_permission_roles).toEqual({})
  })

  it('a non-super admin names only custom roles it manages and does not hold', async () => {
    mocks.superuser = false
    const w = render(review({ user_permissions: [perm('demo.read')], host_permissions: [{ id: 'storage.read', risk: 'low' }] }))
    await flushPromises()
    const roles = w.findAll('[data-permission="demo.read"] input[data-role]').map((b) => b.attributes('data-role'))
    expect(roles).toEqual(['auditor'])
    await roleBox(w, 'demo.read', 'auditor').setValue(true)
    // The built-in default cannot be named by this caller: it drops out.
    expect(w.text()).toContain(i18n.global.t('plugins.consent.replacesDefaults'))
    await w.get('[data-testid="consent-approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[0][1].new_permission_roles).toEqual({ 'demo.read': ['auditor'] })
  })

  it('tells beforehand when db.schema needs the unconfined override the caller lacks', async () => {
    mocks.lacks = new Set(['plugin:grant:db_schema_unconfined'])
    const hp = [{ id: 'db.schema', risk: 'critical' }] as never
    const w = render(review({ host_permissions: hp, needs_db_schema_unconfined: true }))
    await flushPromises()
    expect((w.get('[data-testid="consent-approve"]').element as HTMLButtonElement).disabled).toBe(true)
    expect(w.text()).toContain('plugin:grant:db_schema_unconfined')
    const ok = render(review({ host_permissions: hp, needs_db_schema_unconfined: false }))
    await flushPromises()
    expect((ok.get('[data-testid="consent-approve"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('lists the role grants of the new permissions, marking those that need confirmation', async () => {
    const grants = [
      { permission: 'plugin.demo:demo.read', role: 'admin', sensitive: false, via: 'default', needs_consent: false },
      { permission: 'plugin.demo:demo.read', role: 'lead', sensitive: true, via: 'inherit', needs_consent: true }
    ]
    const w = render(review({ new_role_grants: grants as never, role_grants_need_consent: true }))
    await flushPromises()
    expect(w.findAll('[data-testid="new-role-grants"] li')).toHaveLength(2)
    expect(w.findAll('[data-needs-consent]')).toHaveLength(1)
    expect(w.find('[data-testid="role-grants-need-consent"]').exists()).toBe(true)
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
