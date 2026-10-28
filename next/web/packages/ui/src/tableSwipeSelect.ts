import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Drag to select table rows (selectable STable). A press on the selection
 * cell or on a cell's empty padding, moved past a few pixels, selects (or,
 * when the row under the press was selected, deselects) every row between the
 * press and the pointer; a translucent band shows the covered range. A press
 * on cell content keeps the browser's text selection, controls keep their
 * own behaviour. The page scrolls near the viewport edges and the wheel keeps
 * extending the range. Rows outside the range return to their state at the
 * start of the drag, so dragging back shrinks the selection.
 */
export interface SwipeSelectOptions {
  enabled: () => boolean
  /** Row keys in display order (index = data-select-row). */
  keys: () => unknown[]
  canSelect: (index: number) => boolean
  selected: () => unknown[]
  update: (keys: unknown[]) => void
}

const THRESHOLD = 5
const EDGE = 48
const SPEED = 12
const CONTROLS = 'button, a, select, textarea, label, [role="button"], [role="menuitem"], [role="combobox"], [role="switch"], [contenteditable="true"], input'

export function useTableSwipeSelect(table: Ref<HTMLTableElement | undefined>, options: SwipeSelectOptions) {
  const dragging = ref(false)
  let doc: Document | null = null
  let startY = 0
  let lastY = 0
  let from = -1
  let to = -1
  let mode = true
  let snapshot = new Set<unknown>()
  let rows: HTMLElement[] = []
  let band: HTMLDivElement | null = null
  let moveFrame = 0
  let scrollFrame = 0
  let suppressClick = false

  function rowElements() {
    return Array.from(table.value?.querySelectorAll<HTMLElement>('tbody > tr[data-select-row]') ?? []).filter(row => row.closest('table') === table.value)
  }
  const indexOf = (row: HTMLElement) => Number(row.dataset.selectRow)

  /** Index of the row at a viewport y (nearest row outside the table). */
  function rowAt(y: number): number {
    const n = rows.length
    if (!n) return -1
    if (y <= rows[0].getBoundingClientRect().top) return indexOf(rows[0])
    if (y >= rows[n - 1].getBoundingClientRect().bottom) return indexOf(rows[n - 1])
    let lo = 0
    let hi = n - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const r = rows[mid].getBoundingClientRect()
      if (y < r.top) hi = mid - 1
      else if (y > r.bottom) lo = mid + 1
      else return indexOf(rows[mid])
    }
    return indexOf(rows[Math.min(Math.max(lo, 0), n - 1)])
  }

  /** Whether a press may start a drag: the selection cell or a cell's own padding. */
  function startsDrag(target: HTMLElement): boolean {
    const row = target.closest<HTMLElement>('tr[data-select-row]')
    if (!row || row.closest('table') !== table.value) return false
    if (target.closest('[data-select-handle]')) return true
    if (target.closest(CONTROLS)) return false
    return target.tagName === 'TD' || target === row
  }

  function apply(end: number) {
    if (from < 0 || end < 0) return
    to = end
    const lo = Math.min(from, end)
    const hi = Math.max(from, end)
    const keys = options.keys()
    const next = new Set(snapshot)
    keys.forEach((key, i) => {
      if (!options.canSelect(i)) return
      const inRange = i >= lo && i <= hi
      const on = inRange ? mode : snapshot.has(key)
      if (on) next.add(key)
      else next.delete(key)
    })
    const current = options.selected()
    if (current.length === next.size && current.every(k => next.has(k))) return
    // Keep the original order for the keys that stay, append the new ones.
    const kept = current.filter(k => next.has(k))
    const keptSet = new Set(kept)
    options.update([...kept, ...[...next].filter(k => !keptSet.has(k))])
  }

  function drawBand() {
    if (!band || !table.value) return
    const box = table.value.getBoundingClientRect()
    const top = Math.min(startY, lastY)
    Object.assign(band.style, { left: `${box.left}px`, width: `${box.width}px`, top: `${top}px`, height: `${Math.abs(lastY - startY)}px` })
  }

  function onSelectStart(e: Event) {
    e.preventDefault()
  }

  function onPendingMove(e: MouseEvent) {
    if (Math.abs(e.clientY - startY) < THRESHOLD) return
    doc!.removeEventListener('mousemove', onPendingMove)
    doc!.removeEventListener('mouseup', end)
    begin()
    onMove(e)
  }

  function begin() {
    const index = rowAt(startY)
    if (index < 0) return end()
    const keys = options.keys()
    snapshot = new Set(options.selected())
    mode = !snapshot.has(keys[index])
    from = index
    to = -1
    dragging.value = true
    band = doc!.createElement('div')
    band.className = 's-table-swipe-band'
    band.setAttribute('aria-hidden', 'true')
    doc!.body.appendChild(band)
    doc!.defaultView?.getSelection()?.removeAllRanges()
    doc!.addEventListener('mousemove', onMove)
    doc!.addEventListener('mouseup', end)
    doc!.addEventListener('wheel', onWheel, { passive: true })
    apply(index)
  }

  function onMove(e: MouseEvent) {
    lastY = e.clientY
    const win = doc!.defaultView!
    win.cancelAnimationFrame(moveFrame)
    moveFrame = win.requestAnimationFrame(() => {
      drawBand()
      const i = rowAt(lastY)
      if (i !== to) apply(i)
    })
    autoScroll()
  }

  function onWheel() {
    doc?.defaultView?.requestAnimationFrame(() => {
      if (!dragging.value) return
      drawBand()
      apply(rowAt(lastY))
    })
  }

  function autoScroll() {
    const win = doc!.defaultView!
    win.cancelAnimationFrame(scrollFrame)
    const dy = lastY < EDGE ? -SPEED : lastY > win.innerHeight - EDGE ? SPEED : 0
    if (!dy) return
    const step = () => {
      if (!dragging.value) return
      const before = win.scrollY
      win.scrollBy(0, dy)
      if (win.scrollY !== before) {
        drawBand()
        const i = rowAt(lastY)
        if (i !== to) apply(i)
      }
      scrollFrame = win.requestAnimationFrame(step)
    }
    scrollFrame = win.requestAnimationFrame(step)
  }

  function end() {
    if (!doc) return
    const win = doc.defaultView
    if (dragging.value) {
      // The click that ends a drag (it may land on a checkbox) must not toggle it.
      suppressClick = true
      win?.setTimeout(() => (suppressClick = false), 0)
    }
    dragging.value = false
    from = to = -1
    rows = []
    snapshot = new Set()
    win?.cancelAnimationFrame(moveFrame)
    win?.cancelAnimationFrame(scrollFrame)
    band?.remove()
    band = null
    doc.removeEventListener('selectstart', onSelectStart)
    doc.removeEventListener('mousemove', onPendingMove)
    doc.removeEventListener('mousemove', onMove)
    doc.removeEventListener('mouseup', end)
    doc.removeEventListener('wheel', onWheel)
    win?.removeEventListener('blur', end)
    doc = null
  }

  function mouseDown(e: MouseEvent) {
    if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || !options.enabled() || doc) return
    const target = e.target as HTMLElement
    if (!startsDrag(target)) return
    rows = rowElements()
    if (!rows.length) return
    doc = target.ownerDocument
    startY = lastY = e.clientY
    doc.addEventListener('selectstart', onSelectStart)
    doc.addEventListener('mousemove', onPendingMove)
    doc.addEventListener('mouseup', end)
    doc.defaultView?.addEventListener('blur', end)
  }

  /** Capture-phase click guard: swallows the click that finishes a drag. */
  function clickCapture(e: MouseEvent) {
    if (!suppressClick) return
    suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  onBeforeUnmount(end)
  return { dragging, mouseDown, clickCapture }
}
