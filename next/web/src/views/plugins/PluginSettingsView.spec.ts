import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { i18n } from '@/i18n'
import PluginSettingsView from './PluginSettingsView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), route: null as unknown as { params: { key: string } } }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get } }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ plugin: () => null }) }))
vi.mock('./detail/SettingsTab.vue', () => ({ default: { name: 'SettingsTab', props: ['pluginKey', 'settings'], template: '<div data-testid="tab">{{ pluginKey }}:{{ settings.values.who }}</div>' } }))
enableAutoUnmount(afterEach)

const settingsOf = (who: string) => ({ schema: { type: 'object' }, values: { who } })

describe('PluginSettingsView', () => {
  it('ignores a late answer for the plugin it left', async () => {
    mocks.route = reactive({ params: { key: 'alpha' } })
    const answers: Record<string, (v: unknown) => void> = {}
    mocks.get.mockImplementation((path: string) => new Promise((resolve) => (answers[path] = resolve)))
    const w = mount(PluginSettingsView, { global: { plugins: [i18n], stubs: { SPageHeader: true } } })
    await flushPromises()
    mocks.route.params.key = 'beta'
    await flushPromises()
    answers['/plugins/beta/settings'](settingsOf('beta'))
    await flushPromises()
    expect(w.get('[data-testid="tab"]').text()).toBe('beta:beta')
    answers['/plugins/alpha/settings'](settingsOf('alpha'))
    await flushPromises()
    expect(w.get('[data-testid="tab"]').text()).toBe('beta:beta')
  })
})
