import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { accountTypesOf } from '../pluginUtil'
import PluginGatewayDecl from './PluginGatewayDecl.vue'

vi.mock('@/composables/platforms', () => ({
  usePlatforms: () => ({
    load: vi.fn().mockResolvedValue(undefined),
    find: (id: string) =>
      id === 'anthropic'
        ? {
            id,
            label: 'Anthropic',
            endpoints: [
              { id: 'messages', method: 'POST', path: '/v1/messages', protocol: 'anthropic.messages', billing: 'usage' },
              { id: 'count_tokens', method: 'POST', path: '/v1/messages/count_tokens', protocol: 'anthropic.count_tokens', billing: 'free' }
            ]
          }
        : undefined
  })
}))
enableAutoUnmount(afterEach)

describe('plugin account platform hierarchy', () => {
  it('shows only declared endpoints underneath their platform', () => {
    const wrapper = mount(PluginGatewayDecl, {
      props: {
        platforms: [],
        accountTypes: accountTypesOf({
          accountTypes: [{ id: 'managed', label: 'Claude Code', platforms: [{ platform: 'anthropic', endpoints: ['messages'] }] }]
        })
      },
      global: { plugins: [i18n] }
    })
    const account = wrapper.get('[data-testid="plugin-account-type"]')
    expect(account.text()).toContain('Claude Code')
    const platform = account.get('[data-testid="plugin-account-platform"]')
    expect(platform.text()).toContain('Anthropic')
    expect(platform.get('[data-testid="plugin-account-endpoint"]').text()).toContain('POST /v1/messages')
    expect(platform.text()).not.toContain('count_tokens')
  })
  it('does not expand an unresolved endpoint ID into all platform endpoints', () => {
    const wrapper = mount(PluginGatewayDecl, {
      props: {
        platforms: [],
        accountTypes: accountTypesOf({ accountTypes: [{ id: 'key', platforms: [{ platform: 'anthropic', endpoints: ['unknown'] }] }] })
      },
      global: { plugins: [i18n] }
    })
    expect(wrapper.findAll('[data-testid="plugin-account-endpoint"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('unknown')
  })
})
