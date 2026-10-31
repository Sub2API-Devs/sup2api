import { isApiError } from '@sub2api/host'
import { toastError } from './host'

// Form helpers shared by the editors and the filter bars.

export type FieldErrors = Record<string, string>

export function clearErrors(errs: FieldErrors) {
  for (const k of Object.keys(errs)) delete errs[k]
}

/**
 * Copies the field messages of an ApiError into errs, the first one per key
 * (`key` maps an API field path to the form's key). Returns whether a field
 * the form shows got a message; when not, the caller reports the error itself.
 */
export function applyFieldErrors(errs: FieldErrors, e: unknown, shown?: readonly string[], key: (path: string) => string = (p) => p): boolean {
  for (const [path, msg] of Object.entries(isApiError(e) ? e.fields : {})) errs[key(path)] ||= msg
  return Object.keys(errs).some((k) => !shown || shown.includes(k))
}

/** applyFieldErrors, and a toast of the error when no field shown got a message. */
export function applyErrorsOrToast(errs: FieldErrors, e: unknown, shown?: readonly string[], key?: (path: string) => string) {
  if (!applyFieldErrors(errs, e, shown, key)) toastError(e)
}

/**
 * Puts a filter query into a useList's filters. Returns false when nothing
 * changed: the list then does not reload by itself and the caller reloads.
 */
export function applyFilters(filters: Record<string, unknown>, next: Record<string, unknown>): boolean {
  if (Object.entries(next).every(([k, v]) => filters[k] === v)) return false
  Object.assign(filters, next)
  return true
}
