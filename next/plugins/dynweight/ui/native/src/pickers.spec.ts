import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { PluginHost } from '@sub2api/host'
import { SFormModal } from '@sub2api/ui'
import ConfigAccountModal from './ConfigAccountModal.vue'
import KeyFilters from './KeyFilters.vue'
import type { Draft } from './configView'
import { emptyFilter, modelCandidates, setHost } from './host'

// The account / group / model pickers are the core's entity picker, taken
// from host.components: stood in for here by a component with its contract
// (kind, v-model:id as a string, '' = none, extra candidates).
const EntityPicker = defineComponent({
  props: { kind: String, id: String, extra: Array },
  emits: ['update:id'],
  render: () => h('div')
})

beforeEach(() => {
  setHost({
    t: (key: string) => key,
    components: { EntityPicker },
    // The catalog's group names: none known.
    api: { list: async () => ({ items: [], total: 0 }) }
  } as unknown as PluginHost)
})
afterEach(() => setHost(null))
enableAutoUnmount(afterEach)

describe('modelCandidates', () => {
  it('lists each model of the rows once, without the empty one', () => {
    expect(modelCandidates([{ model: 'b' }, { model: 'a' }, { model: 'b' }, { model: '' }])).toEqual([
      { id: 'b', name: 'b' },
      { id: 'a', name: 'a' }
    ])
  })
})

describe('KeyFilters', () => {
  it('picks the account, group and model of the filter as ids, an empty id for none', async () => {
    const filter = reactive({ ...emptyFilter(), group_id: '2' })
    const models = [{ id: 'm-1', name: 'm-1' }]
    const w = mount(KeyFilters, { props: { modelValue: filter, models } })
    const pickers = w.findAllComponents(EntityPicker)
    expect(pickers.map(p => [p.props('kind'), p.props('id')])).toEqual([
      ['account', ''],
      ['group', '2'],
      ['model', '']
    ])
    expect(pickers[2].props('extra')).toEqual(models)

    pickers[0].vm.$emit('update:id', '12')
    pickers[1].vm.$emit('update:id', '')
    pickers[2].vm.$emit('update:id', 'm-1')
    expect(filter).toEqual({ account_id: '12', group_id: '', model: 'm-1' })

    // Picking does not search: the form's submit does.
    expect(w.emitted('search')).toBeUndefined()
    await w.find('form').trigger('submit')
    expect(w.emitted('search')).toHaveLength(1)
  })
})

describe('ConfigAccountModal', () => {
  const draft = { accounts: { '13': { enabled: false } }, groups: {} } as unknown as Draft

  function opened() {
    const save = vi.fn(async () => ({ saved: true }))
    const w = mount(ConfigAccountModal, { attachTo: document.body, props: { target: '', draft, accountGroups: {}, save } })
    const pick = async (id: string) => {
      w.findComponent(EntityPicker).vm.$emit('update:id', id)
      await flushPromises()
    }
    const submit = async () => {
      w.findComponent(SFormModal).vm.$emit('submit')
      await flushPromises()
    }
    return { w, save, pick, submit }
  }
  /** The dialog is teleported: its switches are read from the page. */
  const switches = () => [...document.body.querySelectorAll<HTMLInputElement>('input[role="switch"]')]

  it('refuses an account that has an override already', async () => {
    const { w, save, pick, submit } = opened()
    await pick('13')
    expect(document.body.textContent).toContain('cfg.accountModal.taken')
    expect(w.findComponent(SFormModal).props('submitDisabled')).toBe(true)
    expect(switches().every(s => s.disabled)).toBe(true)
    await submit()
    expect(save).not.toHaveBeenCalled()
  })

  it('saves the override of the picked account under its id', async () => {
    const { w, save, pick, submit } = opened()
    await pick('12')
    expect(w.emitted('pick')).toEqual([['12']])
    expect(document.body.textContent).not.toContain('cfg.accountModal.taken')
    // "Override" of the adjustment switch: the new override turns adjusting off.
    switches()[0].click()
    await flushPromises()
    await submit()
    expect(save).toHaveBeenCalledWith('12', { enabled: false })
    expect(w.emitted('close')).toHaveLength(1)
  })
})
