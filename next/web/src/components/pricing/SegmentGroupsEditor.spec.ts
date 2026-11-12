import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, type Component, type SetupContext } from 'vue'
import { i18n } from '@/i18n'
import type { SegmentGroupSetting } from '@/api/pricing'
import SegmentGroupsEditor from './SegmentGroupsEditor.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), toast: vi.fn(), denied: new Set<string>() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !mocks.denied.has(key) }) }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get: mocks.get, put: mocks.put } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), toast: (...a: unknown[]) => mocks.toast(...a) }))

i18n.global.locale.value = 'en'

function setting(id: number, visibility: 'public' | 'restricted', over: Partial<SegmentGroupSetting> = {}): SegmentGroupSetting {
  return {
    segment: { id: 2, kind: 'named', name: 'VIP' },
    group: { id, name: `g${id}`, description: '', status: 'active', visibility, rate_multiplier: '1.2' },
    accessible: visibility === 'public',
    granted: false,
    rate_override: null,
    rate: { value: '1.08', source: 'discount', group_default: '1.2', discount: '0.9' },
    price_rule_count: 0,
    ...over
  }
}
const saved = () => [setting(1, 'public', { price_rule_count: 2 }), setting(2, 'restricted')]

/** The dialog of a row's model prices: what it was opened with, and a button that saves. */
const pricesModal: Component = {
  props: ['open', 'setting', 'editable'],
  emits: ['saved'],
  setup: (props: { open?: boolean; editable?: boolean }, { emit }: SetupContext) => () =>
    h('button', { 'data-testid': 'prices-modal', 'data-open': String(!!props.open), 'data-editable': String(!!props.editable), onClick: () => emit('saved') })
}

async function render(props: { segmentId: number | null; editable?: boolean; discount?: string }) {
  const w = mount(SegmentGroupsEditor, { props, global: { plugins: [i18n], stubs: { SegmentGroupPricesModal: pricesModal } } })
  await flushPromises()
  const row = (group: number) => w.get(`[data-group="${group}"]`)
  const rate = (group: number) => row(group).get('[data-testid="access-rate-value"]').text()
  const source = (group: number) => row(group).get('[data-testid="access-rate-source"]').text()
  return { w, row, rate, source }
}

beforeEach(() => {
  mocks.denied.clear()
  mocks.get.mockReset().mockResolvedValue(saved())
  mocks.put.mockReset()
  mocks.toast.mockReset()
})

describe('the groups of a segment', () => {
  it('asks nothing for a segment not saved yet', async () => {
    const { w } = await render({ segmentId: null, editable: true })
    expect(mocks.get).not.toHaveBeenCalled()
    expect(w.get('[data-testid="segment-groups-empty"]').text()).toContain('Save first')
    expect(await w.vm.save()).toBe(true)
  })

  it('lists what the segment gets in each group, read-only without fields', async () => {
    const { w, row, rate, source } = await render({ segmentId: 2 })
    expect(mocks.get).toHaveBeenCalledWith('/segments/2/groups')
    expect(w.findAll('thead th').map((th) => th.text())).toEqual(['Group', 'Access', 'Effective rate', 'Own prices'])
    expect(row(1).get('[data-testid="access-rate-access"]').text()).toBe('Public')
    expect([rate(1), source(1)]).toEqual(['×1.08', 'Group default × discount'])
    expect(row(1).get('[data-testid="access-rate-price-count"]').text()).toBe('2 prices')
    expect(row(2).get('[data-testid="access-rate-access"]').text()).toBe('Not granted')
    expect([rate(2), source(2)]).toEqual(['×1.08', 'Not granted, not in effect'])
    expect(row(2).get('[data-testid="access-rate-prices"]').text()).toBe('View')
    expect(w.find('[data-testid="rate-override-input"]').exists()).toBe(false)
    expect(w.find('[data-testid="access-rate-grant"]').exists()).toBe(false)
  })

  it('follows the discount of the form before it is saved', async () => {
    const { w, rate } = await render({ segmentId: 2, discount: '0.5' })
    expect(rate(1)).toBe('×0.6')
    await w.setProps({ discount: '1' })
    expect(rate(1)).toBe('×1.2')
  })

  it('keeps grants and rates in drafts and saves the changed groups', async () => {
    const { w, row, rate, source } = await render({ segmentId: 2, editable: true })
    await row(1).get('[data-testid="rate-override-input"]').setValue('0.8')
    expect(w.findAll('thead th').map((th) => th.text())).toEqual(['Group', 'Access', 'Own rate', 'Effective rate', 'Own prices'])
    await row(2).get('[data-testid="access-rate-grant"]').setValue(true)
    expect([rate(1), source(1)]).toEqual(['×0.8', 'Own rate'])
    expect(source(2)).toBe('Group default × discount')
    expect(w.vm.dirty).toBe(true)

    const answer = [setting(1, 'public', { rate_override: '0.8', rate: { value: '0.8', source: 'segment', group_default: '1.2', discount: '0.9' } }), setting(2, 'restricted', { granted: true, accessible: true })]
    mocks.put.mockResolvedValue(answer)
    expect(await w.vm.save()).toBe(true)
    expect(mocks.put).toHaveBeenCalledWith('/segments/2/groups', {
      items: [
        { group_id: 1, rate_override: '0.8' },
        { group_id: 2, granted: true }
      ]
    })
    await flushPromises()
    expect(w.vm.dirty).toBe(false)
    expect(w.find('[data-testid="access-rate-unsaved"]').exists()).toBe(false)
  })

  it('sends nothing without a change, and refuses a rate that is not one', async () => {
    const { w, row } = await render({ segmentId: 2, editable: true })
    expect(await w.vm.save()).toBe(true)
    await row(1).get('[data-testid="rate-override-input"]').setValue('abc')
    expect(await w.vm.save()).toBe(false)
    expect(mocks.put).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('g1'), 'error')
  })

  it('keeps the drafts when saving fails', async () => {
    const { w, row } = await render({ segmentId: 2, editable: true })
    await row(1).get('[data-testid="rate-override-input"]').setValue('0.8')
    mocks.put.mockRejectedValue(new Error('down'))
    await expect(w.vm.save()).rejects.toThrow('down')
    expect(w.vm.dirty).toBe(true)
  })

  it('opens the model prices of a row, and says their count changed once they are saved', async () => {
    const { w, row } = await render({ segmentId: 2, editable: true })
    expect(row(1).get('[data-testid="access-rate-prices"]').text()).toBe('Set')
    await row(1).get('[data-testid="access-rate-prices"]').trigger('click')
    const modal = w.get('[data-testid="prices-modal"]')
    expect([modal.attributes('data-open'), modal.attributes('data-editable')]).toEqual(['true', 'true'])
    mocks.get.mockClear()
    await modal.trigger('click')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/segments/2/groups')
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('leaves the model prices to a caller who may read groups, and their editing to one who may manage them', async () => {
    mocks.denied.add('group:manage')
    const readOnly = await render({ segmentId: 2, editable: true })
    expect(readOnly.row(1).get('[data-testid="access-rate-prices"]').text()).toBe('View')
    // The grants and rates are the segment's: still edited.
    expect(readOnly.row(1).find('[data-testid="rate-override-input"]').exists()).toBe(true)
    await readOnly.row(1).get('[data-testid="access-rate-prices"]').trigger('click')
    expect(readOnly.w.get('[data-testid="prices-modal"]').attributes('data-editable')).toBe('false')

    mocks.denied.add('group:read')
    const blind = await render({ segmentId: 2, editable: true })
    expect(blind.w.findAll('thead th').map((th) => th.text())).toEqual(['Group', 'Access', 'Own rate', 'Effective rate'])
    expect(blind.w.find('[data-testid="access-rate-prices"]').exists()).toBe(false)
    expect(blind.w.find('[data-testid="prices-modal"]').exists()).toBe(false)
  })

  it('holds its fields still while the parent saves', async () => {
    const { w, row } = await render({ segmentId: 2, editable: true, discount: '0.9' })
    await w.setProps({ disabled: true })
    expect(row(1).get('[data-testid="rate-override-input"]').attributes('disabled')).toBeDefined()
    expect(row(2).get('[data-testid="access-rate-grant"]').html()).toContain('disabled')
  })
})
