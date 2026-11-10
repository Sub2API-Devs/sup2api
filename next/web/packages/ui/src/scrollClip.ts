// Whether a horizontally scrollable element hides content past its start /
// end edge (left / right in LTR). Kept up to date on scroll and when the
// element or its `content` resizes; false while the element is not mounted.
// useScrollFade turns that into an edge fade mask; useCentredSelection keeps
// the selected item (tab, segment) in the middle of the scroller; isCutOff
// and scrollToCentre serve a scroller whose items are pressed (BulkDock).
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'

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

// Literal class names so Tailwind keeps them.
const FADE = {
  both: '[mask-image:linear-gradient(to_right,transparent,#000_2rem,#000_calc(100%-2rem),transparent)]',
  left: '[mask-image:linear-gradient(to_right,transparent,#000_2rem)]',
  right: '[mask-image:linear-gradient(to_left,transparent,#000_2rem)]'
}
const isRtl = (el: HTMLElement) => getComputedStyle(el).direction === 'rtl'

/** A mask class fading each side of the scroller that hides content ('' when nothing is hidden). */
export function useScrollFade(el: Ref<HTMLElement | undefined>, content: Ref<HTMLElement | undefined>): ComputedRef<string> {
  const edges = useScrollEdges(el, content)
  return computed(() => {
    const rtl = !!el.value && isRtl(el.value)
    const left = rtl ? edges.end.value : edges.start.value
    const right = rtl ? edges.start.value : edges.end.value
    if (left) return right ? FADE.both : FADE.left
    return right ? FADE.right : ''
  })
}

/** Whether the scroller shows only a part of `item` although it has room for all of it. */
export function isCutOff(scroller: HTMLElement, item: HTMLElement): boolean {
  const box = scroller.getBoundingClientRect()
  const rect = item.getBoundingClientRect()
  return rect.width <= box.width && (rect.left < box.left - 1 || rect.right > box.right + 1)
}

/** Scrolls `item` to the middle of `scroller`, which must be its offsetParent (position: relative). */
export function scrollToCentre(scroller: HTMLElement | undefined, item: HTMLElement | undefined, behavior: ScrollBehavior) {
  if (!scroller || !item) return
  // Holds in RTL too: offsetLeft and scrollLeft both count from the scroller's start position (negative leftwards).
  scroller.scrollTo?.({ left: item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2, behavior })
}

/**
 * Keeps the selected item of a horizontal scroller in its middle: at mount and
 * whenever `selected` (a getter reading the selection) returns another element.
 * The scroller must be the items' offsetParent (position: relative).
 */
export function useCentredSelection(scroller: Ref<HTMLElement | undefined>, selected: () => HTMLElement | undefined): void {
  onMounted(() => scrollToCentre(scroller.value, selected(), 'auto'))
  watch(selected, item => scrollToCentre(scroller.value, item, 'smooth'), { flush: 'post' })
}
