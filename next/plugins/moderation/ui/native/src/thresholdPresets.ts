import type { Defaults } from './host'

// OpenAI moderation threshold presets (new-api threshold-presets): the
// default thresholds scaled. A higher threshold flags less.

export const THRESHOLD_PRESETS = [
  { id: 'loose', factor: 1.1 },
  { id: 'default', factor: 1 },
  { id: 'strict', factor: 0.75 }
] as const

export type ThresholdPreset = (typeof THRESHOLD_PRESETS)[number]['id']
type Base = Pick<Defaults, 'openai_categories' | 'openai_thresholds'>

/** The thresholds of a preset; the default preset is no override at all. */
export function presetThresholds(base: Base, factor: number): Record<string, number> {
  if (factor === 1) return {}
  return Object.fromEntries(base.openai_categories.map((c) => [c, Math.min(1, Number((base.openai_thresholds[c] * factor).toFixed(2)))]))
}

/** Which preset the overrides amount to; null = customized. */
export function thresholdPresetOf(base: Base, overrides: Record<string, number>): ThresholdPreset | null {
  const effective = (m: Record<string, number>, c: string) => m[c] ?? base.openai_thresholds[c]
  const match = THRESHOLD_PRESETS.find((p) => {
    const expected = presetThresholds(base, p.factor)
    return base.openai_categories.every((c) => effective(overrides, c) === effective(expected, c))
  })
  return match?.id ?? null
}
