// OpenAI threshold presets (new-api auditors/threshold-presets.ts): the
// built-in defaults scaled. Pure functions over the defaults of
// GET /jev/default-questions (openai_categories, openai_thresholds).

export type Thresholds = Record<string, number | undefined>

export const THRESHOLD_PRESETS = [
  { id: 'loose', factor: 1.1 },
  { id: 'default', factor: 1 },
  { id: 'strict', factor: 0.75 }
] as const

export type ThresholdPreset = (typeof THRESHOLD_PRESETS)[number]['id']

/** Thresholds of a preset; the default preset is {} (every category on its default). */
export function presetThresholds(factor: number, categories: readonly string[], defaults: Record<string, number>): Record<string, number> {
  if (factor === 1) return {}
  const out: Record<string, number> = {}
  for (const c of categories) {
    if (defaults[c] === undefined) continue
    out[c] = Math.min(1, Number((defaults[c] * factor).toFixed(2)))
  }
  return out
}

/** Which preset a threshold map equals; null = customized. */
export function thresholdPresetOf(th: Thresholds, categories: readonly string[], defaults: Record<string, number>): ThresholdPreset | null {
  if (categories.every((c) => th[c] === undefined)) return 'default'
  const match = THRESHOLD_PRESETS.find((p) => {
    const expected = presetThresholds(p.factor, categories, defaults)
    return categories.every((c) => (th[c] ?? defaults[c]) === (expected[c] ?? defaults[c]))
  })
  return match?.id ?? null
}

/** Form values (strings, '' = default) as a threshold map. */
export function parseThresholds(form: Record<string, string | number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(form)) if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = Number(v)
  return out
}
