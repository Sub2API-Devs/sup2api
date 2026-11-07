// Whether a horizontally scrollable element hides content past its start /
// end edge (left / right in LTR). Kept up to date on scroll and when the
// element or its `content` resizes; false while the element is not mounted.
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface ScrollEdges {
  start: Ref<boolean>
  end: Ref<boolean>
}

export function useScrollEdges(el: Ref<HTMLElement | undefined>, content: Ref<HTMLElement | undefined>): ScrollEdges {
  const start = ref(false)
  const end = ref(false)
  const update = () => {
    const e = el.value
    const offset = e ? Math.abs(e.scrollLeft) : 0
    start.value = !!e && offset > 1
    end.value = !!e && offset + e.clientWidth < e.scrollWidth - 1
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
  return { start, end }
}

/** Only the end edge (STable's sticky actions column shadow). */
export function useScrollClip(el: Ref<HTMLElement | undefined>, content: Ref<HTMLElement | undefined>): Ref<boolean> {
  return useScrollEdges(el, content).end
}

/** Scrolls a horizontal scroller so `item` sits in its middle (the scroller must be the item's offsetParent). */
export function scrollToCentre(scroller: HTMLElement | undefined, item: HTMLElement | undefined, behavior: ScrollBehavior): void {
  if (!scroller || !item) return
  scroller.scrollTo?.({ left: item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2, behavior })
}
