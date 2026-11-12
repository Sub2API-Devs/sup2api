import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, type Component, type SetupContext } from 'vue'
import { i18n } from '@/i18n'
import type { SegmentGroupSetting } from '@/api/pricing'
import SegmentGroupPricesModal from '@/components/pricing/SegmentGroupPricesModal.vue'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), confirm: vi.fn() }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), toast: (...a: unknown[]) => mocks.toast(...a), confirm: (...a: unknown[]) => mocks.confirm(...a) }))
enableAutoUnmount(afterEach)

/** The price table: whether it has drafts and what saving them answers. */
const table = { dirty: false, save: vi.fn() }
const priceTable: Component = {
  props: ['groupId', 'segment', 'editable'],
  setup(props: { editable?: boolean }, { expose }: SetupContext) {
    expose({ save: () => table.save(), get dirty() { return table.dirty } })
    return () => h('div', { 'data-testid': 'table', 'data-editable': String(!!props.editable) })
  }
}

const setting: SegmentGroupSetting = {
  segment: { id: 2, kind: 'named', name: 'VIP' },
  group: { id: 3, name: 'pro', description: '', status: 'active', visibility: 'restricted', rate_multiplier: '1.2' },
  accessible: true,
  granted: true,
  rate_override: null,
  rate: { value: '1.08', source: 'discount', group_default: '1.2', discount: '0.9' },
  price_rule_count: 1
}

async function render(editable = true) {
  const w = mount(SegmentGroupPricesModal, { props: { open: true, setting, editable }, global: { plugins: [i18n], stubs: { Teleport: true, ModelPriceTable: priceTable } } })
  await flushPromises()
  const click = async (id: string) => {
    await w.get(`[data-testid="${id}"]`).trigger('click')
    await flushPromises()
  }
  return { w, click }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  table.dirty = false
  table.save.mockReset().mockResolvedValue(true)
  mocks.toast.mockReset()
  mocks.confirm.mockReset().mockResolvedValue(false)
})

describe('the model prices of a user group in a group', () => {
  it('names whose prices in which group, at the rate they pay', async () => {
    const { w } = await render()
    expect(w.text()).toContain('「VIP」在 pro 的模型专属价')
    expect(w.text()).toContain('×1.08')
  })

  it('saves its drafts on its own and tells the opener', async () => {
    table.dirty = true
    const { w, click } = await render()
    await click('segment-prices-save')
    expect(table.save).toHaveBeenCalledTimes(1)
    expect(mocks.toast).toHaveBeenCalledWith('已保存', 'success')
    expect(w.emitted('saved')).toHaveLength(1)
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('closes on Save without a change, and stays open on a draft that is not filled in or a failed save', async () => {
    const plain = await render()
    await plain.click('segment-prices-save')
    expect(table.save).not.toHaveBeenCalled()
    expect(plain.w.emitted('update:open')).toEqual([[false]])

    table.dirty = true
    table.save.mockResolvedValue(false)
    const incomplete = await render()
    await incomplete.click('segment-prices-save')
    expect(incomplete.w.emitted('saved')).toBeUndefined()
    expect(incomplete.w.emitted('update:open')).toBeUndefined()

    table.save.mockRejectedValue(new Error('down'))
    const failed = await render()
    await failed.click('segment-prices-save')
    expect(mocks.toast).toHaveBeenCalledWith('down', 'error')
    expect(failed.w.emitted('update:open')).toBeUndefined()
  })

  it('asks before Cancel or × drop drafts, and closes at once without any', async () => {
    const plain = await render()
    await plain.click('segment-prices-cancel')
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(plain.w.emitted('update:open')).toEqual([[false]])

    table.dirty = true
    const { w, click } = await render()
    await click('segment-prices-cancel')
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '放弃未保存的改动？' }))
    expect(w.emitted('update:open')).toBeUndefined()

    mocks.confirm.mockResolvedValue(true)
    await w.get('[data-overlay-close]').trigger('click')
    await flushPromises()
    expect(w.emitted('update:open')).toEqual([[false]])
    expect(table.save).not.toHaveBeenCalled()
  })

  it('only shows the prices to a caller who may not set them', async () => {
    const { w, click } = await render(false)
    expect(w.get('[data-testid="table"]').attributes('data-editable')).toBe('false')
    expect(w.find('[data-testid="segment-prices-save"]').exists()).toBe(false)
    await click('segment-prices-close')
    expect(w.emitted('update:open')).toEqual([[false]])
  })
})
