// Model ids of an account's model list and mapping (CONTRACTS §16): complete
// ids only, no wildcards. Pure, shared by the account editor and the model test.

const MODEL_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/

export const isModelId = (s: string) => MODEL_RE.test(s) && !s.includes('*')

/** Ids typed or pasted as text: separated by whitespace or commas. */
export const splitModelIds = (raw: string) => raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)

export type ModelIdProblem = { kind: 'invalid' | 'duplicate'; model: string }

/** Parses typed ids appended to `existing`: the new ids, or the first invalid / repeated one. */
export function parseModelIds(raw: string, existing: readonly string[] = []): { ids: string[] } | { problem: ModelIdProblem } {
  const seen = new Set(existing)
  const ids: string[] = []
  for (const model of splitModelIds(raw)) {
    if (!isModelId(model)) return { problem: { kind: 'invalid', model } }
    if (seen.has(model)) return { problem: { kind: 'duplicate', model } }
    seen.add(model)
    ids.push(model)
  }
  return { ids }
}

/** `null` when `v` is a {model: model} object; otherwise what is wrong with it. */
export function mappingProblem(v: unknown): { kind: 'notObject' } | ModelIdProblem | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return { kind: 'notObject' }
  for (const [from, to] of Object.entries(v as Record<string, unknown>)) {
    if (typeof to !== 'string') return { kind: 'notObject' }
    if (!isModelId(from)) return { kind: 'invalid', model: from }
    if (!isModelId(to)) return { kind: 'invalid', model: to }
  }
  return null
}

/** Appends the ids not listed yet. */
export const mergeIds = (list: readonly string[], add: readonly string[]) => [...new Set([...list, ...add])]
