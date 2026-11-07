import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SSegmented from './SSegmented.vue'

afterEach(() => vi.restoreAllMocks())

describe('SSegmented', () => {
  const options = [{ value: 'a', label: 'A' }, { value: 1, label: 'One' }, { value: 'off', label: 'Off', disabled: true }]

  it('checks the current option and emits the chosen value with its type', async () => {
    const w = mount(SSegmented, { props: { modelValue: 'a', options, ariaLabel: 'Pick' }, attrs: { 'data-testid': 'seg' } })
    expect(w.attributes('data-testid')).toBe('seg')
    expect(w.attributes('role')).toBe('radiogroup')
    const inputs = w.findAll('input')
    expect(inputs.map(i => (i.element as HTMLInputElement).checked)).toEqual([true, false, false])
    expect(new Set(inputs.map(i => i.attributes('name'))).size).toBe(1)
    await w.get('input[value="1"]').setValue(true)
    expect(w.emitted('update:modelValue')).toEqual([[1]])
    expect(w.get('input[value="off"]').attributes('disabled')).toBeDefined()
  })

  it('disables every option', () => {
    const w = mount(SSegmented, { props: { modelValue: 'a', options, disabled: true } })
    expect(w.findAll('input').every(i => i.attributes('disabled') !== undefined)).toBe(true)
  })

  it('keeps the chosen option in the middle when the row scrolls', async () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const w = mount(SSegmented, { props: { modelValue: 'a', options } })
    Object.defineProperty(w.element, 'clientWidth', { value: 100 })
    Object.defineProperties(w.findAll('label')[1]!.element, { offsetLeft: { value: 120 }, offsetWidth: { value: 40 } })
    await w.setProps({ modelValue: 1 })
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 90, behavior: 'smooth' })
  })

  it('fades the edge that hides options', async () => {
    const w = mount(SSegmented, { props: { modelValue: 'a', options } })
    Object.defineProperties(w.element, { scrollWidth: { value: 300 }, clientWidth: { value: 100 } })
    w.element.dispatchEvent(new Event('scroll'))
    await w.vm.$nextTick()
    expect(w.element.className).toContain('[mask-image:linear-gradient(to_left')
  })
})
