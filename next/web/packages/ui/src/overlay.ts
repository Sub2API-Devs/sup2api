// Modal layer stack shared by SModal and SDrawer: only the topmost layer
// handles Escape and traps Tab; body scrolling is locked while any layer is
// open; focus moves into a layer when it opens and back to the element that
// had it when it closes. Layers stack from z-index 50 (Tailwind z-overlay),
// two steps per open layer; `top` layers start at 60. Popovers (z-popover,
// 70) stay above them.
import { computed, nextTick, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

interface Layer {
  id: number
  panel: Ref<HTMLElement | undefined>
  onEscape: () => void
}

const stack = shallowRef<Layer[]>([])
let seq = 0
let listening = false
let savedOverflow = ''

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
    top.onEscape()
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
    listening = true
  } else if (!open && listening) {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = savedOverflow
    listening = false
  }
}

/**
 * Registers a layer while `open` is true. `panel` is the dialog element
 * (gets focus when nothing inside is focusable). Returns the stacking depth
 * (0 = first open layer).
 */
function useOverlayLayer(open: () => boolean, panel: Ref<HTMLElement | undefined>, onEscape: () => void) {
  const id = ++seq
  let returnTo: HTMLElement | null = null

  function push() {
    if (stack.value.some((l) => l.id === id)) return
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    stack.value = [...stack.value, { id, panel, onEscape }]
    sync()
    nextTick(() => {
      const el = panel.value
      if (!el || el.contains(document.activeElement)) return
      const target = el.querySelector<HTMLElement>('[data-autofocus],[autofocus]') || focusables(el).find((x) => !x.hasAttribute('data-overlay-close')) || el
      target.focus({ preventScroll: true })
    })
  }
  function pop() {
    if (!stack.value.some((l) => l.id === id)) return
    stack.value = stack.value.filter((l) => l.id !== id)
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
    if (dismissible.value) close()
  })
  const zIndex = computed(() => (props.top ? TOP_Z : BASE_Z) + depth.value * 2)
  return { dismissible, close, zIndex }
}

/** Number of open layers (tests / hosts). */
export function openLayerCount(): number {
  return stack.value.length
}
