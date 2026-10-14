import { reactive } from 'vue'
import type { ConfirmOptions, ToastKind } from '@sub2api/host'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let seq = 0

export const toastState = reactive({ items: [] as ToastItem[] })

interface Timer {
  handle: ReturnType<typeof setTimeout> | null
  remaining: number
  started: number
}
const timers = new Map<number, Timer>()

function arm(id: number, ms: number) {
  timers.set(id, { handle: setTimeout(() => dismissToast(id), ms), remaining: ms, started: Date.now() })
}

export function toast(message: string, kind: ToastKind = 'info', timeoutMs = kind === 'error' ? 6000 : 3500) {
  const id = ++seq
  toastState.items.push({ id, kind, message })
  arm(id, timeoutMs)
}

export function dismissToast(id: number) {
  const t = timers.get(id)
  if (t?.handle) clearTimeout(t.handle)
  timers.delete(id)
  const i = toastState.items.findIndex((x) => x.id === id)
  if (i >= 0) toastState.items.splice(i, 1)
}

/** Stops the auto-dismiss countdown of a toast (pointer over it). */
export function pauseToast(id: number) {
  const t = timers.get(id)
  if (!t || !t.handle) return
  clearTimeout(t.handle)
  t.handle = null
  t.remaining = Math.max(0, t.remaining - (Date.now() - t.started))
}

/** Resumes a paused countdown (at least 1.5 s left so it can still be read). */
export function resumeToast(id: number) {
  const t = timers.get(id)
  if (!t || t.handle) return
  arm(id, Math.max(1500, t.remaining))
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

export const confirmState = reactive({ current: null as PendingConfirm | null })

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.current?.resolve(false)
    confirmState.current = { ...opts, resolve }
  })
}

export function settleConfirm(ok: boolean) {
  const c = confirmState.current
  confirmState.current = null
  c?.resolve(ok)
}
