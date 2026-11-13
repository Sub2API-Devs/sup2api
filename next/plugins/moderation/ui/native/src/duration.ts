// A duration kept in seconds and edited as a number with a unit
// (DurationInput): the shown unit is the largest one the value is a whole
// number of, so 600 shows as 10 minutes and 90 as 90 seconds.

export const DURATION_UNITS = { s: 1, m: 60, h: 3600 } as const
export type DurationUnit = keyof typeof DURATION_UNITS
export const ALL_DURATION_UNITS = Object.keys(DURATION_UNITS) as DurationUnit[]

/** The number and unit seconds show as, among units (largest first that divides it); null / 0 keep the largest unit. */
export function splitDuration(seconds: number | null | undefined, units: readonly DurationUnit[] = ALL_DURATION_UNITS): { n: number | null; unit: DurationUnit } {
  const sorted = [...units].sort((a, b) => DURATION_UNITS[b] - DURATION_UNITS[a])
  const smallest = sorted[sorted.length - 1]
  if (!seconds) return { n: seconds ?? null, unit: sorted[0] }
  const unit = sorted.find((u) => seconds % DURATION_UNITS[u] === 0) ?? smallest
  return { n: seconds / DURATION_UNITS[unit], unit }
}

/** Seconds of n units; null while the number is empty. */
export const joinDuration = (n: number | null, unit: DurationUnit): number | null => (n === null ? null : Math.round(n * DURATION_UNITS[unit]))
