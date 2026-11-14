import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import JobsTab from './JobsTab.vue'
import type { PluginDetail, PluginJob } from '../pluginUtil'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), denied: new Set<string>() }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...await importOriginal<typeof import('@sub2api/host')>(), api: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !mocks.denied.has(key) }) }))

const jobs: PluginJob[] = [
  { id: 'purge', title: { en: 'Purge', zh: '清理' }, scope: 'cluster', task: 'plugin.demo.purge', schedule: '0 3 * * *', timeout_sec: 7200,
    effective_schedule: '0 3 * * *', effective_timeout_sec: 3600, adjusted: ['timeout 2h0m0s cut to 1h0m0s'] },
  { id: 'warm', scope: 'node', task: 'plugin.demo.warm', schedule: '@every 30s', timeout_sec: 0, effective_schedule: '@every 30s', effective_timeout_sec: 60 }
]

async function render() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }, { path: '/system/tasks', component: { template: '<div />' } }] })
  await router.push('/')
  const wrapper = mount(JobsTab, { props: { detail: { key: 'demo', jobs } as unknown as PluginDetail }, global: { plugins: [i18n, router] } })
  await flushPromises()
  return wrapper
}

describe('plugin jobs tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.denied.clear()
    i18n.global.locale.value = 'zh'
    mocks.get.mockResolvedValue({ jobs, recent_runs: [] })
  })

  it('shows the timeout the core runs and marks one cut to the limits', async () => {
    const wrapper = await render()
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('清理')
    expect(rows[0].text()).toContain('全集群一次')
    expect(rows[0].get('[data-testid="job-adjusted"]').attributes('title')).toContain('cut to 1h0m0s')
    expect(rows[1].text()).toContain('每个节点')
    expect(rows[1].find('[data-testid="job-adjusted"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers the manual run to task:run, not to plugin:manage', async () => {
    mocks.denied.add('task:run')
    let wrapper = await render()
    expect(wrapper.text()).not.toContain(i18n.global.t('plugins.jobs.runNow'))
    wrapper.unmount()

    mocks.denied.clear()
    mocks.denied.add('plugin:manage')
    wrapper = await render()
    expect(wrapper.findAll('tbody tr')[0].text()).toContain(i18n.global.t('plugins.jobs.runNow'))
    wrapper.unmount()
  })
})
