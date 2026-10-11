import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import SSelect from './SSelect.vue'

enableAutoUnmount(afterEach)
const options = [{ label: 'en-US · English', value: 'en-US' }, { label: 'zh-CN · 中文', value: 'zh-CN' }]

describe('searchable select', () => {
  it('filters case-insensitively without accepting arbitrary text', async () => {
    const w = mount(SSelect, { props: { modelValue: 'en-US', options, searchable: true } })
    const input = w.get('input[role="combobox"]')
    await input.trigger('focus')
    await input.setValue('ZH')
    expect(w.findAll('[role="option"]').map(o => o.text())).toEqual(['zh-CN · 中文'])
    expect(w.emitted('update:modelValue')).toBeUndefined()
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')).toEqual([['zh-CN']])
  })

  it('restores the selected label when a search is dismissed', async () => {
    const w = mount(SSelect, { props: { modelValue: 'en-US', options, searchable: true, noResults: 'No matches' } })
    const input = w.get('input')
    await input.trigger('focus')
    await input.setValue('not-a-locale')
    expect(w.text()).toContain('No matches')
    await input.trigger('keydown', { key: 'Escape' })
    expect((input.element as HTMLInputElement).value).toBe('en-US · English')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('supports keyboard navigation, default selection and disabled options', async () => {
    const w = mount(SSelect, { props: { modelValue: 'en-US', options: [...options, { label: 'Disabled', value: 'no', disabled: true }], searchable: true, placeholder: 'Default' } })
    const input = w.get('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['zh-CN'])
    await input.trigger('focus')
    await w.get('[role="option"]').trigger('click')
    expect(w.emitted('update:modelValue')?.[1]).toEqual([null])
    await w.setProps({ disabled: true })
    expect(w.get('input').attributes('disabled')).toBeDefined()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('keeps the native select behavior by default', async () => {
    const w = mount(SSelect, { props: { modelValue: 'en-US', options } })
    await w.get('select').setValue('1')
    expect(w.emitted('update:modelValue')).toEqual([['zh-CN']])
  })
})
