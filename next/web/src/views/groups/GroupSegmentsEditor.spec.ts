import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Group } from '@/api/types'
import type { Segment, SegmentGroupSetting, SegmentRef } from '@/api/pricing'
import GroupSegmentsEditor from './GroupSegmentsEditor.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), toast: vi.fn(), firstPage: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get, put: mocks.put } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), toast: (...a: unknown[]) => mocks.toast(...a) }))
vi.mock('@/composables/lookups', () => ({ fetchFirstPage: mocks.firstPage }))
enableAutoUnmount(afterEach)

const vip: SegmentRef = { id: 2, kind: 'named', name: 'VIP' }
const staff: SegmentRef = { id: 4, kind: 'named', name: 'Staff' }
const solo: SegmentRef = { id: 104, kind: 'personal', name: 'a@b.c', user_id: 9 }

function setting(segment: SegmentRef, over: Partial<SegmentGroupSetting> = {}): SegmentGroupSetting {
  return {
    segment,
    group: { id: 3, name: 'team', description: '', status: 'active', visibility: 'restricted', rate_multiplier: '0.8' },
    accessible: false,
    granted: false,
    rate_override: null,
    rate: { value: '0.8', source: 'group', group_default: '0.8', discount: '1' },
    price_rule_count: 0,
    member_count: 2,
    ...over
  }
}
const saved = () => [setting(vip, { granted: true, rate: { value: '0.72', source: 'discount', group_default: '0.8', discount: '0.9' }, price_rule_count: 2 }), setting(staff)]

async function render(props: { groupId: number | null; visibility?: Group['visibility']; defaultRate?: string; editable?: boolean }) {
  const w = mount(GroupSegmentsEditor, {
    props: { visibility: 'restricted', defaultRate: '0.8', editable: true, ...props },
    global: { plugins: [i18n], stubs: { PersonalSegmentPicker: true } }
  })
  await flushPromises()
  const row = (id: number) => w.get(`[data-segment="${id}"]`)
  const rate = (id: number) => row(id).get('[data-testid="access-rate-value"]').text()
  const source = (id: number) => row(id).get('[data-testid="access-rate-source"]').text()
  return { w, row, rate, source }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  mocks.get.mockReset().mockResolvedValue(saved())
  mocks.put.mockReset()
  mocks.toast.mockReset()
  mocks.firstPage.mockReset()
})

describe('group user groups editor', () => {
  it('lists the user groups of the group with the rate each pays', async () => {
    const { w, row, rate, source } = await render({ groupId: 3 })
    expect(mocks.get).toHaveBeenCalledWith('/groups/3/segments', undefined)
    expect(w.findAll('thead th').map((th) => th.text())).toEqual(['用户组', '能否使用', '专属倍率', '实际倍率', '模型专属价'])
    expect(row(2).text()).toContain('VIP')
    expect(row(2).get('[data-testid="access-rate-grant"]').element.parentElement?.textContent).toContain('已授权')
    expect([rate(2), source(2)]).toEqual(['×0.72', '分组默认 × 全场折扣'])
    expect(row(2).get('[data-testid="access-rate-price-count"]').text()).toBe('2 条')
    // Not granted: the rate it would pay, marked as not in effect.
    expect(row(4).get('[data-testid="access-rate-grant"]').element.parentElement?.textContent).toContain('未授权')
    expect([rate(4), source(4)]).toEqual(['×0.8', '未授权，暂不生效'])
    expect(w.find('[data-testid="group-segments-nobody"]').exists()).toBe(false)
  })

  it('follows the visibility and the default rate being edited in the form', async () => {
    const { w, rate } = await render({ groupId: 3, visibility: 'public', defaultRate: '2' })
    expect(w.find('[data-testid="access-rate-grant"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="access-rate-access"]').map((b) => b.text())).toEqual(['公开', '公开'])
    expect(rate(2)).toBe('×1.8')
    expect(rate(4)).toBe('×2')
  })

  it('warns when a private group is granted to nobody', async () => {
    mocks.get.mockResolvedValue([setting(vip), setting(staff)])
    const { w, row } = await render({ groupId: 3 })
    expect(w.find('[data-testid="group-segments-nobody"]').exists()).toBe(true)
    await row(4).get('[data-testid="access-rate-grant"]').setValue(true)
    expect(w.find('[data-testid="group-segments-nobody"]').exists()).toBe(false)
  })

  it('keeps edits in drafts and saves the changed rows only', async () => {
    const { w, row, rate } = await render({ groupId: 3 })
    expect(w.vm.dirty).toBe(false)
    await row(4).get('[data-testid="access-rate-grant"]').setValue(true)
    await row(2).get('[data-testid="rate-override-input"]').setValue('0.5')
    expect(rate(2)).toBe('×0.5')
    expect(rate(4)).toBe('×0.8')
    expect(w.vm.dirty).toBe(true)
    expect(w.findAll('[data-testid="access-rate-unsaved"]')).toHaveLength(2)

    mocks.put.mockResolvedValue([setting(vip, { granted: true, rate_override: '0.5' }), setting(staff, { granted: true })])
    expect(await w.vm.save(3)).toBe(true)
    expect(mocks.put).toHaveBeenCalledWith('/groups/3/segments', { items: [{ segment_id: 4, granted: true }, { segment_id: 2, rate_override: '0.5' }] }, { query: undefined })
    await flushPromises()
    expect(w.vm.dirty).toBe(false)
    expect(w.find('[data-testid="access-rate-unsaved"]').exists()).toBe(false)
  })

  it('sends nothing without changes, and nothing while a rate is not one', async () => {
    const { w, row } = await render({ groupId: 3 })
    expect(await w.vm.save(3)).toBe(true)
    await row(2).get('[data-testid="rate-override-input"]').setValue('abc')
    expect(await w.vm.save(3)).toBe(false)
    expect(mocks.put).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('VIP'), 'error')
    expect(w.vm.dirty).toBe(true)
  })

  it('starts a group not created yet from the named user groups and saves under the id it gets', async () => {
    mocks.firstPage.mockResolvedValue([{ ...vip, discount: '0.9', member_count: 3 } as Segment])
    const { w, row, rate } = await render({ groupId: null, defaultRate: '1' })
    expect(mocks.firstPage).toHaveBeenCalledWith('/segments')
    expect(mocks.get).not.toHaveBeenCalled()
    // No prices to open before the group exists.
    expect(w.find('[data-testid="access-rate-prices"]').exists()).toBe(false)
    await row(2).get('[data-testid="access-rate-grant"]').setValue(true)
    expect(rate(2)).toBe('×0.9')
    mocks.put.mockResolvedValue([])
    await w.vm.save(9)
    expect(mocks.put).toHaveBeenCalledWith('/groups/9/segments', { items: [{ segment_id: 2, granted: true }] }, { query: undefined })
  })

  it('lists a personal user group picked here and keeps the drafts while it is fetched', async () => {
    const { w, row } = await render({ groupId: 3 })
    await row(4).get('[data-testid="access-rate-grant"]').setValue(true)
    mocks.get.mockResolvedValue([...saved(), setting(solo)])
    await w.vm.include(solo)
    await flushPromises()
    expect(mocks.get).toHaveBeenLastCalledWith('/groups/3/segments', { include: '104' })
    expect(row(104).get('[data-testid="segment-badge"]').attributes('data-kind')).toBe('personal')
    expect(row(4).find('[data-testid="access-rate-unsaved"]').exists()).toBe(true)

    await row(104).get('[data-testid="access-rate-grant"]').setValue(true)
    mocks.put.mockResolvedValue([])
    await w.vm.save(3)
    expect(mocks.put.mock.calls[0][2]).toEqual({ query: { include: '104' } })
  })

  it('asks for the model prices of the user group of a row', async () => {
    const { w, row } = await render({ groupId: 3 })
    await row(2).get('[data-testid="access-rate-prices"]').trigger('click')
    expect(w.emitted('pricing')).toEqual([[vip]])
  })

  it('only shows the rows to a caller who may not edit them', async () => {
    mocks.get.mockResolvedValue([setting(vip), setting(staff)])
    const { w, row } = await render({ groupId: 3, editable: false })
    expect(w.findAll('thead th').map((th) => th.text())).toEqual(['用户组', '能否使用', '实际倍率', '模型专属价'])
    expect(w.find('[data-testid="access-rate-grant"], [data-testid="rate-override-input"]').exists()).toBe(false)
    expect(w.findComponent({ name: 'PersonalSegmentPicker' }).exists()).toBe(false)
    expect(row(2).get('[data-testid="access-rate-access"]').text()).toBe('未授权')
    expect(row(2).get('[data-testid="access-rate-prices"]').text()).toBe('查看')
    // Nobody is granted, and there is no switch to point at.
    expect(w.get('[data-testid="group-segments-nobody"]').text()).toBe('这个私有分组还没有授权给任何人，现在没有人能用。')
  })
})
