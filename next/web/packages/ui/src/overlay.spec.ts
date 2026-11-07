import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import SModal from './SModal.vue'
import SDrawer from './SDrawer.vue'
import { mountPinned } from './testViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function modal(pin: { compact?: boolean; touch?: boolean }, props: Record<string, unknown> = {}) {
  const open = ref(true)
  const onClose = vi.fn()
  const w = mountPinned(
    () =>
      h(SModal, { open: open.value, title: 'T', ...props, 'onUpdate:open': (v: boolean) => (open.value = v), onClose }, () => h('input')),
    {},
    pin
  )
  return { w, open, onClose }
}

describe('visual viewport', () => {
  function stubViewport() {
    const vv = Object.assign(new EventTarget(), { height: 500, offsetTop: 0 })
    vi.stubGlobal('visualViewport', vv)
    return vv
  }

  it('is kept in --s-vvh / --s-vvt while a layer is open on a phone', async () => {
    const vv = stubViewport()
    const { open } = modal({ compact: true })
    await flushPromises()
    const root = document.documentElement.style
    expect(root.getPropertyValue('--s-vvh')).toBe('500px')
    vv.height = 320
    vv.offsetTop = 120
    vv.dispatchEvent(new Event('resize'))
    expect(root.getPropertyValue('--s-vvh')).toBe('320px')
    expect(root.getPropertyValue('--s-vvt')).toBe('120px')
    open.value = false
    await flushPromises()
    expect(root.getPropertyValue('--s-vvh')).toBe('')
    expect(root.getPropertyValue('--s-vvt')).toBe('')
  })

  it('is not tracked with a mouse on a wide screen', async () => {
    stubViewport()
    modal({ compact: false, touch: false })
    await flushPromises()
    expect(document.documentElement.style.getPropertyValue('--s-vvh')).toBe('')
  })
})

describe('sheet swipe', () => {
  function sheet(props: Record<string, unknown> = {}) {
    return mount(SDrawer, {
      props: { open: true, side: 'bottom', title: 'S', ...props },
      slots: { default: () => h('p', 'body') },
      attachTo: document.body
    })
  }
  function drag(el: Element, dy: number) {
    el.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, button: 0, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointermove', { clientY: 100 + dy, bubbles: true }))
    el.dispatchEvent(new PointerEvent('pointerup', { clientY: 100 + dy, bubbles: true }))
  }

  it('closes on a swipe down from the header, not from its buttons', async () => {
    const w = sheet()
    await nextTick()
    drag(document.querySelector('[data-overlay-close]')!, 300)
    expect(w.emitted('update:open')).toBeUndefined()
    drag(document.querySelector('h3')!, 300)
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('stays when persistent or when the body is scrolled', async () => {
    const p = sheet({ persistent: true })
    await nextTick()
    drag(document.querySelector('h3')!, 300)
    expect(p.emitted('update:open')).toBeUndefined()
    p.unmount()
    const s = sheet()
    await nextTick()
    document.querySelector('p')!.parentElement!.scrollTop = 40
    drag(document.querySelector('h3')!, 300)
    expect(s.emitted('update:open')).toBeUndefined()
  })
})
