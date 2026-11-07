import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useScrollClip, useScrollEdges } from './scrollClip'

// Mounts a scroller element watched by `use`.
function scroller<T>(use: (el: Ref<HTMLElement | undefined>) => T) {
  let state: T | undefined
  const el = ref<HTMLElement>()
  const w = mount(defineComponent({
    setup() {
      state = use(el)
      return () => h('div', { ref: el })
    }
  }))
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
