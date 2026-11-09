// claude_default_max_tokens (CONVERT-MATRIX §6.1) as editable rows: the
// "default" row first, then the models in server order.
import { CLAUDE_MAX_TOKENS } from '@/api/types'

export interface MaxTokensRow {
  model: string
  tokens: number | null
}

const { fallbackKey, fallback } = CLAUDE_MAX_TOKENS

/** The rows of a server map; a missing "default" gets the server's fallback. */
export function maxTokensRows(map: Record<string, number> | null | undefined): MaxTokensRow[] {
  const m = map || {}
  const models = Object.entries(m)
    .filter(([k]) => k !== fallbackKey)
    .map(([model, tokens]) => ({ model, tokens }))
  return [{ model: fallbackKey, tokens: m[fallbackKey] ?? fallback }, ...models]
}

/** Why the rows cannot be saved, as an error code; blank added rows are left out. */
export type MaxTokensError = 'value' | 'model' | 'duplicate' | 'too_many'

/** The map to save, or the first problem. Model names are trimmed. */
export function maxTokensMap(rows: MaxTokensRow[]): { map: Record<string, number> } | { error: MaxTokensError } {
  const map = new Map<string, number>()
  const kept = rows.filter(r => r.model.trim() || r.tokens !== null)
  if (kept.length > CLAUDE_MAX_TOKENS.models) return { error: 'too_many' }
  for (const r of kept) {
    const model = r.model.trim()
    if (!model || model.length > CLAUDE_MAX_TOKENS.nameLength) return { error: 'model' }
    if (map.has(model)) return { error: 'duplicate' }
    if (r.tokens === null || !Number.isInteger(r.tokens) || r.tokens < 0 || r.tokens > CLAUDE_MAX_TOKENS.max) return { error: 'value' }
    map.set(model, r.tokens)
  }
  return { map: Object.fromEntries(map) }
}
