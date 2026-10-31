import type { Defaults } from './types'

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

/**
 * The overrides of threshold inputs as sent. An input left empty or cleared
 * (SInput type=number gives null) is dropped, so the category keeps its
 * default; String(null) would otherwise become "null" and send 0, which the
 * backend rejects (a threshold must be > 0).
 */
export function thresholdOverrides(inputs: Record<string, string | number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(inputs)) {
    if (v === null || v === undefined || String(v).trim() === '') continue
    const n = Number(v)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}
