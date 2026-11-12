import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, type Component, type SetupContext } from 'vue'
import { i18n } from '@/i18n'
import type { Group } from '@/api/types'
import type { SegmentRef } from '@/api/pricing'
import GroupPricingModal from './GroupPricingModal.vue'

enableAutoUnmount(afterEach)
/** The props a stub is handed. */
type Props = Record<string, any>

const vip: SegmentRef = { id: 2, kind: 'named', name: 'VIP' }
const rows = [{ id: 2, segment: vip }]
/** The user groups tab: hands its rows over and asks for the prices of one. */
const segmentsEditor: Component = {
  props: ['groupId', 'visibility', 'defaultRate', 'editable'],
  emits: ['rows', 'pricing'],
  setup(props: Props, { emit }: SetupContext) {
    emit('rows', rows)
    return () => h('button', { 'data-testid': 'segments', 'data-editable': String(!!props.editable), 'data-rate': props.defaultRate, onClick: () => emit('pricing', vip) })
  }
}
const selected: Array<SegmentRef | null> = []
const pricingEditor: Component = {
  props: ['groupId', 'segments', 'defaultRate', 'editable'],
  setup(props: Props, { expose }: SetupContext) {
    expose({ select: (s: SegmentRef | null) => selected.push(s) })
    return () => h('div', { 'data-testid': 'pricing', 'data-editable': String(!!props.editable), 'data-rows': props.segments?.length })
  }
}

const group = { id: 3, name: 'pro', visibility: 'restricted', rate_multiplier: 1.2 } as unknown as Group

async function render(initialTab?: 'segments' | 'pricing') {
  const w = mount(GroupPricingModal, { props: { open: true, group, initialTab }, global: { plugins: [i18n], stubs: { Teleport: true, GroupSegmentsEditor: segmentsEditor, GroupPricingEditor: pricingEditor } } })
  await flushPromises()
  return { w, selected: () => w.get('[role="tab"][aria-selected="true"]').text() }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  selected.length = 0
})

describe('access and pricing of a group, read-only', () => {
  it('shows both tabs without editing, the prices tab with the rows of the other', async () => {
    const { w, selected: tab } = await render()
    expect(w.text()).toContain('pro 的授权与定价')
    expect(tab()).toBe('授权与倍率')
    expect(w.get('[data-testid="segments"]').attributes()).toMatchObject({ 'data-editable': 'false', 'data-rate': '1.2' })
    expect(w.get('[data-testid="pricing"]').attributes()).toMatchObject({ 'data-editable': 'false', 'data-rows': '1' })
  })

  it('opens on the tab asked for', async () => {
    expect((await render('pricing')).selected()).toBe('模型定价')
  })

  it('shows the model prices of the user group a row asks for', async () => {
    const { w, selected: tab } = await render()
    await w.get('[data-testid="segments"]').trigger('click')
    expect(selected).toEqual([vip])
    expect(tab()).toBe('模型定价')
  })

  it('closes', async () => {
    const { w } = await render()
    await w.get('[data-testid="group-pricing-view-close"]').trigger('click')
    expect(w.emitted('update:open')).toEqual([[false]])
  })
})
