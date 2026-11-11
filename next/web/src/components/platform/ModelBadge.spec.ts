import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelBadge from './ModelBadge.vue'
import { modelBrand } from './brands'

const render = (model: string, plain = false) => mount(ModelBadge, { props: { model, plain } })

describe('model badge', () => {
  it('shows the name with its vendor mark, tinted in the vendor colour', () => {
    const w = render('claude-sonnet-4-5')
    expect(w.get('.truncate').text()).toBe('claude-sonnet-4-5')
    expect(w.get('[data-brand]').attributes('data-brand')).toBe('anthropic')
    expect(w.classes()).toContain('brand-tint')
    expect(w.attributes('style')).toContain(modelBrand('claude-sonnet-4-5').color)
  })
  it('keeps the mark and drops the tint when plain', () => {
    const w = render('gpt-4o', true)
    expect(w.get('[data-brand]').attributes('data-brand')).toBe('openai')
    expect(w.classes()).not.toContain('brand-tint')
    expect(w.attributes('style')).toBeUndefined()
  })
  it('gives a model of no known family its first letter as the mark', () => {
    const mark = render('zeta-large').get('[data-brand]')
    expect(mark.attributes('data-brand')).toBe('zeta-large')
    expect(mark.text()).toBe('Z')
  })
  it('cuts a long name to its place and keeps the whole of it in the tooltip', () => {
    const model = 'vendor/some-extremely-long-model-name-with-a-date-2026-10-05-preview'
    const w = render(model)
    expect(w.get('.truncate').text()).toBe(model)
    expect(w.attributes('title')).toBe(model)
    // One tooltip for the whole badge: nothing inside it answers the pointer first.
    expect(w.find('[title] [title]').exists()).toBe(false)
  })
  it("shows the caller's tooltip instead when given one", () => {
    const w = mount(ModelBadge, { props: { model: 'claude-opus-5-5' }, attrs: { title: 'claude-opus-5-5 → claude-opus-5-5-20261001' } })
    expect(w.attributes('title')).toBe('claude-opus-5-5 → claude-opus-5-5-20261001')
    expect(w.findAll('[title]')).toHaveLength(1)
  })
})
