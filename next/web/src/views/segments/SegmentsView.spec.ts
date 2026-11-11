import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { i18n } from '@/i18n'
import type { Segment } from '@/api/pricing'
import SegmentEditor from './SegmentEditor.vue'
import SegmentsView from './SegmentsView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), replace: vi.fn(), denied: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get, list: mocks.list } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !mocks.denied.has(key) }) }))
vi.mock('@/components/pricing/segmentLookup', () => ({ useSegmentsLookup: vi.fn() }))
const route = reactive<{ query: Record<string, string | undefined> }>({ query: {} })
vi.mock('vue-router', async (original) => ({ ...(await original<object>()), useRoute: () => route, useRouter: () => ({ replace: mocks.replace }) }))

const segment = (id: number, name: string, over: Partial<Segment> = {}): Segment => ({ id, kind: 'named', name, description: '', discount: '1', is_default: id === 1, member_count: 3, granted_groups: [], rate_override_count: 0, price_rule_count: 0, ...over })
const items = ref<Segment[]>([])
vi.mock('@/composables/useList', () => ({
  useList: () => ({ items, filters: reactive({ q: '' }), loading: ref(false), error: ref(null), page: ref(1), pageSize: ref(20), total: ref(2), reload: vi.fn() })
}))
enableAutoUnmount(afterEach)

async function render() {
  const w = mount(SegmentsView, { global: { plugins: [i18n], stubs: { Teleport: true, SegmentEditor: true, PersonalSegments: true, PriceSimulatorModal: true } } })
  await flushPromises()
  return { w, editor: () => w.getComponent(SegmentEditor).props() }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  mocks.denied.clear()
  route.query = {}
  items.value = [segment(1, '默认'), segment(2, 'VIP')]
  mocks.replace.mockReset()
  mocks.list.mockReset().mockResolvedValue({ items: [], page: { total: 2 } })
  mocks.get.mockReset().mockImplementation(async (path: string) => items.value.find((s) => path === `/segments/${s.id}`))
})

describe('user groups page', () => {
  it('opens the editor of a row, and its members from the member count', async () => {
    const { w, editor } = await render()
    const vip = w.get('[data-segment="2"]')
    await vip.get('[data-testid="segment-edit"]').trigger('click')
    expect(editor()).toMatchObject({ open: true, segment: items.value[1], tab: 'basic', readonly: false })
    await vip.get('[data-testid="segment-members-link"]').trigger('click')
    expect(editor()).toMatchObject({ tab: 'members' })
  })

  it('opens the user group ?edit= names and takes the parameter off the address bar', async () => {
    route.query = { edit: '2', q: 'x' }
    const { editor } = await render()
    expect(mocks.get).toHaveBeenCalledWith('/segments/2')
    expect(editor()).toMatchObject({ open: true, segment: items.value[1], tab: 'basic' })
    expect(mocks.replace).toHaveBeenCalledWith({ query: { q: 'x', edit: undefined } })
  })

  it('leaves a personal segment asked for by ?edit= to the page of its user', async () => {
    route.query = { edit: '104' }
    mocks.get.mockResolvedValue(segment(104, 'a@b.c', { kind: 'personal' }))
    const { editor } = await render()
    expect(editor().open).toBe(false)
  })

  it('lets a caller who may not manage user groups look at one', async () => {
    mocks.denied.add('segment:manage')
    const { w, editor } = await render()
    expect(w.find('[data-testid="segment-create"]').exists()).toBe(false)
    const view = w.get('[data-segment="2"]').get('[data-testid="segment-edit"]')
    expect(view.text()).toBe('查看')
    await view.trigger('click')
    expect(editor()).toMatchObject({ open: true, readonly: true })
  })
})
