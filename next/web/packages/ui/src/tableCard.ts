// STable's phone card: where each column goes, and the hint that tells
// components inside a card (SRowAction) to take their inline form.
// Placement: a column that declares `mobile` keeps that place ('hidden' drops
// it) and, once any column declares one, undeclared columns go behind the
// details toggle. With no declaration at all the card infers: the first
// column is the title, a column keyed `status` / `enabled` the status, the
// next four the meta grid, the rest the details. The `actions` column is the
// footer unless it declares a place itself.
import type { InjectionKey } from 'vue'
import type { TableColumn } from './types'

export type CardArea = 'title' | 'subtitle' | 'status' | 'meta' | 'detail' | 'actions'
export type CardFields = Record<CardArea, TableColumn[]>

const STATUS_KEYS = new Set(['status', 'enabled'])
const INFERRED_META = 4

/** Card areas of the shown `columns`; `all` (every declared column) decides whether placement is declared. */
export function cardFields(columns: readonly TableColumn[], all: readonly TableColumn[] = columns): CardFields {
  const fields: CardFields = { title: [], subtitle: [], status: [], meta: [], detail: [], actions: [] }
  const declared = all.some(c => c.mobile)
  for (const c of columns) {
    const inferred = !fields.title.length
      ? 'title'
      : STATUS_KEYS.has(c.key)
        ? 'status'
        : fields.meta.length < INFERRED_META
          ? 'meta'
          : 'detail'
    const area = c.mobile ?? (c.key === 'actions' ? 'actions' : declared ? 'detail' : inferred)
    if (area !== 'hidden') fields[area].push(c)
  }
  return fields
}

/** Provided (true) by STable's card list to everything rendered inside a card. */
export const TABLE_CARD: InjectionKey<boolean> = Symbol('s-table-card')
