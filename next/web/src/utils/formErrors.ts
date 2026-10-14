import type { Ref } from 'vue'
import { fieldErrors, notifyError } from '@/utils/errors'

/**
 * Shows a failed form submission the same way everywhere: server field errors
 * (invalid_argument with `fields`) go to `errors` and are shown next to the
 * fields only; any other error is shown as a toast. `strip` removes a field
 * prefix such as "credentials.". Returns true when field errors were found.
 */
export function applyFormError(e: unknown, errors: Ref<Record<string, string>>, strip?: string): boolean {
  const fe = fieldErrors(e, strip)
  errors.value = fe
  if (Object.keys(fe).length) return true
  notifyError(e)
  return false
}
