import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { i18n } from '@/i18n'
import UsageRecords from './UsageRecords.vue'

// Data sources are stubbed: what this spec checks is that the trend / IP
// panels the user opened or closed stay that way after a reload.
vi.mock('@/composables/useList', () => ({
  useList: (_path: string, init: Record<string, unknown>) => ({
    items: ref([]), loading: ref(false), page: ref(1), pageSize: ref(20), total: ref(0), filters: reactive({ ...init }), reload: vi.fn()
  })
}))
vi.mock('./useUsageSummary', () => ({ useUsageSummary: () => ({ rows: ref([]), loading: ref(false), reload: vi.fn() }) }))
vi.mock('./UsageTable.vue', () => ({ default: { name: 'UsageTable', template: '<div />' } }))
vi.mock('./UsageIPPanel.vue', () => ({ default: { name: 'UsageIPPanel', template: '<div data-testid="ip-panel" />' } }))
enableAutoUnmount(afterEach)

function render(admin = false) {
  return mount(UsageRecords, {
    props: { listPath: '/me/usage', summaryPath: '/me/usage/summary', defaultRange: '7d', admin },
    global: { plugins: [i18n], stubs: { SChart: true } }
  })
}
type Wrapper = ReturnType<typeof render>
const ipPanel = (w: Wrapper) => w.find('[data-testid="ip-panel"]').exists()
const trend = (w: Wrapper) => w.findComponent({ name: 'SChart' }).exists()

describe('usage records panels', () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'zh'
  })

  it('opens the IP panel and closes the trend by default', async () => {
    const w = render()
    await flushPromises()
    expect([ipPanel(w), trend(w)]).toEqual([true, false])
  })

  it('remembers closing the IP panel and opening the trend across a reload', async () => {
    const w = render()
    await w.get('[data-testid="toggle-usage-ips"] button').trigger('click')
    await w.get('[data-testid="toggle-usage-trend"] button').trigger('click')
    await flushPromises()
    expect([ipPanel(w), trend(w)]).toEqual([false, true])
    w.unmount()

    const again = render()
    await flushPromises()
    expect([ipPanel(again), trend(again)]).toEqual([false, true])
  })

  it('keeps the admin page and the personal page apart, and ignores a broken value', async () => {
    const w = render()
    await w.get('[data-testid="toggle-usage-ips"] button').trigger('click')
    await flushPromises()
    w.unmount()
    const admin = render(true)
    await flushPromises()
    expect(ipPanel(admin)).toBe(true)
    admin.unmount()

    localStorage.setItem('s2a.my-usage-log.panels', '{not json')
    const broken = render()
    await flushPromises()
    expect([ipPanel(broken), trend(broken)]).toEqual([true, false])
  })
})
