import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SFormModal from './SFormModal.vue'
import { pinViewport } from './internal/pinViewport'

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
    expect(w.emitted('close')).toHaveLength(1)
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

  it('enterSubmit false ignores Enter but still submits on the button', async () => {
    const w = render({ enterSubmit: false })
    const form = w.get('form')
    expect(form.find('button[type="submit"]').exists()).toBe(false)
    await form.trigger('submit')
    expect(w.emitted('submit')).toBeUndefined()
    await w.findAll('.modal-footer button')[1].trigger('click')
    expect(w.emitted('submit')).toHaveLength(1)
  })

  it('on phones puts Cancel and Submit side by side under #footer-start', () => {
    const w = mount(
      pinViewport({ compact: true }, () =>
        h(SFormModal, { open: true, title: 'Edit' }, { default: () => h('input'), 'footer-start': () => h('span', { class: 'hint' }, 'Hint') })
      ),
      { global: { stubs: { Teleport: true } } }
    )
    expect(w.find('.s-drawer-bottom').exists()).toBe(true)
    const row = w.get('form').element.closest('[role="dialog"]')!.lastElementChild!.firstElementChild!
    expect(row.className).toContain('flex-wrap')
    expect(row.firstElementChild!.className).toContain('w-full')
    expect(row.firstElementChild!.textContent).toBe('Hint')
    const buttons = Array.from(row.querySelectorAll('button'))
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Save'])
    expect(buttons.every((b) => b.classList.contains('flex-1') && b.classList.contains('h-11'))).toBe(true)
  })
})
