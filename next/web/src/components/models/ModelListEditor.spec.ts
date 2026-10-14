import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ModelListEditor from './ModelListEditor.vue'

function render() {
  return mount(ModelListEditor, {
    props: { modelValue: ['claude-opus-5-5', 'claude-sonnet-4-6'], options: ['claude-haiku-4-5', 'claude-opus-5-5'], mapping: { 'claude-opus-5-5': 'claude-opus-5' } },
    global: { plugins: [i18n] },
  })
}
describe('account model selection', () => {
  it('shows selected models and mapping targets; searches without changing the selection', async () => {
    const w = render()
    expect(w.text()).toContain('claude-opus-5')
    expect(w.find('input[aria-label="claude-haiku-4-5"]').exists()).toBe(false)
    await w.get('[data-testid="models-search"]').setValue('OPUS')
    expect(w.find('input[aria-label="claude-sonnet-4-6"]').exists()).toBe(false)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('adds catalog models once and keeps existing selections', async () => {
    const w = render()
    await w.get('[data-testid="models-browse"]').trigger('click')
    await w.get('input[aria-label="claude-haiku-4-5"]').setValue(true)
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['claude-opus-5-5', 'claude-sonnet-4-6', 'claude-haiku-4-5']])
    expect(w.findAll('input[aria-label="claude-opus-5-5"]')).toHaveLength(1)
  })
  it('removes only filtered models when deselecting a category', async () => {
    const w = render()
    await w.get('[data-testid="models-search"]').setValue('opus')
    await w.get('[data-testid="models-select-visible"]').setValue(false)
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['claude-sonnet-4-6']])
  })
})
