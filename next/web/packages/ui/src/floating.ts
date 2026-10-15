// Positions a fixed, body-teleported panel next to an anchor element and
// keeps it there while the page scrolls or resizes. Shared by SDropdown,
// the searchable SSelect and STooltip.
import { onBeforeUnmount, ref, type Ref } from 'vue'

export type Placement = 'top' | 'bottom' | 'left' | 'right'
export type Align = 'start' | 'center' | 'end'

export interface FloatingOptions {
  placement?: Placement
  align?: Align
  offset?: number
  /** Panel at least as wide as the anchor. */
  matchWidth?: boolean
  /** Called when the anchor scrolled out of view. */
  onLost?: () => void
}

const MARGIN = 8
const OPPOSITE: Record<Placement, Placement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

/** The preferred side, flipped when it has no room and the opposite side has. */
function flip(side: Placement, a: DOMRect, w: number, h: number, gap: number): Placement {
  const room: Record<Placement, number> = {
    bottom: window.innerHeight - MARGIN - (a.bottom + gap + h),
    top: a.top - gap - h - MARGIN,
    right: window.innerWidth - MARGIN - (a.right + gap + w),
    left: a.left - gap - w - MARGIN
  }
  return room[side] < 0 && room[OPPOSITE[side]] > 0 ? OPPOSITE[side] : side
}

/** Start of a panel of `size` aligned along an anchor edge (start, len), kept inside [MARGIN, viewport - MARGIN]. */
function along(align: Align, start: number, len: number, size: number, viewport: number): number {
  const v = align === 'end' ? start + len - size : align === 'center' ? start + len / 2 - size / 2 : start
  return Math.min(Math.max(MARGIN, v), Math.max(MARGIN, viewport - size - MARGIN))
}

/** True when a laid-out anchor is fully outside the viewport (a zero-size rect — no layout, test DOMs — is not). */
function offscreen(a: DOMRect): boolean {
  const laidOut = a.width > 0 || a.height > 0
  return laidOut && (a.bottom < 0 || a.top > window.innerHeight || a.right < 0 || a.left > window.innerWidth)
}

export function useFloating(anchor: Ref<HTMLElement | undefined>, panel: Ref<HTMLElement | undefined>, opts: FloatingOptions = {}) {
  const style = ref<Record<string, string>>({ top: '0px', left: '0px' })
  let active = false

  function update() {
    const el = anchor.value
    if (!el) return
    const a = el.getBoundingClientRect()
    if (!el.isConnected || offscreen(a)) return opts.onLost?.()
    const w = panel.value?.offsetWidth || 0
    const h = panel.value?.offsetHeight || 0
    const gap = opts.offset ?? 4
    const align = opts.align ?? 'start'
    const side = flip(opts.placement ?? 'bottom', a, w, h, gap)
    let top: number
    let left: number
    if (side === 'top' || side === 'bottom') {
      top = side === 'bottom' ? a.bottom + gap : a.top - gap - h
      left = along(align, a.left, a.width, opts.matchWidth ? Math.max(w, a.width) : w, window.innerWidth)
    } else {
      left = side === 'right' ? a.right + gap : a.left - gap - w
      top = along(align, a.top, a.height, h, window.innerHeight)
    }
    const s: Record<string, string> = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px` }
    if (opts.matchWidth) s.minWidth = `${Math.round(a.width)}px`
    style.value = s
  }

  function start() {
    update()
    if (active) return
    active = true
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
  }
  function stop() {
    if (!active) return
    active = false
    window.removeEventListener('scroll', update, true)
    window.removeEventListener('resize', update)
  }
  onBeforeUnmount(stop)
  return { style, update, start, stop }
}
