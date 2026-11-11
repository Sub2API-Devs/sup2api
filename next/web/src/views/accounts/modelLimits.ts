import type { ModelLimit } from '@/api/types'
import { SPM_WINDOW_DEFAULT, windowOf } from './spmWindow'

/**
 * A card of the model limits editor: one set of limits and the model lists
 * sharing it (like new-api's 指定模型限速). Saved as one ModelLimit per list.
 */
export interface ModelLimitCard {
  lists: string[][]
  max_concurrency: number
  rpm_limit: number
  tpm_limit: number
  spm_limit: number
  /** Window of spm_limit in seconds; null while its input is empty (the default). */
  spm_window_seconds: number | null
}

type Caps = Omit<ModelLimitCard, 'lists'>
const CAPS = ['max_concurrency', 'rpm_limit', 'tpm_limit', 'spm_limit'] as const

/** The caps of a saved entry or a card as numbers, absent = 0; then with the window, absent = the default. */
const limitsOf = (l: Partial<Caps>) => Object.fromEntries(CAPS.map((k) => [k, Number(l[k]) || 0])) as Record<(typeof CAPS)[number], number>
const capsOf = (l: Partial<Caps>): Caps => ({ ...limitsOf(l), spm_window_seconds: windowOf(l.spm_window_seconds) })
const sameCaps = (a: Caps, b: Caps) => CAPS.every((k) => a[k] === b[k]) && a.spm_window_seconds === b.spm_window_seconds
/** The caps an entry saves: the window only when it is not the default (absent = 1 minute). */
function savedCaps(c: Caps): Omit<ModelLimit, 'models'> {
  const seconds = windowOf(c.spm_window_seconds)
  return seconds === SPM_WINDOW_DEFAULT ? limitsOf(c) : { ...limitsOf(c), spm_window_seconds: seconds }
}

/** An empty card. */
export const newCard = (): ModelLimitCard => ({ lists: [[]], ...capsOf({}) })

/** Cards of saved model limits: consecutive lists with the same limits form one card. */
export function toCards(limits: ModelLimit[] | null | undefined): ModelLimitCard[] {
  const cards: ModelLimitCard[] = []
  for (const l of limits || []) {
    const v = capsOf(l)
    const last = cards[cards.length - 1]
    if (last && sameCaps(last, v)) last.lists.push([...l.models])
    else cards.push({ ...v, lists: [[...l.models]] })
  }
  return cards
}

/** One ModelLimit per non-empty list, with the limits of its card. */
export function fromCards(cards: ModelLimitCard[]): ModelLimit[] {
  const out: ModelLimit[] = []
  for (const c of cards) {
    for (const models of c.lists) {
      if (models.length) out.push({ models: [...models], ...savedCaps(c) })
    }
  }
  return out
}

/** Card and list of each saved entry (fromCards order), to place server errors model_limits[i]. */
export function entryPositions(cards: ModelLimitCard[]): Array<{ card: number; list: number }> {
  const out: Array<{ card: number; list: number }> = []
  cards.forEach((c, card) => c.lists.forEach((models, list) => models.length && out.push({ card, list })))
  return out
}

/** The first model that is in another list already, or ''. */
export function repeatedModel(cards: ModelLimitCard[]): string {
  const seen = new Set<string>()
  for (const c of cards) {
    for (const list of c.lists) {
      for (const m of new Set(list)) {
        if (seen.has(m)) return m
        seen.add(m)
      }
    }
  }
  return ''
}
