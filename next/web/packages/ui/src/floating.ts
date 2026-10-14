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

export function useFloating(anchor: Ref<HTMLElement | undefined>, panel: Ref<HTMLElement | undefined>, opts: FloatingOptions = {}) {
  const style = ref<Record<string, string>>({ top: '0px', left: '0px' })
  const actual = ref<Placement>(opts.placement ?? 'bottom')
  let active = false

  function update() {
    const el = anchor.value
    if (!el) return
    if (!el.isConnected) {
      opts.onLost?.()
      return
    }
    const a = el.getBoundingClientRect()
    // A zero-size rect (no layout: display:none ancestors, test DOMs) is not
    // "scrolled away"; only a laid-out anchor fully outside the viewport is.
    const laidOut = a.width > 0 || a.height > 0
    if (laidOut && (a.bottom < 0 || a.top > window.innerHeight || a.right < 0 || a.left > window.innerWidth)) {
      opts.onLost?.()
      return
    }
    const p = panel.value
    const w = p?.offsetWidth || 0
    const h = p?.offsetHeight || 0
    const gap = opts.offset ?? 4
    const vw = window.innerWidth
    const vh = window.innerHeight
    let place = opts.placement ?? 'bottom'
    // Flip when the preferred side has no room and the other side has.
    if (place === 'bottom' && a.bottom + gap + h > vh - MARGIN && a.top - gap - h > MARGIN) place = 'top'
    else if (place === 'top' && a.top - gap - h < MARGIN && a.bottom + gap + h < vh - MARGIN) place = 'bottom'
    else if (place === 'right' && a.right + gap + w > vw - MARGIN && a.left - gap - w > MARGIN) place = 'left'
    else if (place === 'left' && a.left - gap - w < MARGIN && a.right + gap + w < vw - MARGIN) place = 'right'
    actual.value = place
    const align = opts.align ?? 'start'
    let top: number
    let left: number
    if (place === 'top' || place === 'bottom') {
      top = place === 'bottom' ? a.bottom + gap : a.top - gap - h
      const width = opts.matchWidth ? Math.max(w, a.width) : w
      left = align === 'end' ? a.right - width : align === 'center' ? a.left + a.width / 2 - width / 2 : a.left
      left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - width - MARGIN))
    } else {
      left = place === 'right' ? a.right + gap : a.left - gap - w
      top = align === 'end' ? a.bottom - h : align === 'center' ? a.top + a.height / 2 - h / 2 : a.top
      top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - h - MARGIN))
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
  return { style, placement: actual, update, start, stop }
}
