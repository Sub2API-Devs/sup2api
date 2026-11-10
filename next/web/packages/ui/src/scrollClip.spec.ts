import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { isCutOff, useCentredSelection, useScrollClip, useScrollEdges, useScrollFade } from './scrollClip'

// Mounts a scroller element (500px of content in 300px) watched by `use`.
function scroller<T>(use: (el: Ref<HTMLElement | undefined>) => T, style = '') {
  let state: T | undefined
  const el = ref<HTMLElement>()
  const w = mount(defineComponent({
    setup() {
      state = use(el)
      return () => h('div', { ref: el, style })
    }
  }), { attachTo: document.body })
  const node = w.element as HTMLElement
  Object.defineProperties(node, { scrollWidth: { value: 500 }, clientWidth: { value: 300 } })
  const scrollTo = (left: number) => {
    node.scrollLeft = left
    node.dispatchEvent(new Event('scroll'))
  }
  return { w, state: () => state!, scrollTo }
}

// The sticky actions column of STable shows its shadow only while columns
// are hidden past the scroller's end edge.
describe('useScrollClip', () => {
  it('follows the scroll position', async () => {
    const s = scroller(el => useScrollClip(el, ref()))
    await nextTick()
    s.scrollTo(0)
    expect(s.state().value).toBe(true)
    s.scrollTo(200)
    expect(s.state().value).toBe(false)
    s.w.unmount()
  })
})

// STabs fades whichever edge hides more tabs.
describe('useScrollEdges', () => {
  it('reports the start and end edges', async () => {
    const s = scroller(el => useScrollEdges(el, ref()))
    await nextTick()
    const edges = () => [s.state().start.value, s.state().end.value]
    s.scrollTo(0)
    expect(edges()).toEqual([false, true])
    s.scrollTo(100)
    expect(edges()).toEqual([true, true])
    s.scrollTo(200)
    expect(edges()).toEqual([true, false])
    s.w.unmount()
  })
})

// BulkDock does not press a button the scroller shows only a part of.
describe('isCutOff', () => {
  const box = (left: number, right: number) => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left, right, width: right - left }) as DOMRect
    return el
  }
  const scroller = box(100, 300)

  it('is true for an item reaching past either edge', () => {
    expect(isCutOff(scroller, box(260, 340))).toBe(true)
    expect(isCutOff(scroller, box(60, 140))).toBe(true)
  })

  it('is false for an item in full view, to the pixel', () => {
    expect(isCutOff(scroller, box(100, 300))).toBe(false)
    expect(isCutOff(scroller, box(100.5, 300.5))).toBe(false)
  })

  it('is false for an item the scroller can never show in full', () => {
    expect(isCutOff(scroller, box(50, 350))).toBe(false)
  })
})

describe('useScrollFade / useCentredSelection in RTL', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fades the physical side that hides content', async () => {
    const s = scroller(el => useScrollFade(el, ref()), 'direction: rtl')
    await nextTick()
    s.scrollTo(0)
    expect(s.state().value).toBe('[mask-image:linear-gradient(to_right,transparent,#000_2rem)]')
    s.w.unmount()
  })

  it('centres an item with the same arithmetic as in LTR', async () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const item = document.createElement('span')
    Object.defineProperties(item, { offsetLeft: { value: 100 }, offsetWidth: { value: 50 } })
    const selected = shallowRef<HTMLElement>()
    const s = scroller(el => useCentredSelection(el, () => selected.value), 'direction: rtl')
    selected.value = item
    await nextTick()
    // 100 - (300 - 50) / 2: offsetLeft is already negative for items left of the start position.
    expect(scrollTo).toHaveBeenLastCalledWith({ left: -25, behavior: 'smooth' })
    s.w.unmount()
  })
})
