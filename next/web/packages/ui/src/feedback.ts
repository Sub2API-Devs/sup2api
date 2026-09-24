import { reactive } from 'vue'
import type { ConfirmOptions, ToastKind } from '@sub2api/host'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let seq = 0

export const toastState = reactive({ items: [] as ToastItem[] })

export function toast(message: string, kind: ToastKind = 'info', timeoutMs = kind === 'error' ? 6000 : 3500) {
  const id = ++seq
  toastState.items.push({ id, kind, message })
  setTimeout(() => dismissToast(id), timeoutMs)
}

export function dismissToast(id: number) {
  const i = toastState.items.findIndex((x) => x.id === id)
  if (i >= 0) toastState.items.splice(i, 1)
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
