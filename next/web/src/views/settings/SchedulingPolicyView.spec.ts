import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { i18n } from '@/i18n'
import SchedulingPolicyView from './SchedulingPolicyView.vue'
import { emptyFailurePolicy } from './failurePolicy'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), list: vi.fn() }))
const permissions = vi.hoisted(() => ({ manage: true }))
const route = reactive<{ query: Record<string, string> }>({ query: { tab: 'failure' } })
const router = { replace: vi.fn((to: { query: Record<string, string> }) => { route.query = to.query }) }
vi.mock('vue-router', async original => ({ ...(await original<object>()), useRoute: () => route, useRouter: () => router }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => permissions.manage || key.endsWith(':read') }) }))
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  permissions.manage = true
  route.query = { tab: 'failure' }
  i18n.global.locale.value = 'zh'
  api.list.mockResolvedValue({ items: [], total: 0 })
  api.put.mockImplementation((_path, body) => Promise.resolve(body))
  api.get.mockImplementation(path => Promise.resolve({
    '/settings/failure-policy': { configured: true, policy: emptyFailurePolicy() },
    '/settings/scheduling': { mode: 'default', metric: 'rpm', limit_load: false, model_limits: false }
  }[path as string] ?? {}))
})

async function render() {
  const w = mount(SchedulingPolicyView, { global: { plugins: [i18n] } })
  await flushPromises()
  return w
}

// Switches carry the test id on their input, segmented controls on the group.
const disabled = (w: Awaited<ReturnType<typeof render>>, id: string) =>
  w.findAll(`input[data-testid="${id}"], [data-testid="${id}"] input`).every(el => (el.element as HTMLInputElement).disabled)

describe('scheduling policy tabs (CONTRACTS §88)', () => {
  it('opens the failure policy by default and keeps the balance tab in ?sub=', async () => {
    const w = await render()
    expect(w.find('[data-testid="balance-settings"]').exists()).toBe(false)
    expect(api.get).not.toHaveBeenCalledWith('/settings/scheduling')
    await w.findAll('[role="tab"]')[1].trigger('click')
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'failure', sub: 'balance' } })
    await flushPromises()
    expect(w.find('[data-testid="balance-settings"]').exists()).toBe(true)
  })

  it('greys the metric until something balances on it, and model limits until the limit load is on', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    expect(disabled(w, 'balance-metric')).toBe(true)
    expect(disabled(w, 'balance-model-limits')).toBe(true)
    await w.get('[data-testid="balance-mode"] input[value="traffic"]').setValue(true)
    expect(disabled(w, 'balance-metric')).toBe(false)
    expect(disabled(w, 'balance-model-limits')).toBe(true)
    await w.get('[data-testid="balance-limit-load"]').setValue(true)
    expect(disabled(w, 'balance-model-limits')).toBe(false)
    await w.get('[data-testid="balance-metric"] input[value="concurrency"]').setValue(true)
    await w.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/settings/scheduling', { mode: 'traffic', metric: 'concurrency', limit_load: true, model_limits: false })
  })

  it('is read only without settings:manage', async () => {
    permissions.manage = false
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    expect(w.find('[data-testid="settings-save"]').exists()).toBe(false)
    for (const id of ['balance-mode', 'balance-limit-load', 'balance-metric', 'balance-model-limits']) expect(disabled(w, id)).toBe(true)
  })
})
