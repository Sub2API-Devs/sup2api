import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { ApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import SchedulingPolicyView from './SchedulingPolicyView.vue'
import { emptyFailurePolicy } from './failurePolicy'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), list: vi.fn() }))
const permissions = vi.hoisted(() => ({ manage: true }))
const route = reactive<{ query: Record<string, string> }>({ query: { tab: 'failure' } })
const router = {
  replace: vi.fn((to: { query: Record<string, string> }) => {
    route.query = to.query
  })
}
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
  api.get.mockImplementation(path =>
    Promise.resolve(
      {
        '/settings/failure-policy': { configured: true, policy: emptyFailurePolicy() },
        '/settings/scheduling': { mode: 'default', metric: 'rpm', limit_load: false, model_limits: false }
      }[path as string] ?? {}
    )
  )
})

async function render() {
  const w = mount(SchedulingPolicyView, { global: { plugins: [i18n] } })
  await flushPromises()
  return w
}

// Switches carry the test id on their input, segmented controls on the group.
const disabled = (w: Awaited<ReturnType<typeof render>>, id: string) => {
  const inputs = w.findAll(`input[data-testid="${id}"], [data-testid="${id}"] input`)
  expect(inputs.length).toBeGreaterThan(0)
  return inputs.every(el => (el.element as HTMLInputElement).disabled)
}

describe('scheduling policy tabs (CONTRACTS §89)', () => {
  it('opens the failure policy by default and keeps the balance tab in ?sub=', async () => {
    const w = await render()
    expect(w.find('[data-testid="balance-settings"]').exists()).toBe(false)
    expect(api.get).not.toHaveBeenCalledWith('/settings/scheduling')
    await w.findAll('[role="tab"]')[1].trigger('click')
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'failure', sub: 'balance' } })
    await flushPromises()
    expect(w.find('[data-testid="balance-settings"]').exists()).toBe(true)
    // Back to the default tab: the URL loses ?sub= again.
    await w.findAll('[role="tab"]')[0].trigger('click')
    expect(router.replace).toHaveBeenLastCalledWith({ query: { tab: 'failure', sub: undefined } })
  })

  it('falls back to the failure policy for an unknown ?sub=', async () => {
    route.query = { tab: 'failure', sub: 'nope' }
    const w = await render()
    expect(w.find('[data-testid="balance-settings"]').exists()).toBe(false)
    expect(w.find('[data-testid="failure-policy-settings"]').exists()).toBe(true)
    expect(w.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
  })

  it('greys the metric and balancing by model until something balances', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    expect(disabled(w, 'balance-metric')).toBe(true)
    expect(disabled(w, 'balance-model-limits')).toBe(true)
    // Limit-aware load alone, strategy still default, enables both.
    await w.get('[data-testid="balance-limit-load"]').setValue(true)
    expect(disabled(w, 'balance-metric')).toBe(false)
    expect(disabled(w, 'balance-model-limits')).toBe(false)
    await w.get('[data-testid="balance-limit-load"]').setValue(false)
    expect(disabled(w, 'balance-metric')).toBe(true)
    await w.get('[data-testid="balance-mode"] input[value="traffic"]').setValue(true)
    expect(disabled(w, 'balance-metric')).toBe(false)
    expect(disabled(w, 'balance-model-limits')).toBe(false)
    await w.get('[data-testid="balance-limit-load"]').setValue(true)
    await w.get('[data-testid="balance-model-limits"]').setValue(true)
    expect(w.findAll('[data-testid="balance-metric"] label').map(l => l.text())).toEqual(['RPM', '并发', 'TPM', '会话'])
    await w.get('[data-testid="balance-metric"] input[value="sessions"]').setValue(true)
    await w.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/settings/scheduling', {
      mode: 'traffic',
      metric: 'sessions',
      limit_load: true,
      model_limits: true
    })
  })

  it('describes the default strategy by whether limit-aware load lowers its weights', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    // The strategy row's own description, which its control names in aria-describedby.
    const modeHint = () => w.get(`[id="${w.get('[data-testid="balance-mode"]').attributes('aria-describedby')}"]`).text()
    expect(modeHint()).toBe('同优先级内按权重随机选号。')
    await w.get('[data-testid="balance-limit-load"]').setValue(true)
    expect(modeHint()).toBe('同优先级内按权重随机选号，权重先按上限负载折减。')
    // The traffic strategy reads the same either way.
    await w.get('[data-testid="balance-mode"] input[value="traffic"]').setValue(true)
    const traffic = modeHint()
    expect(traffic).toContain('权重份额')
    await w.get('[data-testid="balance-limit-load"]').setValue(false)
    expect(modeHint()).toBe(traffic)
  })

  it('shows server field errors on their rows', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    await w.get('[data-testid="balance-mode"] input[value="traffic"]').setValue(true)
    api.put.mockRejectedValueOnce(
      new ApiError(400, {
        code: 'invalid_argument',
        message: 'invalid',
        details: { fields: [{ field: 'mode', code: 'invalid', message: '取值无效' }] }
      })
    )
    await w.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('取值无效')
  })

  it('is read only without settings:manage', async () => {
    permissions.manage = false
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    expect(w.find('[data-testid="settings-save"]').exists()).toBe(false)
    for (const id of ['balance-mode', 'balance-limit-load', 'balance-metric', 'balance-model-limits']) expect(disabled(w, id)).toBe(true)
  })
})
