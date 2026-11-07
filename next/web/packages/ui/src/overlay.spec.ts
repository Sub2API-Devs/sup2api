import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import SModal from './SModal.vue'
import SDrawer from './SDrawer.vue'
import { pinViewport } from './internal/pinViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function modal(pin: { compact?: boolean; touch?: boolean }, props: Record<string, unknown> = {}) {
  const open = ref(true)
  const onClose = vi.fn()
  const w = mount(
    pinViewport(pin, () =>
      h(SModal, { open: open.value, title: 'T', ...props, 'onUpdate:open': (v: boolean) => (open.value = v), onClose }, () => h('input'))
    ),
    { attachTo: document.body }
  )
  return { w, open, onClose }
}

describe('layer history on phones', () => {
  it('Back closes the topmost layer without the router seeing it', async () => {
    const before = history.length
    const { open } = modal({ compact: true })
    await flushPromises()
    expect(history.length).toBe(before + 1)
    expect(history.state?.sLayer).toBeTypeOf('number')
    const router = vi.fn()
    window.addEventListener('popstate', router)
    history.back()
    await vi.waitUntil(() => !open.value)
    expect(router).not.toHaveBeenCalled()
    window.removeEventListener('popstate', router)
  })

  it('removes its entry when closed another way, and stays open on Back while persistent', async () => {
    const { open } = modal({ touch: true })
    await flushPromises()
    const back = vi.spyOn(history, 'back')
    document.querySelector<HTMLButtonElement>('[data-overlay-close]')!.click()
    await flushPromises()
    expect(open.value).toBe(false)
    expect(back).toHaveBeenCalledTimes(1)
    await vi.waitUntil(() => history.state?.sLayer === undefined)

    const p = modal({ compact: true }, { persistent: true })
    await flushPromises()
    const id = history.state?.sLayer
    const push = vi.spyOn(history, 'pushState')
    history.back()
    await vi.waitUntil(() => push.mock.calls.length > 0)
    expect(p.open.value).toBe(true)
    expect(history.state?.sLayer).toBe(id)
  })

  it('takes no history entry with a mouse on a wide screen', async () => {
    const before = history.length
    modal({ compact: false, touch: false })
    await flushPromises()
    expect(history.length).toBe(before)
  })
})

describe('visual viewport height', () => {
  it('is kept in --s-vvh while a layer is open', async () => {
    const vv = Object.assign(new EventTarget(), { height: 500 })
    vi.stubGlobal('visualViewport', vv)
    const { open } = modal({ compact: false })
    await flushPromises()
    const root = document.documentElement.style
    expect(root.getPropertyValue('--s-vvh')).toBe('500px')
    vv.height = 320
    vv.dispatchEvent(new Event('resize'))
    expect(root.getPropertyValue('--s-vvh')).toBe('320px')
    open.value = false
    await flushPromises()
    expect(root.getPropertyValue('--s-vvh')).toBe('')
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
