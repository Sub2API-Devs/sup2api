import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'

const mocks = vi.hoisted(() => ({ preflight: {} as object }))
vi.mock('@sub2api/host', async (original) => ({
  ...(await original<object>()),
  api: {
    get: vi.fn(async (path: string) => (path === '/system/releases' ? { releases: [{ digest: 'sha256:a', manifest: { release_id: 'r1', build_id: 'b', source_commit: 'c', created_at: '' } }] } : { upgrades: [], nodes: [], revision: 3, primary_node: 'n1' })),
    post: vi.fn(async () => mocks.preflight)
  }
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { release: 'sha256:a' } }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('../nodes/TopologyGraph.vue', () => ({ default: { template: '<div />' } }))
enableAutoUnmount(afterEach)

import UpgradesView from './UpgradesView.vue'

describe('UpgradesView preflight (T45 follow-up)', () => {
  it('shows the warnings of a preflight that passes', async () => {
    mocks.preflight = { release_digest: 'sha256:a', expected_revision: 3, primary_node: 'n1', nodes: ['n1'], blockers: [], strategy: 'serial', warnings: ['tokenless management is enabled; clear it once every core sends the token'] }
    const w = mount(UpgradesView, { global: { plugins: [i18n], stubs: { teleport: true } } })
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === i18n.global.t('upgrades.preflight'))!.trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="upgrade-warnings"]').text()).toContain('tokenless management is enabled')
    // Warnings do not block: the plan can be started.
    const start = w.findAll('button').find((b) => b.text() === i18n.global.t('upgrades.start'))!
    expect((start.element as HTMLButtonElement).disabled).toBe(false)
  })
})
