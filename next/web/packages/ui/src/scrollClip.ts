// Whether a horizontally scrollable element hides content past its end edge
// (the right edge in LTR). Kept up to date on scroll and when the element or
// its `content` resizes; false while the element is not mounted.
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

export function useScrollClip(el: Ref<HTMLElement | undefined>, content: Ref<HTMLElement | undefined>): Ref<boolean> {
  const clipped = ref(false)
  const update = () => {
    const e = el.value
    clipped.value = !!e && Math.abs(e.scrollLeft) + e.clientWidth < e.scrollWidth - 1
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
  const detach = (e?: HTMLElement) => {
    e?.removeEventListener('scroll', update)
    observer?.disconnect()
  }
  watch([el, content], ([e, c], [old]) => {
    detach(old)
    e?.addEventListener('scroll', update, { passive: true })
    for (const node of [e, c]) if (node) observer?.observe(node)
    update()
  }, { flush: 'post' })
  onBeforeUnmount(() => detach(el.value))
  return clipped
}
