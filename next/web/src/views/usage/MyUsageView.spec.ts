import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import MyUsageView from './MyUsageView.vue'

// The two tabs are stubbed down to their revision: what this spec checks is
// which one a refresh reloads and which one's loading drives the header button.
const mocks = vi.hoisted(() => ({ replace: vi.fn(), can: true }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {}, params: {} }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => mocks.can }) }))
vi.mock('./UsageRecords.vue', () => ({ default: { name: 'UsageRecords', props: ['revision', 'listPath', 'summaryPath', 'defaultRange'], emits: ['update:loading'], template: '<div data-testid="records">{{ revision }}</div>' } }))
vi.mock('@/views/ledger/MyLedgerTab.vue', () => ({ default: { name: 'MyLedgerTab', props: ['revision'], emits: ['update:loading'], template: '<div data-testid="ledger">{{ revision }}</div>' } }))
enableAutoUnmount(afterEach)

function render() {
  return mount(MyUsageView, { global: { plugins: [i18n, createPinia()] } })
}
type Wrapper = ReturnType<typeof render>
const revisions = (w: Wrapper) => ({
  records: w.get('[data-testid="records"]').text(),
  ledger: w.find('[data-testid="ledger"]').exists() ? w.get('[data-testid="ledger"]').text() : null
})
/** The header's refresh button (the only button that is not a tab). */
const refreshButton = (w: Wrapper) => w.findAll('button').find((b) => !b.attributes('role'))!
const openTab = async (w: Wrapper, key: 'requests' | 'ledger') => {
  await w.findAll('[role="tab"]').find((b) => b.attributes('data-key') === key)!.trigger('click')
  await flushPromises()
}

describe('Mine > usage records page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can = true
    i18n.global.locale.value = 'zh'
  })

  it('refreshes only the open tab: the hidden request list is not reloaded from the balance tab', async () => {
    const w = render()
    await flushPromises()
    expect(revisions(w)).toEqual({ records: '0', ledger: null })

    await refreshButton(w).trigger('click')
    await flushPromises()
    expect(revisions(w)).toEqual({ records: '1', ledger: null })

    await openTab(w, 'ledger')
    expect(revisions(w)).toEqual({ records: '1', ledger: '0' })
    await refreshButton(w).trigger('click')
    await flushPromises()
    expect(revisions(w)).toEqual({ records: '1', ledger: '1' })
  })

  it('spins the header button from the open tab only', async () => {
    const w = render()
    await flushPromises()
    await w.findComponent({ name: 'UsageRecords' }).vm.$emit('update:loading', true)
    await flushPromises()
    expect(refreshButton(w).attributes('aria-busy')).toBe('true')

    // Back to the balance tab: the hidden list's loading no longer drives the button.
    await openTab(w, 'ledger')
    expect(refreshButton(w).attributes('aria-busy')).toBeUndefined()
    await w.findComponent({ name: 'MyLedgerTab' }).vm.$emit('update:loading', true)
    await flushPromises()
    expect(refreshButton(w).attributes('aria-busy')).toBe('true')
  })

  it('hides the balance tab without balance:self:read', async () => {
    mocks.can = false
    const w = render()
    await flushPromises()
    // A single tab draws no tab bar (STabs), and the page stays on the request list.
    expect(w.find('[role="tablist"]').exists()).toBe(false)
    expect(revisions(w)).toEqual({ records: '0', ledger: null })
  })
})
