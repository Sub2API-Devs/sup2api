import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import STooltip from './STooltip.vue'
import { pinViewport } from './internal/pinViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const tip = () => document.querySelector('[role="tooltip"]')

function touchTip(slot: () => ReturnType<typeof h>) {
  return mount(
    pinViewport({ touch: true }, () => h(STooltip, { content: 'Explains' }, slot)),
    { attachTo: document.body }
  )
}

describe('STooltip on touch screens', () => {
  it('toggles on a tap of a plain trigger and hides on an outside tap', async () => {
    const w = touchTip(() => h('span', { class: 'label' }, 'Quota'))
    await w.get('.label').trigger('click')
    await flushPromises()
    expect(tip()?.textContent).toContain('Explains')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(tip()).toBeNull()
    await w.get('.label').trigger('click')
    await w.get('.label').trigger('click')
    expect(tip()).toBeNull()
  })

  it('hides by itself after 4 seconds and ignores the emulated hover', async () => {
    vi.useFakeTimers()
    const w = touchTip(() => h('span', { class: 'label' }, 'Quota'))
    await w.trigger('mouseenter')
    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(tip()).toBeNull()
    await w.get('.label').trigger('click')
    expect(tip()).not.toBeNull()
    vi.advanceTimersByTime(4000)
    await flushPromises()
    expect(tip()).toBeNull()
  })

  it('leaves the tap of an interactive trigger alone', async () => {
    const w = touchTip(() => h('button', { class: 'go' }, 'Go'))
    await w.get('.go').trigger('click')
    expect(tip()).toBeNull()
  })

  it('keeps the box narrower than the screen', async () => {
    const w = touchTip(() => h('span', { class: 'label' }, 'Quota'))
    await w.get('.label').trigger('click')
    expect((tip() as HTMLElement).style.maxWidth).toBe('min(20rem, calc(100vw - 16px))')
  })
})
