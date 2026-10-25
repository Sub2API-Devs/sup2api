import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useScrollClip } from './scrollClip'

// The sticky actions column of STable shows its shadow only while columns
// are hidden past the scroller's end edge.
describe('useScrollClip', () => {
  it('follows the scroll position', async () => {
    let clipped: Ref<boolean> | undefined
    const el = ref<HTMLElement>()
    const w = mount(defineComponent({
      setup() {
        clipped = useScrollClip(el, ref())
        return () => h('div', { ref: el })
      }
    }))
    await nextTick()
    const scroller = w.element as HTMLElement
    Object.defineProperties(scroller, { scrollWidth: { value: 500 }, clientWidth: { value: 300 } })
    scroller.dispatchEvent(new Event('scroll'))
    expect(clipped?.value).toBe(true)
    scroller.scrollLeft = 200
    scroller.dispatchEvent(new Event('scroll'))
    expect(clipped?.value).toBe(false)
    w.unmount()
  })
})
