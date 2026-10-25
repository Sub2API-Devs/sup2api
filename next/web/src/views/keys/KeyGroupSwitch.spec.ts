import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SDropdown } from '@sub2api/ui'
import { i18n } from '@/i18n'
import KeyGroupSwitch from './KeyGroupSwitch.vue'

const options = [{ value: 1, label: 'default' }, { value: 2, label: 'vip' }]
const render = (props = {}) => mount(KeyGroupSwitch, { props: { groupId: 1, options, ...props }, slots: { default: 'default' }, global: { plugins: [i18n] } })

describe('API key group switch', () => {
  it('lists the usable groups with the current one checked and emits only a different one', () => {
    const w = render()
    const menu = w.findComponent(SDropdown)
    expect(menu.props('actions')).toEqual([
      { key: '1', label: 'default', checked: true },
      { key: '2', label: 'vip', checked: false }
    ])
    menu.vm.$emit('select', '1')
    menu.vm.$emit('select', '2')
    expect(w.emitted('change')).toEqual([[2]])
  })
  it('is disabled while the key updates or without groups', () => {
    expect(render({ disabled: true }).get('button').attributes('disabled')).toBeDefined()
    expect(render({ options: [] }).get('button').attributes('disabled')).toBeDefined()
  })
})
