import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RateOverrideField from './RateOverrideField.vue'

i18n.global.locale.value = 'en'

function render(modelValue: string | null, rate = { group_default: '1.2', discount: '0.9' }) {
  const w = mount(RateOverrideField, { props: { modelValue, rate }, global: { plugins: [i18n] } })
  return { w, input: w.get('[data-testid="rate-override-input"]'), source: () => w.get('[data-testid="rate-override-source"]').text() }
}

describe('rate override field', () => {
  it('follows the group default times the discount while empty', () => {
    const { w, input, source } = render(null)
    expect(input.attributes('placeholder')).toBe('Follows ×1.08')
    expect(source()).toBe('Group default ×1.2 × discount ×0.9')
    expect(w.vm.valid).toBe(true)
  })
  it('names the group default alone without a discount', () => {
    expect(render(null, { group_default: '1.2', discount: '1' }).source()).toBe('Group default ×1.2')
  })
  it('emits the typed rate, and null again once cleared', async () => {
    const { w, input } = render(null)
    await input.setValue(' 0.85 ')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['0.85'])
    await w.setProps({ modelValue: '0.85' })
    expect(w.get('[data-testid="rate-override-source"]').text()).toBe('Own rate, no longer follows ×1.08')
    await w.get('button').trigger('click')
    expect(w.emitted('update:modelValue')?.[1]).toEqual([null])
  })
  it('marks a value that is not a rate', () => {
    const { w, input, source } = render('abc')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(source()).toBe('Enter a number of 0 or more, up to 4 decimals')
    expect(w.vm.valid).toBe(false)
  })
})
