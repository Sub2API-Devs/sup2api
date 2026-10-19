import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ModelTagSelect from './ModelTagSelect.vue'

function render(modelValue: string[] = ['claude-opus-5-5']) {
  return mount(ModelTagSelect, {
    props: { modelValue, options: ['claude-haiku-4-5', 'claude-opus-5-5', 'claude-sonnet-4-6'], mapping: { 'claude-opus-5-5': 'claude-opus-5' } },
    global: { plugins: [i18n] },
  })
}
const last = (w: ReturnType<typeof render>) => w.emitted('update:modelValue')!.at(-1)![0]

describe('model tag select', () => {
  it('shows chips with mapping targets and suggests matching models', async () => {
    const w = render()
    expect(w.get('[data-testid="model-chip"]').text()).toContain('claude-opus-5-5 → claude-opus-5')
    const input = w.get('[data-testid="models-input"]')
    await input.trigger('focus')
    await input.setValue('sonnet')
    const items = w.findAll('[role="option"]')
    expect(items.map((i) => i.text())).toEqual(['claude-sonnet-4-6'])
    await items[0].trigger('mousedown')
    expect(last(w)).toEqual(['claude-opus-5-5', 'claude-sonnet-4-6'])
  })
  it('adds typed and pasted ids, refuses wildcards, removes with backspace', async () => {
    const w = render()
    const input = w.get('[data-testid="models-input"]')
    await input.setValue('my-model')
    await input.trigger('keydown', { key: 'Enter' })
    expect(last(w)).toEqual(['claude-opus-5-5', 'my-model'])
    await input.trigger('paste', { clipboardData: { getData: () => 'a-1, b-2\nc-3' } })
    expect(last(w)).toEqual(['claude-opus-5-5', 'a-1', 'b-2', 'c-3'])
    await input.setValue('claude-*')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('invalid')![0]).toEqual(['claude-*'])
    await input.setValue('')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(last(w)).toEqual([])
  })
})
