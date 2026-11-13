import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CCGatewayView from './CCGatewayView.vue'

const auth = vi.hoisted(() => ({ denied: [] as string[] }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (perm: string | string[]) => [perm].flat().some(p => !auth.denied.includes(p)) }) }))
// The page's own parts have their specs; the header and which parts show are under test.
vi.mock('./RemoteSettings.vue', () => ({ default: { template: '<section data-testid="settings"><slot name="accounts" /></section>' } }))
vi.mock('./AccountRuntimes.vue', () => ({ default: { template: '<section data-testid="runtimes" />' } }))

const stubs = {
  SPageHeader: { template: '<header><slot name="actions" /></header>' },
  SButton: { props: ['to'], template: '<a :href="to"><slot /></a>' }
}
const headerLinks = (props: object = {}) =>
  mount(CCGatewayView, { props, global: { plugins: [i18n], stubs } })
    .findAll('header a')
    .map(a => [a.attributes('href'), a.text()])

describe('the CCGateway page header', () => {
  it('links to the plugin for those who may open it', () => {
    i18n.global.locale.value = 'zh'
    auth.denied = []
    expect(headerLinks()).toEqual([['/plugins/ccgateway', '插件详情']])
    auth.denied = ['plugin:read']
    expect(headerLinks()).toEqual([])
  })

  it("is left out inside the plugin's detail page", () => {
    auth.denied = []
    expect(headerLinks({ embedded: true })).toEqual([])
  })
})

describe('the parts of the CCGateway page', () => {
  const parts = () => {
    const w = mount(CCGatewayView, { global: { plugins: [i18n], stubs } })
    return { settings: w.find('[data-testid="settings"]').exists(), runtimes: w.findAll('[data-testid="runtimes"]').length, nested: w.find('[data-testid="settings"] [data-testid="runtimes"]').exists() }
  }

  it('lists the account containers inside the settings for a holder of both', () => {
    auth.denied = []
    expect(parts()).toEqual({ settings: true, runtimes: 1, nested: true })
  })

  it('leaves the containers out without a key of the accounts list', () => {
    auth.denied = ['account:read', 'account:own:read']
    expect(parts()).toEqual({ settings: true, runtimes: 0, nested: false })
  })

  it('shows only the containers to an owner of accounts without settings:read', () => {
    auth.denied = ['settings:read', 'account:read']
    expect(parts()).toEqual({ settings: false, runtimes: 1, nested: false })
  })
})
