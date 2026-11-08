import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SlotEntry } from '@/stores/plugins'
import PluginSlot from './PluginSlot.vue'

const mocks = vi.hoisted(() => ({ slotEntries: vi.fn((_slot: string) => [] as SlotEntry[]) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ slotEntries: mocks.slotEntries }) }))

/** A plugin component that shows the props it was given. */
const Shows = defineComponent({ props: { ids: { type: Array, default: null }, label: { type: String, default: '' } }, setup: (props) => () => h('i', `${props.label}:${props.ids ? props.ids.join('+') : 'none'}`) })
const entries: SlotEntry[] = [{ pluginKey: 'a', name: 'Shows', component: Shows }, { pluginKey: 'b', name: 'Shows', component: Shows }]

describe('PluginSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.slotEntries.mockReturnValue(entries)
  })

  it('hands the same props object to every component of the slot', () => {
    const w = mount(PluginSlot, { props: { name: 'account.list.toolbar', props: { ids: [1], label: 'shared' } } })
    expect(mocks.slotEntries).toHaveBeenCalledWith('account.list.toolbar')
    expect(w.findAll('i').map((x) => x.text())).toEqual(['shared:1', 'shared:1'])
    expect(w.findAll('[data-plugin-slot]').map((x) => x.attributes('data-plugin-slot'))).toEqual(['a:Shows', 'b:Shows'])
  })

  it('asks a props function for each entry, so plugins can get their own values', () => {
    const own: Record<string, number[]> = { a: [1, 2] }
    const w = mount(PluginSlot, { props: { name: 'account.list.toolbar', props: (e: SlotEntry) => ({ ids: own[e.pluginKey] ?? null, label: e.pluginKey }) } })
    expect(w.findAll('i').map((x) => x.text())).toEqual(['a:1+2', 'b:none'])
  })

  it('renders the components without props too', () => {
    const w = mount(PluginSlot, { props: { name: 'dashboard.widgets' } })
    expect(w.findAll('i').map((x) => x.text())).toEqual([':none', ':none'])
  })
})
