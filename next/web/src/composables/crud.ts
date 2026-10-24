import { computed, ref, type ComputedRef } from 'vue'
import { api, type ConfirmOptions, type Query } from '@sub2api/host'
import { confirm, toast, type SelectOption } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { notifyError } from '@/utils/errors'

// Row actions shared by the list pages: delete with confirmation, the
// active ⇄ disabled toggle and optimistic "enabled" switches.

const t = i18n.global.t

/** DELETEs `path` (with `query`), toasts "Deleted" and runs `done`; a failure is toasted. Resolves true once deleted. */
export async function deleteResource(path: string, query?: Query, done?: () => unknown): Promise<boolean> {
  try {
    await api.del(path, query)
    toast(t('common.deleted'), 'success')
    await done?.()
    return true
  } catch (e) {
    notifyError(e)
    return false
  }
}

/** Asks `message`, then {@link deleteResource}. Resolves true once deleted. */
export async function deleteWithConfirm(path: string, message: string, done?: () => unknown): Promise<boolean> {
  if (!(await confirm({ title: t('common.delete'), message, danger: true }))) return false
  return deleteResource(path, undefined, done)
}

/**
 * A confirmed action that is not a DELETE (revoke, purge, …): asks `opts`,
 * runs `run` and then `done`; a failure is toasted. Resolves true once `run`
 * succeeded, false when cancelled or failed.
 */
export async function confirmAction<T>(opts: ConfirmOptions, run: () => Promise<T>, done?: (result: T) => unknown): Promise<boolean> {
  if (!(await confirm(opts))) return false
  try {
    const result = await run()
    await done?.(result)
    return true
  } catch (e) {
    notifyError(e)
    return false
  }
}

/** PATCHes `path` with the opposite of `status` (active ⇄ disabled), toasts and runs `done`. */
export async function toggleStatus(path: string, status: string, done?: () => unknown): Promise<void> {
  try {
    await api.patch(path, { status: status === 'active' ? 'disabled' : 'active' })
    toast(t('common.updated'), 'success')
    await done?.()
  } catch (e) {
    notifyError(e)
  }
}

/** Active / disabled options (with a leading "All" for filters). */
export function useStatusOptions(withAll = false): ComputedRef<SelectOption[]> {
  return computed(() => [
    ...(withAll ? [{ value: '', label: t('common.all') }] : []),
    { value: 'active', label: t('common.status_.active') },
    { value: 'disabled', label: t('common.status_.disabled') }
  ])
}

/**
 * An "enabled" switch per row: flips the row at once, calls `save` and flips
 * it back (with a toast) when that fails. `busy` holds the ids being saved.
 */
export function useRowSwitch<T extends { id: number; enabled: boolean }>(save: (row: T, on: boolean) => Promise<unknown>) {
  const busy = ref(new Set<number>())
  function mark(id: number, on: boolean) {
    const next = new Set(busy.value)
    if (on) next.add(id)
    else next.delete(id)
    busy.value = next
  }
  async function set(row: T, on: boolean) {
    const prev = row.enabled
    row.enabled = on
    mark(row.id, true)
    try {
      await save(row, on)
    } catch (e) {
      row.enabled = prev
      notifyError(e)
    } finally {
      mark(row.id, false)
    }
  }
  return { busy, set }
}
