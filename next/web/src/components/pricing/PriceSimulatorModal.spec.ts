import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { SSelect } from '@sub2api/ui'
import { i18n } from '@/i18n'
import GroupPicker from '@/components/GroupPicker.vue'
import PriceSimulatorModal from './PriceSimulatorModal.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), post: vi.fn() }))
const denied = vi.hoisted(() => new Set<string>())
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !denied.has(key) }) }))
enableAutoUnmount(afterEach)

const GROUPS = [
  { id: 1, name: 'default', models: ['gpt-4o'] },
  { id: 2, name: 'vip', models: ['claude-haiku-4-5', 'gpt-4o'] }
]

/** The models of a group are asked for a tick after it is chosen. */
async function settle() {
  await flushPromises()
  await new Promise((r) => setTimeout(r))
  await flushPromises()
}
async function open(preset: { groupId?: number; model?: string; userId?: number }) {
  const w = mount(PriceSimulatorModal, { props: { open: true, preset }, global: { plugins: [i18n], stubs: { Teleport: true } } })
  await settle()
  return w
}
type Simulator = Awaited<ReturnType<typeof open>>
const chosen = (w: Simulator) => ({
  group: w.getComponent(GroupPicker).props('modelValue'),
  model: w.getComponent<typeof SSelect>('[data-testid="price-sim-model"]').props('modelValue')
})

describe('price simulator', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
    vi.clearAllMocks()
    denied.clear()
    api.list.mockImplementation(async (_path: string, q: { model?: string }) => ({ items: GROUPS.filter((g) => !q.model || g.models.includes(q.model)) }))
    api.get.mockImplementation(async (path: string) => ({ models: GROUPS.find((g) => path === `/groups/${g.id}/model-prices`)!.models.map((model) => ({ model })) }))
  })

  it('opens a model named without a group in the first group that provides it', async () => {
    const w = await open({ model: 'claude-haiku-4-5' })
    expect(api.list).toHaveBeenCalledWith('/groups', { model: 'claude-haiku-4-5', page_size: 200 })
    expect(chosen(w)).toEqual({ group: 2, model: 'claude-haiku-4-5' })
  })

  it('stays in the chosen group when that one provides the model', async () => {
    const w = await open({ groupId: 2 })
    await w.setProps({ open: false })
    await w.setProps({ open: true, preset: { model: 'gpt-4o' } })
    await settle()
    expect(chosen(w)).toEqual({ group: 2, model: 'gpt-4o' })
  })

  it('quotes for a user or a user group, and only for what the caller may read', async () => {
    const both = await open({})
    expect(both.find('[data-testid="price-sim-subject"]').exists()).toBe(true)
    expect(both.find('[data-testid="price-sim-user"]').exists()).toBe(true)

    denied.add('segment:read')
    const users = await open({})
    expect(users.find('[data-testid="price-sim-subject"]').exists()).toBe(false)
    expect(users.find('[data-testid="price-sim-user"]').exists()).toBe(true)
    expect(api.list).not.toHaveBeenCalledWith('/segments', expect.anything())

    denied.clear()
    denied.add('user:read')
    const segments = await open({})
    expect(segments.find('[data-testid="price-sim-subject"]').exists()).toBe(false)
    expect(segments.find('[data-testid="price-sim-segment"]').exists()).toBe(true)
  })

  it('says so when no group provides the model', async () => {
    const w = await open({ model: 'claude-opus-9' })
    expect(w.get('[data-testid="price-sim-unprovided"]').text()).toBe('还没有分组提供 claude-opus-9，无法试算。')
    expect(chosen(w)).toEqual({ group: null, model: null })
  })

  it('takes the user a preset names, and only the latest of two', async () => {
    const answers: Record<string, (u: object) => void> = {}
    api.get.mockImplementation((path: string) => (path.startsWith('/users/') ? new Promise((r) => (answers[path] = r)) : Promise.resolve({ models: [] })))
    const w = await open({ userId: 7 })
    await w.setProps({ preset: { userId: 8 } })
    await settle()
    answers['/users/8']({ id: 8, email: 'b@x', segment: { id: 3, kind: 'named', name: 'VIP' } })
    answers['/users/7']({ id: 7, email: 'a@x', segment: { id: 2, kind: 'named', name: 'Old' } })
    await settle()
    expect(w.get('[data-testid="price-sim-user"]').get('[data-testid="segment-badge"]').text()).toBe('VIP')
  })

  it('takes the groups of the latest model named, whichever answers first', async () => {
    const answers: Record<string, (v: object) => void> = {}
    api.list.mockImplementation((_path: string, q: { model: string }) => new Promise((r) => (answers[q.model] = r)))
    const w = await open({ model: 'gpt-4o' })
    await w.setProps({ preset: { model: 'claude-haiku-4-5' } })
    await settle()
    answers['claude-haiku-4-5']({ items: [GROUPS[1]] })
    await settle()
    answers['gpt-4o']({ items: [GROUPS[0]] })
    await settle()
    expect(chosen(w)).toEqual({ group: 2, model: 'claude-haiku-4-5' })
  })

  it('says why the models of the group could not be listed', async () => {
    api.get.mockRejectedValue(new Error('models down'))
    const w = await open({ groupId: 2 })
    expect(w.get('[data-testid="price-sim"]').text()).toContain('models down')
  })
})
