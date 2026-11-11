import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, ref, type Component, type SetupContext } from 'vue'
import { i18n } from '@/i18n'
import type { SegmentRef } from '@/api/pricing'
import GroupPricingEditor from './GroupPricingEditor.vue'
import { viewRow, type SegmentRow, type SegmentView } from './segmentDrafts'

enableAutoUnmount(afterEach)

/** The price table: whether it has drafts and what saving them answers. */
const tableDirty = ref(false)
const tableSave = vi.fn()
const table: Component = {
  props: { groupId: Number, segment: Object, editable: Boolean },
  setup(props: { segment?: SegmentRef }, { expose }: SetupContext) {
    expose({ load: vi.fn(), save: tableSave, dirty: tableDirty })
    return () => h('div', { 'data-testid': 'table', 'data-segment': props.segment?.id ?? '' })
  }
}
const picker: Component = { emits: ['select'], setup: () => () => h('div', { 'data-testid': 'picker' }) }

const vip: SegmentRef = { id: 2, kind: 'named', name: 'VIP' }
const staff: SegmentRef = { id: 4, kind: 'named', name: 'Staff' }
const solo: SegmentRef = { id: 104, kind: 'personal', name: 'a@b.c', user_id: 9 }
const view = (segment: SegmentRef, over: Partial<SegmentRow> = {}): SegmentView =>
  viewRow({ segment, granted: false, rate_override: null, discount: '1', price_rule_count: 0, ...over }, new Map(), { visibility: 'restricted', defaultRate: '0.8' })
const segments = [view(vip, { granted: true, discount: '0.9' }), view(staff), view(solo, { granted: true, rate_override: '0.65' })]

function render(groupId: number | null = 3) {
  const w = mount(GroupPricingEditor, {
    props: { groupId, segments, defaultRate: '0.8', editable: true },
    global: { plugins: [i18n], stubs: { Teleport: true, ModelPriceTable: table, PersonalSegmentPicker: picker } }
  })
  const target = () => w.get('[data-testid="table"]').attributes('data-segment')
  const scope = () => w.get('[data-testid="group-pricing-scope"]').text()
  const asked = () => w.find('[data-testid="group-pricing-unsaved"]').exists()
  return { w, target, scope, asked }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  tableDirty.value = false
  tableSave.mockReset().mockResolvedValue(true)
})

describe('group pricing editor', () => {
  it('prices the group itself until a user group is chosen, and says whose prices and at which rate', async () => {
    const { w, target, scope } = render()
    expect(target()).toBe('')
    expect(scope()).toContain('分组默认 ×0.8')
    await w.vm.select(vip)
    expect(target()).toBe('2')
    expect(scope()).toContain('「VIP」')
    expect(scope()).toContain('×0.72')
    await w.vm.select(solo)
    expect(scope()).toContain('×0.65')
    await w.vm.select(staff)
    expect(scope()).toContain('还没被授权')
  })

  it('offers the user groups by kind, and marks the ones that cannot use the group', () => {
    const { w } = render()
    const select = w.getComponent({ name: 'SSelect' })
    expect(select.props('options')).toEqual([
      { value: null, label: '分组内定价（所有人）' },
      { value: 'named', label: '用户组', options: [{ value: 2, label: 'VIP' }, { value: 4, label: 'Staff（未授权）' }] },
      { value: 'personal', label: '个人专属', options: [{ value: 104, label: 'a@b.c' }] }
    ])
  })

  it('asks before leaving a target with drafts: stay, discard or save', async () => {
    const { w, target, asked } = render()
    await w.vm.select(vip)
    tableDirty.value = true

    await w.vm.select(null)
    expect(asked()).toBe(true)
    await w.get('[data-testid="group-pricing-unsaved-stay"]').trigger('click')
    expect([asked(), target()]).toEqual([false, '2'])

    await w.vm.select(null)
    await w.get('[data-testid="group-pricing-unsaved-save"]').trigger('click')
    await flushPromises()
    expect(tableSave).toHaveBeenCalledTimes(1)
    expect([asked(), target()]).toEqual([false, ''])

    await w.vm.select(solo)
    await w.get('[data-testid="group-pricing-unsaved-discard"]').trigger('click')
    await flushPromises()
    expect(tableSave).toHaveBeenCalledTimes(1)
    expect(target()).toBe('104')
  })

  it('keeps the target when its drafts cannot be saved', async () => {
    const { w, target, asked } = render()
    tableDirty.value = true
    tableSave.mockResolvedValue(false)
    await w.vm.select(vip)
    await w.get('[data-testid="group-pricing-unsaved-save"]').trigger('click')
    await flushPromises()
    expect([asked(), target()]).toEqual([false, ''])
  })

  it('hands a user picked here to the user groups editor and prices him', async () => {
    const { w, target } = render()
    w.getComponent(picker).vm.$emit('select', solo)
    await flushPromises()
    expect(w.emitted('include')).toEqual([[solo]])
    expect(target()).toBe('104')
  })

  it('has nothing to price before the group exists', () => {
    const { w } = render(null)
    expect(w.get('[data-testid="group-pricing-empty"]').text()).toContain('先保存分组并加入账号后再定价')
    expect(w.find('[data-testid="table"]').exists()).toBe(false)
  })
})
