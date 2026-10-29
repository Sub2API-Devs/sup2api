import type { ModelLimit } from '@/api/types'

/**
 * A card of the model limits editor: one set of limits and the model lists
 * sharing it (like new-api's 指定模型限速). Saved as one ModelLimit per list.
 */
export interface ModelLimitCard {
  lists: string[][]
  max_concurrency: number
  rpm_limit: number
  tpm_limit: number
}

const sameLimits = (a: Omit<ModelLimitCard, 'lists'>, b: Omit<ModelLimitCard, 'lists'>) =>
  a.max_concurrency === b.max_concurrency && a.rpm_limit === b.rpm_limit && a.tpm_limit === b.tpm_limit

/** Cards of saved model limits: consecutive lists with the same limits form one card. */
export function toCards(limits: ModelLimit[] | null | undefined): ModelLimitCard[] {
  const cards: ModelLimitCard[] = []
  for (const l of limits || []) {
    const v = { max_concurrency: l.max_concurrency || 0, rpm_limit: l.rpm_limit || 0, tpm_limit: l.tpm_limit || 0 }
    const last = cards[cards.length - 1]
    if (last && sameLimits(last, v)) last.lists.push([...l.models])
    else cards.push({ ...v, lists: [[...l.models]] })
  }
  return cards
}

/** One ModelLimit per non-empty list, with the limits of its card. */
export function fromCards(cards: ModelLimitCard[]): ModelLimit[] {
  const out: ModelLimit[] = []
  for (const c of cards) {
    for (const models of c.lists) {
      if (!models.length) continue
      out.push({ models: [...models], max_concurrency: Number(c.max_concurrency) || 0, rpm_limit: Number(c.rpm_limit) || 0, tpm_limit: Number(c.tpm_limit) || 0 })
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
