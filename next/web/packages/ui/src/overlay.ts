// Modal layer stack shared by SModal and SDrawer (and the phone sheets built
// on them): only the topmost layer handles Escape and traps Tab; body
// scrolling is locked while any layer is open; focus moves into a layer when
// it opens and back to the element that had it when it closes. Layers stack
// from z-index 50 (Tailwind z-overlay), two steps per open layer; `top`
// layers start at 60. Popovers (z-popover, 70) stay above them.
// On phones and touch screens a layer also takes a same-URL history entry, so
// the browser Back button / Android back gesture closes the topmost layer
// instead of leaving the page; the entry is removed when the layer closes
// another way, and the router never sees these steps. While a layer is open
// the visual viewport height is kept in the CSS variable --s-vvh, so sheets
// can stay above the soft keyboard. useSheetSwipe: swipe down to close a sheet.
import { computed, nextTick, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import { useViewport } from './viewport'

interface Layer {
  id: number
  panel: Ref<HTMLElement | undefined>
  /** Closes the layer unless it is persistent; false when it stays open. */
  dismiss: () => boolean
  /** URL of the history entry taken for the layer, null without one. */
  entry: string | null
}

const stack = shallowRef<Layer[]>([])
let seq = 0
let listening = false
let savedOverflow = ''

const ENTRY_KEY = 'sLayer'
let historyBound = false
/** history.back() calls of this module whose popstate is still to come. */
let ownPops = 0

function pushEntry(layer: Layer) {
  if (!historyBound) {
    // Capture: runs before the router's popstate listener so it can be hidden from it.
    window.addEventListener('popstate', onPopstate, true)
    historyBound = true
  }
  history.pushState({ ...history.state, [ENTRY_KEY]: layer.id }, '')
  layer.entry = location.href
}

function onPopstate(e: PopStateEvent) {
  if (ownPops > 0) {
    ownPops--
    e.stopImmediatePropagation()
    return
  }
  const top = stack.value.filter((l) => l.entry).at(-1)
  if (!top || location.href !== top.entry || history.state?.[ENTRY_KEY] === top.id) return
  e.stopImmediatePropagation()
  top.entry = null
  if (!top.dismiss()) pushEntry(top)
}

function trackVisualViewport() {
  const vv = window.visualViewport
  if (vv) document.documentElement.style.setProperty('--s-vvh', `${vv.height}px`)
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true')
}

function onKeydown(e: KeyboardEvent) {
  const top = stack.value[stack.value.length - 1]
  if (!top) return
  if (e.key === 'Escape' && !e.isComposing) {
    if (e.defaultPrevented) return
    e.preventDefault()
    e.stopPropagation()
    top.dismiss()
    return
  }
  if (e.key !== 'Tab') return
  const panel = top.panel.value
  if (!panel) return
  const list = focusables(panel)
  if (!list.length) {
    e.preventDefault()
    panel.focus()
    return
  }
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || !panel.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}

function sync() {
  const open = stack.value.length > 0
  if (open && !listening) {
    document.addEventListener('keydown', onKeydown)
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.visualViewport?.addEventListener('resize', trackVisualViewport)
    trackVisualViewport()
    listening = true
  } else if (!open && listening) {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = savedOverflow
    window.visualViewport?.removeEventListener('resize', trackVisualViewport)
    document.documentElement.style.removeProperty('--s-vvh')
    listening = false
  }
}

/**
 * Registers a layer while `open` is true. `panel` is the dialog element
 * (gets focus when nothing inside is focusable). Returns the stacking depth
 * (0 = first open layer).
 */
function useOverlayLayer(open: () => boolean, panel: Ref<HTMLElement | undefined>, dismiss: () => boolean) {
  const id = ++seq
  const { compact, touch } = useViewport()
  let returnTo: HTMLElement | null = null

  function push() {
    if (stack.value.some((l) => l.id === id)) return
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const layer: Layer = { id, panel, dismiss, entry: null }
    stack.value = [...stack.value, layer]
    if (compact.value || touch.value) pushEntry(layer)
    sync()
    nextTick(() => {
      const el = panel.value
      if (!el || el.contains(document.activeElement)) return
      const target = el.querySelector<HTMLElement>('[data-autofocus],[autofocus]') || focusables(el).find((x) => !x.hasAttribute('data-overlay-close')) || el
      target.focus({ preventScroll: true })
    })
  }
  function pop() {
    const layer = stack.value.find((l) => l.id === id)
    if (!layer) return
    stack.value = stack.value.filter((l) => l !== layer)
    if (layer.entry && history.state?.[ENTRY_KEY] === id) {
      ownPops++
      history.back()
    }
    sync()
    const el = returnTo
    returnTo = null
    if (el && el.isConnected) nextTick(() => el.focus({ preventScroll: true }))
  }

  watch(open, (v) => (v ? push() : pop()), { immediate: true })
  onBeforeUnmount(pop)

  const depth = computed(() => {
    const i = stack.value.findIndex((l) => l.id === id)
    return i < 0 ? stack.value.length : i
  })
  return depth
}

/** Shapes of the dialog surface (internal/OverlaySurface.vue). */
export type OverlayForm = 'center' | 'right' | 'left' | 'sheet' | 'fullscreen'

const BASE_Z = 50
const TOP_Z = 60

/**
 * Dialog behaviour of SModal / SDrawer: a layer of the stack while `open`;
 * Escape (and the backdrop, via `dismissible`) close it unless it is
 * `persistent` or not `closable`. `close()` emits update:open(false) and close.
 */
export function useDialog(
  props: { open: boolean; closable?: boolean; persistent?: boolean; top?: boolean },
  emit: { (e: 'update:open', v: boolean): void; (e: 'close'): void },
  panel: Ref<HTMLElement | undefined>
) {
  const dismissible = computed(() => !!props.closable && !props.persistent)
  function close() {
    emit('update:open', false)
    emit('close')
  }
  const depth = useOverlayLayer(() => props.open, panel, () => {
    if (!dismissible.value) return false
    close()
    return true
  })
  const zIndex = computed(() => (props.top ? TOP_Z : BASE_Z) + depth.value * 2)
  return { dismissible, close, zIndex }
}

/** Number of open layers (tests / hosts). */
export function openLayerCount(): number {
  return stack.value.length
}

/**
 * Swipe down to close a bottom sheet: returns the pointerdown handler of its
 * grab handle and header. A drag that starts there (not on a control) while
 * the body is scrolled to the top moves the panel with the finger; let go
 * past a quarter of its height, or flicked, it closes, otherwise it springs
 * back. Does nothing while `enabled` is false (persistent sheets).
 */
export function useSheetSwipe(panel: Ref<HTMLElement | undefined>, body: Ref<HTMLElement | undefined>, enabled: () => boolean, close: () => void) {
  return (e: PointerEvent) => {
    const sheet = panel.value
    const grip = e.currentTarget as HTMLElement
    if (!sheet || !enabled() || e.button !== 0 || (body.value?.scrollTop ?? 0) > 0) return
    if ((e.target as Element).closest('button, a, input, select, textarea, [contenteditable="true"]')) return
    const startY = e.clientY
    const startAt = e.timeStamp
    let dy = 0
    grip.setPointerCapture?.(e.pointerId)
    sheet.style.transition = 'none'
    const move = (ev: PointerEvent) => {
      dy = Math.max(0, ev.clientY - startY)
      sheet.style.transform = dy ? `translateY(${dy}px)` : ''
    }
    const end = (ev: PointerEvent) => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', end)
      grip.removeEventListener('pointercancel', end)
      const flicked = dy > 24 && dy / Math.max(1, ev.timeStamp - startAt) > 0.5
      const closing = ev.type === 'pointerup' && (dy > sheet.offsetHeight / 4 || flicked)
      sheet.style.transition = 'transform 0.2s ease'
      sheet.style.transform = closing ? 'translateY(100%)' : ''
      if (closing) close()
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', end)
    grip.addEventListener('pointercancel', end)
  }
}
