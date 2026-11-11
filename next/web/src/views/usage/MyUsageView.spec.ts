import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import MyUsageView from './MyUsageView.vue'

// The records and the ledger are stubbed down to their revision: what this
// spec checks is which one a refresh reloads and which one's loading drives
// the refresh button (rendered into the records' #actions slot). The log type
// lives in UsageRecords, which reports the chosen one (update:tab) and renders
// the ledger from its #tab-ledger slot, with its filters in the search bar.
const mocks = vi.hoisted(() => ({ can: true }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => mocks.can }) }))
vi.mock('./UsageRecords.vue', () => ({
  default: {
    name: 'UsageRecords',
    props: ['revision', 'listPath', 'summaryPath', 'extraTabs'],
    emits: ['update:loading', 'update:tab'],
    template: '<div><slot name="actions" /><slot name="tab-ledger-range" /><slot name="tab-ledger-filters" /><div data-testid="records">{{ revision }}</div><span data-testid="extra">{{ extraTabs.map((x) => x.key).join() }}</span><slot name="tab-ledger" /></div>'
  }
}))
vi.mock('@/views/ledger/MyLedgerTab.vue', () => ({ default: { name: 'MyLedgerTab', props: ['revision', 'filters'], emits: ['update:loading'], template: '<div data-testid="ledger">{{ revision }}</div>' } }))
enableAutoUnmount(afterEach)

function render() {
  return mount(MyUsageView, { global: { plugins: [i18n, createPinia()] } })
}
type Wrapper = ReturnType<typeof render>
const revisions = (w: Wrapper) => ({ records: w.get('[data-testid="records"]').text(), ledger: w.get('[data-testid="ledger"]').text() })
const refreshButton = (w: Wrapper) => w.get('button')
const openTab = async (w: Wrapper, key: string) => {
  w.findComponent({ name: 'UsageRecords' }).vm.$emit('update:tab', key)
  await flushPromises()
}

describe('Mine > usage records page', () => {
  beforeEach(() => {
    mocks.can = true
    i18n.global.locale.value = 'zh'
  })

  it('refreshes only the open tab: the request list is not reloaded from the balance tab', async () => {
    const w = render()
    await flushPromises()
    await refreshButton(w).trigger('click')
    await flushPromises()
    expect(revisions(w)).toEqual({ records: '1', ledger: '0' })

    await openTab(w, 'ledger')
    await refreshButton(w).trigger('click')
    await flushPromises()
    expect(revisions(w)).toEqual({ records: '1', ledger: '1' })
  })

  it('spins the refresh button from the open tab only', async () => {
    const w = render()
    await flushPromises()
    w.findComponent({ name: 'UsageRecords' }).vm.$emit('update:loading', true)
    await flushPromises()
    expect(refreshButton(w).attributes('aria-busy')).toBe('true')

    await openTab(w, 'ledger')
    expect(refreshButton(w).attributes('aria-busy')).toBeUndefined()
    w.findComponent({ name: 'MyLedgerTab' }).vm.$emit('update:loading', true)
    await flushPromises()
    expect(refreshButton(w).attributes('aria-busy')).toBe('true')
  })

  it('filters the balance changes by the kind and the month from the search bar', async () => {
    const w = render()
    await flushPromises()
    const ledger = w.findComponent({ name: 'MyLedgerTab' })
    expect(ledger.props('filters')).toMatchObject({ kind: '' })
    expect(ledger.props('filters').from).toBeTruthy()
    const kind = w.get('[data-testid="filter-ledger-kind"]')
    expect(kind.findAll('option')[0].text()).toBe('类型')
    await kind.setValue('1')
    await flushPromises()
    expect(ledger.props('filters')).toMatchObject({ kind: 'usage' })
  })

  it('adds the balance type only with balance:self:read', async () => {
    expect(render().get('[data-testid="extra"]').text()).toBe('ledger')
    mocks.can = false
    expect(render().get('[data-testid="extra"]').text()).toBe('')
  })
})
