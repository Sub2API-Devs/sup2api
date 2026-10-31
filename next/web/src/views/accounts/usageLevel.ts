// One colour scale for figures used against a cap: the limits pills, the usage
// limit of the usage cell and the plan windows.

export type UsageLevel = 'ok' | 'warning' | 'danger'

/** Level of a used share (1 = the cap): danger from `danger`, warning from `warning`. */
export function usageLevel(share: number, warning = 0.8, danger = 1): UsageLevel {
  if (share >= danger) return 'danger'
  return share >= warning ? 'warning' : 'ok'
}

/** Text colour of a figure at each level. */
export const LEVEL_TEXT: Record<UsageLevel, string> = {
  ok: 'text-fg',
  warning: 'text-warning-700 dark:text-warning-300',
  danger: 'text-danger-700 dark:text-danger-300'
}
