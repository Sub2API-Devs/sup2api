import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { TableReorderEvent } from './types'

type Key = string | number
type DropTarget = { index: number; after: boolean }
interface DragSession {
  pointerId: number
  from: number
  keys: unknown[]
  handle: HTMLElement
  x: number
  y: number
  startX: number
  startY: number
  document: Document
}

/** Handle-only pointer sorting. The parent owns rows; a gesture emits one new order. */
export function useTableReorder<T extends Record<string, unknown>>(
  table: Ref<HTMLTableElement | undefined>,
  options: { rows: T[]; rowKey: string; reorderable?: boolean; reorderDisabled?: boolean; loading?: boolean },
  onReorder: (event: TableReorderEvent<T>) => void
) {
  const keys = computed(() => options.rows.map(row => row[options.rowKey]))
  const validKeys = computed(
    () =>
      keys.value.every(key => (typeof key === 'string' && key.length > 0) || (typeof key === 'number' && Number.isFinite(key))) &&
      new Set(keys.value.map(String)).size === keys.value.length
  )
  const enabled = computed(
    () => !!options.reorderable && !options.reorderDisabled && !options.loading && options.rows.length > 1 && validKeys.value
  )
  const dragging = ref<number | null>(null)
  const target = ref<DropTarget | null>(null)
  let session: DragSession | null = null
  let frame = 0

  function cancel() {
    const active = session
    session = null
    dragging.value = null
    target.value = null
    if (!active) return
    const doc = active.document
    doc.removeEventListener('pointermove', pointerMove)
    doc.removeEventListener('pointerup', pointerUp)
    doc.removeEventListener('pointercancel', pointerCancel)
    doc.removeEventListener('keydown', escape, true)
    active.handle.removeEventListener('lostpointercapture', cancel)
    doc.defaultView?.removeEventListener('blur', cancel)
    doc.defaultView?.cancelAnimationFrame(frame)
    frame = 0
    if (active.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture(active.pointerId)
  }

  function sameKeys(snapshot: unknown[]) {
    return snapshot.length === keys.value.length && snapshot.every((key, i) => key === keys.value[i])
  }

  function move(from: number, to: number) {
    if (!enabled.value || from === to || to < 0 || to >= options.rows.length) return
    const row = options.rows[from]
    if (!row) return
    const key = keys.value[from] as Key
    const rows = [...options.rows]
    rows.splice(from, 1)
    rows.splice(to, 0, row)
    onReorder({ row, key, from, to, rows })
    nextTick(() => {
      const index = keys.value.indexOf(key)
      rowElements()[index]?.querySelector<HTMLElement>('[data-reorder-handle]')?.focus({ preventScroll: true })
    })
  }

  function rowElements() {
    return Array.from(table.value?.querySelectorAll<HTMLTableRowElement>('tr[data-reorder-row]') ?? []).filter(
      row => row.closest('table') === table.value
    )
  }

  function updateTarget() {
    if (!session || !table.value) return
    const bounds = table.value.getBoundingClientRect()
    const { x, y } = session
    target.value = null
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return
    const rows = rowElements()
    const row = rows.find(el => y <= el.getBoundingClientRect().bottom) ?? rows.at(-1)
    if (!row) return
    const box = row.getBoundingClientRect()
    target.value = { index: Number(row.dataset.reorderRow), after: y > box.top + box.height / 2 }
  }

  // Scroll the nearest overflowing container (or page) while holding its edge.
  function scrollAtEdge() {
    if (!session || dragging.value === null) return
    const { document: doc, x, y } = session
    const win = doc.defaultView
    if (!win) return
    let el: HTMLElement | null = table.value?.parentElement ?? null
    while (el) {
      const page = el === doc.scrollingElement
      const scrollable = page || /auto|scroll/.test(win.getComputedStyle(el).overflowY)
      const box = el.getBoundingClientRect()
      const top = page ? 0 : Math.max(0, box.top)
      const bottom = page ? win.innerHeight : Math.min(win.innerHeight, box.bottom)
      const inside = page || (x >= box.left && x <= box.right)
      const delta = y < top + 32 ? -12 : y > bottom - 32 ? 12 : 0
      if (inside && bottom > top && scrollable && el.scrollHeight > el.clientHeight && delta) {
        const previous = el.scrollTop
        el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, previous + delta))
        if (el.scrollTop !== previous) break
      }
      el = el.parentElement
    }
    updateTarget()
    frame = win.requestAnimationFrame(scrollAtEdge)
  }

  function pointerMove(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return
    if (!enabled.value || !sameKeys(session.keys)) return cancel()
    session.x = event.clientX
    session.y = event.clientY
    if (dragging.value === null) {
      if (Math.hypot(session.x - session.startX, session.y - session.startY) < 5) return
      dragging.value = session.from
      frame = session.document.defaultView?.requestAnimationFrame(scrollAtEdge) ?? 0
    }
    event.preventDefault()
    updateTarget()
  }

  function pointerUp(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return
    session.x = event.clientX
    session.y = event.clientY
    updateTarget()
    const from = session.from
    const drop = target.value
    const valid = dragging.value !== null && sameKeys(session.keys)
    const before = drop ? drop.index + Number(drop.after) : from
    cancel()
    if (valid && drop) move(from, before - Number(before > from))
  }

  function pointerCancel(event: PointerEvent) {
    if (event.pointerId === session?.pointerId) cancel()
  }

  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    cancel()
  }

  function pointerDown(event: PointerEvent, index: number) {
    if (!enabled.value || session || event.button !== 0 || event.isPrimary === false) return
    const handle = event.currentTarget as HTMLElement
    const doc = handle.ownerDocument
    session = {
      pointerId: event.pointerId,
      from: index,
      keys: [...keys.value],
      handle,
      document: doc,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY
    }
    event.preventDefault()
    handle.focus({ preventScroll: true })
    handle.setPointerCapture?.(event.pointerId)
    doc.addEventListener('pointermove', pointerMove, { passive: false })
    doc.addEventListener('pointerup', pointerUp)
    doc.addEventListener('pointercancel', pointerCancel)
    doc.addEventListener('keydown', escape, true)
    handle.addEventListener('lostpointercapture', cancel)
    doc.defaultView?.addEventListener('blur', cancel)
  }

  function keyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Escape') {
      if (session) event.preventDefault()
      return cancel()
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    cancel()
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? options.rows.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1)
    move(index, to)
  }

  function rowClass(index: number) {
    return {
      's-table-dragging': dragging.value === index,
      's-table-drop-before': dragging.value !== null && target.value?.index === index && !target.value.after,
      's-table-drop-after': dragging.value !== null && target.value?.index === index && target.value.after
    }
  }

  watch([enabled, () => options.rows, keys], cancel, { flush: 'sync' })
  onBeforeUnmount(cancel)
  return { enabled, pointerDown, keyDown, rowClass }
}
