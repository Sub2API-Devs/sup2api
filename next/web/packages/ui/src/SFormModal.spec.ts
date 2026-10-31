import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SFormModal from './SFormModal.vue'

const render = (props: Record<string, unknown> = {}) =>
  mount(SFormModal, {
    props: { open: true, title: 'Edit', ...props } as never,
    attrs: { 'data-testid': 'the-form' },
    slots: { default: () => h('input', { name: 'n' }) },
    global: { stubs: { Teleport: true } }
  })

describe('SFormModal', () => {
  it('wraps the fields in a form whose Save and Enter both emit submit', async () => {
    const w = render()
    const form = w.get('form[data-testid="the-form"]')
    expect(form.find('input[name="n"]').exists()).toBe(true)
    await form.trigger('submit')
    const buttons = w.findAll('.modal-footer button')
    expect(buttons.map((b) => b.text())).toEqual(['Cancel', 'Save'])
    await buttons[1].trigger('click')
    expect(w.emitted('submit')).toHaveLength(2)
    await buttons[0].trigger('click')
    expect(w.emitted('update:open')?.[0]).toEqual([false])
  })

  it('does not submit or close while loading, nor submit when disabled', async () => {
    const w = render({ loading: true })
    await w.get('form').trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.find('[data-overlay-close]').exists()).toBe(false)
    const d = render({ submitDisabled: true, submitText: 'Apply', submitVariant: 'danger', submitAttrs: { 'data-testid': 'go' } })
    expect(d.get('[data-testid="go"]').text()).toBe('Apply')
    expect(d.get('[data-testid="go"]').classes()).toContain('btn-danger')
    await d.get('form').trigger('submit')
    expect(d.emitted('submit')).toBeUndefined()
  })

  it('readonly shows only a Close button', () => {
    const w = render({ readonly: true })
    expect(w.findAll('.modal-footer button').map((b) => b.text())).toEqual(['Close'])
  })
})
