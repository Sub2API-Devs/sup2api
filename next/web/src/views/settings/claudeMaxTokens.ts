// claude_max_tokens.models (CONVERT-MATRIX §6.1) as editable rows, in server
// order. "default" is an ordinary row: it stands for every other model.
import { CLAUDE_MAX_TOKENS } from '@/api/types'

export interface MaxTokensRow {
  model: string
  tokens: number | null
}

/** The rows of a server map. */
export function maxTokensRows(map: Record<string, number> | null | undefined): MaxTokensRow[] {
  return Object.entries(map || {}).map(([model, tokens]) => ({ model, tokens }))
}

/** Why the rows cannot be saved, as an error code; blank added rows are left out. */
export type MaxTokensError = 'value' | 'model' | 'duplicate' | 'too_many'

/** The map to save, or the first problem. Model names are trimmed, and their length is in characters (code points), as on the server. */
export function maxTokensMap(rows: MaxTokensRow[]): { map: Record<string, number> } | { error: MaxTokensError } {
  const { min, max, models, nameLength } = CLAUDE_MAX_TOKENS
  const map = new Map<string, number>()
  const kept = rows.filter(r => r.model.trim() || r.tokens !== null)
  if (kept.length > models) return { error: 'too_many' }
  for (const r of kept) {
    const model = r.model.trim()
    if (!model || [...model].length > nameLength) return { error: 'model' }
    if (map.has(model)) return { error: 'duplicate' }
    if (r.tokens === null || !Number.isInteger(r.tokens) || r.tokens < min || r.tokens > max) return { error: 'value' }
    map.set(model, r.tokens)
  }
  return { map: Object.fromEntries(map) }
}
