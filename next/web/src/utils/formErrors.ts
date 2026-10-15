import type { Ref } from 'vue'
import { fieldErrors, notifyError } from '@/utils/errors'

/**
 * Shows a failed form submission the same way everywhere: server field errors
 * (invalid_argument with `fields`) go to `errors` and are shown next to the
 * fields only; any other error is shown as a toast. Returns true when field
 * errors were found.
 */
export function applyFormError(e: unknown, errors: Ref<Record<string, string>>): boolean {
  errors.value = fieldErrors(e)
  if (Object.keys(errors.value).length) return true
  notifyError(e)
  return false
}
