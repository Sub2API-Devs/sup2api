import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Group } from '@/api/types'
import { i18n } from '@/i18n'
import { mountPinned } from '@sub2api/ui/testing'
import GroupsView from './GroupsView.vue'
import PlatformEndpointsPreview from '@/views/platforms/PlatformEndpointsPreview.vue'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/composables/lookups', async original => ({ ...(await original<object>()), useGroupsLookup: vi.fn() }))
const group = (id: number, name: string, over: Partial<Group> = {}): Group => ({
  id,
  name,
  description: '',
  status: 'active',
  rate_multiplier: '1',
  visibility: 'public',
  model_allowlist: [],
  account_count: 3,
  api_key_count: 1,
  platforms: ['anthropic'],
  ...over
})
const items = ref<Group[]>([])
vi.mock('@/composables/useList', () => ({
  useList: () => ({ items, loading: ref(false), error: ref(null), page: ref(1), pageSize: ref(20), total: ref(2), reload: vi.fn() })
}))
enableAutoUnmount(afterEach)

const options = {
  global: {
    plugins: [i18n],
    stubs: {
      Teleport: true,
      ModelBadge: true,
      PlatformEndpointsPreview: true,
      EnvironmentEditor: true,
      GroupAccountsEditor: true,
      GroupModelPolicyEditor: true,
      GroupDeleteModal: true
    }
  }
}
const render = () => mount(GroupsView, options)
type View = ReturnType<typeof render>
const rows = (w: View) => w.findAll('tbody tr')
async function openDetail(w: View, index: number) {
  await rows(w)[index].get('[data-testid="group-name"]').trigger('click')
  await flushPromises()
  return w.get('[data-testid="group-detail"]')
}

describe('groups page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    items.value = [group(1, 'default', { platforms: ['anthropic', 'openai'] }), group(2, 'trial', { account_count: 0, platforms: [] })]
    get.mockImplementation(async (path: string) =>
      path.endsWith('/models') ? { models: [], unrestricted_accounts: 0 } : items.value.find(g => path === `/groups/${g.id}`)
    )
  })

  it('lists the groups without the platforms they serve', () => {
    const w = render()
    expect(w.findAll('thead th').map(th => th.text())).toEqual(['名称', '可见性', '倍率', '模型名单', '账号数', 'Key 数', '状态', '操作'])
    expect(rows(w).map(r => r.get('[data-testid="group-name"]').text())).toEqual(['default', 'trial'])
    expect(w.find('[data-testid="platform-badge"], [data-platform]').exists()).toBe(false)
  })

  it('warns beside the account count of a group without accounts, as an icon with the sentence behind it', () => {
    const [served, empty] = rows(render())
    expect(served.find('[data-testid="group-no-accounts"]').exists()).toBe(false)
    const count = empty.findAll('td')[4]
    expect(count.get('[data-testid="group-no-accounts"]').attributes('aria-label')).toBe('暂无账号，无法提供服务。')
    expect(count.text()).toBe('0')
  })

  it('shows the count and its warning on the cards of a phone too', () => {
    const w = mountPinned(GroupsView, options)
    expect(w.find('table').exists()).toBe(false)
    expect(w.findAll('[data-testid="group-no-accounts"]')).toHaveLength(1)
    expect(w.text()).toContain('账号数')
  })

  it('does not show the platforms served in the edit form', async () => {
    const w = render()
    await rows(w)[0]
      .findAll('button')
      .find(b => b.text() === '编辑')!
      .trigger('click')
    await flushPromises()
    expect(w.text()).toContain('编辑分组 default')
    const form = w.get('form')
    expect(form.text()).not.toContain('平台')
    expect(form.find('[data-testid="platform-badge"], [data-platform]').exists()).toBe(false)
  })

  it('shows in the detail what the group serves by its endpoints, conversion included, not by its platforms', async () => {
    const w = render()
    const detail = await openDetail(w, 0)
    expect(get).toHaveBeenCalledWith('/groups/1')
    expect(detail.text()).not.toContain('平台')
    expect(detail.find('[data-testid="group-no-accounts"]').exists()).toBe(false)
    expect(w.getComponent(PlatformEndpointsPreview).props()).toMatchObject({ ids: ['anthropic', 'openai'] })
  })

  it('shows the warning and no endpoints in the detail of a group without accounts', async () => {
    const w = render()
    const detail = await openDetail(w, 1)
    expect(detail.get('[data-testid="group-no-accounts"]').attributes('aria-label')).toBe('暂无账号，无法提供服务。')
    expect(w.findComponent(PlatformEndpointsPreview).exists()).toBe(false)
  })

  it('shows no endpoints when the accounts of the group serve no platform', async () => {
    items.value = [group(1, 'orphans', { platforms: [] })]
    const w = render()
    await openDetail(w, 0)
    expect(w.findComponent(PlatformEndpointsPreview).exists()).toBe(false)
  })
})
