// The window of a session cap (spm_window_seconds, CONTRACTS §71): stored in
// seconds, 1 minute to 24 hours, absent = 1 minute. Edited as a number and a
// unit (minutes / hours) and shown short ("5m", "1h"). The account editor,
// the model limit cards, the bulk edit and the list share these helpers.

export const SPM_WINDOW_DEFAULT = 60
export const SPM_WINDOW_MIN = 60
export const SPM_WINDOW_MAX = 86_400

/** Units of the window input; a short label may also count seconds (a window set through the API). */
export type WindowUnit = 'minute' | 'hour'
export const WINDOW_UNITS: readonly WindowUnit[] = ['minute', 'hour']
const SECONDS: Record<WindowUnit | 'second', number> = { second: 1, minute: 60, hour: 3600 }

/** A window as the input shows it; value null while the input is empty. */
export interface WindowParts {
  value: number | null
  unit: WindowUnit
}

/** The window in seconds, absent or empty (null, 0) being the default. */
export const windowOf = (seconds: number | null | undefined): number => Number(seconds) || SPM_WINDOW_DEFAULT

/** Whether a window may be saved: empty (the default) or whole seconds from 1 minute to 24 hours. */
export const validWindow = (seconds: number | null | undefined): boolean =>
  seconds == null || (Number.isInteger(seconds) && seconds >= SPM_WINDOW_MIN && seconds <= SPM_WINDOW_MAX)

/** Seconds as the input shows them: whole hours in hours, anything else in minutes; null stays empty. */
export function splitWindow(seconds: number | null, unit: WindowUnit = 'minute'): WindowParts {
  if (seconds == null) return { value: null, unit }
  const u: WindowUnit = seconds % SECONDS.hour === 0 ? 'hour' : 'minute'
  return { value: seconds / SECONDS[u], unit: u }
}

/** The input's window in seconds (null while empty). */
export const joinWindow = (p: WindowParts): number | null => (p.value == null ? null : Math.round(p.value * SECONDS[p.unit]))

/** Largest value of a unit in the input. */
export const unitMax = (unit: WindowUnit) => SPM_WINDOW_MAX / SECONDS[unit]

type Translate = (key: string, values?: Record<string, unknown>) => string

/** Short label of a window: "5m" / "1h" ("5分" / "1小时"), seconds when it is not whole minutes. */
export function formatWindow(t: Translate, seconds: number | null | undefined): string {
  const s = windowOf(seconds)
  const unit = s % SECONDS.hour === 0 ? 'hour' : s % SECONDS.minute === 0 ? 'minute' : 'second'
  return t(`accounts.spmWindow.short.${unit}`, { n: s / SECONDS[unit] })
}
