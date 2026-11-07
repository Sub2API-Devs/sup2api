import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SSelect from './SSelect.vue'
import type { SelectOption } from './types'
import { mountPinned } from './testViewport'

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

describe('searchable select on phones', () => {
  const grouped: SelectOption[] = [{ label: 'Europe', value: null, options: [{ label: 'Paris', value: 'par' }, { label: 'Berlin', value: 'ber' }] }, { label: 'Tokyo', value: 'tyo' }]

  it('opens a bottom sheet with a search field and large checked rows', async () => {
    const picked: unknown[] = []
    const w = mountPinned(() =>
      h(SSelect, { modelValue: 'ber', options: grouped, searchable: true, 'onUpdate:modelValue': (v: unknown) => picked.push(v) })
    )
    const trigger = w.get('input')
    expect(trigger.attributes('readonly')).toBeDefined()
    await trigger.trigger('focus')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await trigger.trigger('click')
    await flushPromises()
    const sheet = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(sheet.className).toContain('h-[calc(var(--s-vvh,100dvh)*0.92)]')
    const search = sheet.querySelector<HTMLInputElement>('input[role="combobox"]')!
    expect(document.activeElement).toBe(search)
    expect(sheet.querySelector('[role="presentation"]')!.textContent).toContain('Europe')
    const rows = Array.from(sheet.querySelectorAll<HTMLElement>('[role="option"]'))
    expect(rows.every((r) => r.classList.contains('min-h-11'))).toBe(true)
    expect(rows[1].querySelector('svg')).not.toBeNull()
    expect(rows[0].querySelector('svg')).toBeNull()
    search.value = 'tok'
    search.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(Array.from(sheet.querySelectorAll('[role="option"]')).map((o) => o.textContent?.trim())).toEqual(['Tokyo'])
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(picked).toEqual(['tyo'])
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('leaves the native select alone', () => {
    const w = mountPinned(() => h(SSelect, { modelValue: 'en-US', options }))
    expect(w.find('select').exists()).toBe(true)
  })
})
