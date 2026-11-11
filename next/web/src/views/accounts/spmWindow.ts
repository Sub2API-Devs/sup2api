// The window of a session cap (spm_window_seconds, CONTRACTS §71): stored in
// seconds, 1 minute to 24 hours, absent = 1 minute. Edited as a whole number
// of minutes or hours and shown short ("5m", "1h"); a window that is not whole
// minutes (set through the API) shows in seconds. The account editor, the
// model limit cards, the bulk edit and the list share these helpers.

export const SPM_WINDOW_DEFAULT = 60
const SPM_WINDOW_MIN = 60
const SPM_WINDOW_MAX = 86_400

export type WindowUnit = 'second' | 'minute' | 'hour'
/** Units offered by the window input; seconds only show a window already in them. */
export const WINDOW_UNITS: readonly WindowUnit[] = ['minute', 'hour']
const SECONDS: Record<WindowUnit, number> = { second: 1, minute: 60, hour: 3600 }

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

/** The largest unit that divides the seconds. */
const unitOf = (seconds: number): WindowUnit =>
  seconds % SECONDS.hour === 0 ? 'hour' : seconds % SECONDS.minute === 0 ? 'minute' : 'second'

/** Seconds as the input shows them, in the largest whole unit; null stays empty in `unit`. */
export function splitWindow(seconds: number | null, unit: WindowUnit = 'minute'): WindowParts {
  if (seconds == null) return { value: null, unit }
  const u = unitOf(seconds)
  return { value: seconds / SECONDS[u], unit: u }
}

/** The input's window in seconds: null while empty, NaN when not a whole number (refused by validWindow). */
export const joinWindow = (p: WindowParts): number | null =>
  p.value == null ? null : Number.isInteger(p.value) ? p.value * SECONDS[p.unit] : NaN

/** Bounds of the input's value in a unit. */
export const unitRange = (unit: WindowUnit): [number, number] => [Math.ceil(SPM_WINDOW_MIN / SECONDS[unit]), SPM_WINDOW_MAX / SECONDS[unit]]

type Translate = (key: string, values?: Record<string, unknown>) => string

/** Short label of a window: "5m" / "1h" / "90s" ("5分" / "1小时" / "90秒"). */
export function formatWindow(t: Translate, seconds: number | null | undefined): string {
  const { value, unit } = splitWindow(windowOf(seconds))
  return t(`accounts.spmWindow.short.${unit}`, { n: value })
}
