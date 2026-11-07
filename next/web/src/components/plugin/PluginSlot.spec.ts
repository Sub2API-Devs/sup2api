import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, markRaw } from 'vue'
import type { Account } from '@/api/types'
import PluginSlot from './PluginSlot.vue'

const mocks = vi.hoisted(() => ({ slotEntries: vi.fn() }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ slotEntries: mocks.slotEntries }) }))
enableAutoUnmount(afterEach)

const validateA = vi.fn()
const validateB = vi.fn()
const saveA = vi.fn()
const saveB = vi.fn()
/** A widget exposing the account.form.widgets lifecycle (CONTRACTS §23.3 UI 3.6). */
const widget = (validate: typeof validateA, save: typeof saveA) =>
  markRaw(
    defineComponent({
      props: { editing: Boolean },
      setup(props, { expose }) {
        expose({ validate, save })
        return () => h('span', props.editing ? 'edit' : 'new')
      }
    })
  )
/** An old widget without the lifecycle. */
const plain = markRaw(defineComponent({ render: () => h('i') }))
const account = { id: 3 } as Account

describe('PluginSlot validate / save aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.slotEntries.mockReturnValue([
      { pluginKey: 'a', name: 'WidgetA', component: widget(validateA, saveA) },
      { pluginKey: 'legacy', name: 'Plain', component: plain },
      { pluginKey: 'b', name: 'WidgetB', component: widget(validateB, saveB) }
    ])
    validateA.mockResolvedValue(null)
    validateB.mockResolvedValue(null)
    saveA.mockResolvedValue(undefined)
    saveB.mockResolvedValue(undefined)
  })
  const render = () => mount(PluginSlot, { props: { name: 'account.form.widgets', props: { editing: true } } })

  it('passes the props on and returns the first widget error in slot order', async () => {
    const w = render()
    expect(w.text()).toBe('editedit')
    expect(w.findAll('[data-plugin-slot]').map((el) => el.attributes('data-plugin-slot'))).toEqual(['a:WidgetA', 'legacy:Plain', 'b:WidgetB'])
    expect(await w.vm.validate()).toBeNull()
    validateB.mockResolvedValue('b failed')
    expect(await w.vm.validate()).toBe('b failed')
    validateA.mockResolvedValue('a failed')
    expect(await w.vm.validate()).toBe('a failed')
    expect(validateB).toHaveBeenCalledTimes(2)
  })

  it('saves every widget and collects the failures instead of throwing', async () => {
    const w = render()
    const error = new Error('conflict')
    saveA.mockRejectedValue(error)
    expect(await w.vm.save(account)).toEqual([{ pluginKey: 'a', error }])
    expect(saveA).toHaveBeenCalledWith(account)
    expect(saveB).toHaveBeenCalledWith(account)
    saveA.mockResolvedValue(undefined)
    expect(await w.vm.save(account)).toEqual([])
  })
})
