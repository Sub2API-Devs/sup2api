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
        '/settings/scheduling': { mode: 'default', metric: 'sessions', limit_load: false, model_limits: false }
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

  it('always balances by traffic, by sessions out of the box', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    api.get.mockResolvedValueOnce({})
    const w = await render()
    expect(w.find('[data-testid="balance-mode"]').exists()).toBe(false)
    expect(w.text()).not.toContain('均衡策略')
    expect(w.text()).toContain('优先选用量低于权重份额的账号，让流量按权重比分配。')
    expect(w.findAll('[data-testid="balance-metric"] label').map(l => l.text())).toEqual(['RPM', '并发', 'TPM', '会话'])
    expect(w.get<HTMLInputElement>('[data-testid="balance-metric"] input[value="sessions"]').element.checked).toBe(true)
    // Freshly loaded, nothing to save.
    expect(w.get('[data-testid="settings-save"]').attributes('disabled')).toBeDefined()
  })

  it('lets a manager set the metric and balancing by model right away', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    for (const id of ['balance-limit-load', 'balance-metric', 'balance-model-limits']) expect(disabled(w, id)).toBe(false)
    await w.get('[data-testid="balance-metric"] input[value="tpm"]').setValue(true)
    await w.get('[data-testid="balance-model-limits"]').setValue(true)
    await w.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    // An older core's "default" goes back as "traffic".
    expect(api.put).toHaveBeenCalledWith('/settings/scheduling', {
      mode: 'traffic',
      metric: 'tpm',
      limit_load: false,
      model_limits: true
    })
  })

  it('shows server field errors on their rows', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const w = await render()
    await w.get('[data-testid="balance-metric"] input[value="rpm"]').setValue(true)
    api.put.mockRejectedValueOnce(
      new ApiError(400, {
        code: 'invalid_argument',
        message: 'invalid',
        details: { fields: [{ field: 'metric', code: 'invalid', message: '取值无效' }] }
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
    for (const id of ['balance-limit-load', 'balance-metric', 'balance-model-limits']) expect(disabled(w, id)).toBe(true)
  })
})
