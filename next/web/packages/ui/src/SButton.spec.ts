import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import SButton from './SButton.vue'
import { mountCompact } from './testViewport'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SButton fab', () => {
  it('floats as a round icon button on a phone, the text kept for screen readers', () => {
    const w = mountCompact(SButton, { fab: true, icon: 'plus', variant: 'primary' }, { default: () => 'New key' })
    expect(w.classes()).toEqual(expect.arrayContaining(['fixed', 'h-14', 'w-14', 'rounded-full']))
    expect(w.get('.sr-only').text()).toBe('New key')
  })

  it('is an ordinary button on a wide screen', () => {
    const w = mount(SButton, { props: { fab: true, icon: 'plus' }, slots: { default: () => 'New key' } })
    expect(w.classes()).not.toContain('fixed')
    expect(w.find('.sr-only').exists()).toBe(false)
    expect(w.text()).toBe('New key')
  })

  it('keeps the slot of a square fab visible', () => {
    const w = mountCompact(SButton, { fab: true, icon: 'plus', square: true }, { default: () => 'dot' })
    expect(w.find('.sr-only').exists()).toBe(false)
    expect(w.text()).toBe('dot')
  })
})
