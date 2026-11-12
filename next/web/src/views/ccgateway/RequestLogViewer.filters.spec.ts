import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { Query } from '@sub2api/host'
import { i18n } from '@/i18n'
import { resetEntityLookups } from '@/components/entity/lookup'
import RequestLogViewer from './RequestLogViewer.vue'

// The list's model filter: an exact model name (`model`), picked from the
// priced models and those of the listed requests.
const mocks = vi.hoisted(() => ({ get: vi.fn(), lookup: true }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get: mocks.get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => mocks.lookup }) }))

const item = (id: string, model: string) => ({
  id, request_id: `req_${id}`, time: '2026-10-27T00:00:00Z', duration_ms: 1200, status: 200, stage: 'finished', model,
  log_level: 'summary', log_status: 'complete', test: false, has_content: false, bytes: 512
})
/** The `model` of every list request so far (undefined = not filtered). */
const asked = () => mocks.get.mock.calls.filter(([url]) => String(url).endsWith('/requests')).map(([, query]) => (query as Query).model)
const input = () => document.body.querySelector('[data-testid="request-log-filter-model"] input, input[data-testid="request-log-filter-model"]') as HTMLInputElement
const options = () => Array.from(document.body.querySelectorAll('[role="option"]')) as HTMLElement[]

async function open() {
  mount(RequestLogViewer, { attachTo: document.body, props: { open: true, accountId: 25, search: false }, global: { plugins: [i18n] } })
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  resetEntityLookups()
  mocks.lookup = true
  mocks.get.mockReset().mockImplementation(async (url: string) => {
    if (url === '/lookup/models') return { items: [{ id: 'claude-opus-5', name: 'claude-opus-5' }, { id: 'claude-sonnet-5', name: 'claude-sonnet-5' }], more: false }
    return { items: [item('a', 'claude-sonnet-5'), item('b', 'claude-internal-probe'), item('c', 'claude-sonnet-5')], next: null, active: [] }
  })
})
afterEach(() => vi.useRealTimers())
enableAutoUnmount(afterEach)

describe('request log model filter', () => {
  it('offers the models of the listed requests before the priced ones and asks for the picked one at once', async () => {
    await open()
    expect(asked()).toEqual([undefined])
    input().dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(options().map((o) => o.textContent)).toEqual(['claude-sonnet-5', 'claude-internal-probe', 'claude-opus-5'])
    options()[1].click()
    await flushPromises()
    expect(asked()).toEqual([undefined, 'claude-internal-probe'])
  })

  it('is a text box taking the exact model name without the lookup permission', async () => {
    mocks.lookup = false
    await open()
    input().value = 'claude-opus-5'
    input().dispatchEvent(new Event('change'))
    await flushPromises()
    expect(asked()).toEqual([undefined, 'claude-opus-5'])
    expect(mocks.get.mock.calls.some(([url]) => String(url).startsWith('/lookup/'))).toBe(false)
  })
})
