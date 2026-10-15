import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { navIndex } from './keyboard'
import { displayValue, getPath, isBlank } from './value'
import SSelect from './SSelect.vue'
import SKeyValue from './SKeyValue.vue'
import SField from './SField.vue'
import STimeRange from './STimeRange.vue'
import SSegmented from './SSegmented.vue'
import SChoiceCards from './SChoiceCards.vue'
import SStatCard from './SStatCard.vue'
import SStatusDot from './SStatusDot.vue'
import SSettingRow from './SSettingRow.vue'

enableAutoUnmount(afterEach)

describe('navIndex', () => {
  it('steps and wraps along its orientation, jumps to the ends', () => {
    expect(navIndex('ArrowRight', 2, 3, 'horizontal')).toBe(0)
    expect(navIndex('ArrowLeft', 0, 3, 'horizontal')).toBe(2)
    expect(navIndex('ArrowDown', -1, 3, 'vertical')).toBe(0)
    expect(navIndex('ArrowUp', -1, 3, 'vertical')).toBe(2)
    expect(navIndex('End', 0, 3, 'vertical')).toBe(2)
    expect(navIndex('Home', 2, 3, 'horizontal')).toBe(0)
    expect(navIndex('ArrowDown', 0, 3, 'horizontal')).toBe(-1)
    expect(navIndex('ArrowRight', 0, 0, 'horizontal')).toBe(-1)
  })
})

describe('value helpers', () => {
  it('formats blank and object values and reads dotted paths', () => {
    expect(isBlank([])).toBe(true)
    expect(isBlank(0)).toBe(false)
    expect(displayValue(null)).toBe('—')
    expect(displayValue([])).toBe('[]')
    expect(displayValue({ a: 1 })).toBe('{"a":1}')
    expect(getPath({ a: { b: [5] } }, 'a.b.0')).toBe(5)
    expect(getPath({ a: null }, 'a.b')).toBeUndefined()
  })
})

describe('library components under shallowMount (console specs)', () => {
  it('a detached searchable SSelect renders its list inline', async () => {
    const options = [{ label: 'en-US', value: 'en-US' }, { label: 'zh-CN', value: 'zh-CN' }]
    const Host = defineComponent({ render: () => h('div', [h(SSelect, { modelValue: 'en-US', options, searchable: true })]) })
    const w = shallowMount(Host, { global: { stubs: { SSelect: false } } })
    const input = w.get('input')
    await input.trigger('focus')
    await input.setValue('zh')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['zh-CN'])
  })
})

describe('frame integration', () => {
  it('SKeyValue follows the frame error and size', () => {
    const w = mount(SField, { props: { label: 'Headers', error: 'Bad', size: 'sm' }, slots: { default: () => h(SKeyValue, { modelValue: { a: 'b' } }) } })
    const inputs = w.findAll('input')
    expect(inputs).toHaveLength(2)
    for (const i of inputs) {
      expect(i.classes()).toContain('input-error')
      expect(i.classes()).toContain('input-sm')
    }
    expect(w.get('[role="group"]').attributes('aria-labelledby')).toBe(w.get('label').attributes('id'))
  })

  it('STimeRange labels its controls (or names them without labels)', async () => {
    const w = mount(STimeRange, { props: { range: 'custom', from: '', to: '' } })
    await flushPromises()
    for (const label of w.findAll('label')) {
      const id = label.attributes('for')
      expect(id).toBeTruthy()
      expect(w.find(`#${CSS.escape(id!)}`).exists()).toBe(true)
    }
    const bare = mount(STimeRange, { props: { range: 'custom', from: '', to: '', label: false } })
    expect(bare.findAll('label')).toHaveLength(0)
    expect(bare.findAll('input').map((i) => i.attributes('aria-label'))).toEqual(['From', 'To'])
  })
})

describe('controlled group inputs', () => {
  it('SSegmented and SChoiceCards write the kept value back to the DOM', async () => {
    const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    for (const comp of [SSegmented, SChoiceCards]) {
      const w = mount(comp as any, { props: { modelValue: 'a', options } })
      const radios = w.findAll('input')
      await radios[1].setValue(true)
      await flushPromises()
      expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
      expect((radios[0].element as HTMLInputElement).checked).toBe(true)
      expect((radios[1].element as HTMLInputElement).checked).toBe(false)
    }
  })
})

describe('props added for console / plugin callers', () => {
  it('SStatCard renders a link with href, SStatusDot xs uses small text, SSettingRow flush drops padding', () => {
    const card = mount(SStatCard, { props: { label: 'Blocked', value: 3, href: '/x' } })
    expect(card.element.tagName).toBe('A')
    expect(card.attributes('href')).toBe('/x')
    expect(card.attributes('aria-pressed')).toBeUndefined()
    expect(mount(SStatusDot, { props: { size: 'xs', label: 'On' } }).classes()).toContain('text-xs')
    const row = mount(SSettingRow, { props: { label: 'A', dense: true, flush: true } })
    expect(row.classes()).not.toContain('py-2.5')
  })
})
