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

/** Where a column goes, given whether placement is declared and the fields placed so far. */
function areaOf(column: TableColumn, declared: boolean, fields: CardFields): CardArea | 'hidden' {
  if (column.mobile) return column.mobile
  if (column.key === 'actions') return 'actions'
  if (declared) return 'detail'
  if (!fields.title.length) return 'title'
  if (STATUS_KEYS.has(column.key)) return 'status'
  return fields.meta.length < INFERRED_META ? 'meta' : 'detail'
}

/** Card areas of the shown `columns`; `all` (every declared column) decides whether placement is declared. */
export function cardFields(columns: readonly TableColumn[], all: readonly TableColumn[] = columns): CardFields {
  const fields: CardFields = { title: [], subtitle: [], status: [], meta: [], detail: [], actions: [] }
  const declared = all.some(c => c.mobile)
  for (const c of columns) {
    const area = areaOf(c, declared, fields)
    if (area !== 'hidden') fields[area].push(c)
  }
  return fields
}

/** True inside an STable phone card: STable provides false, its card list true (nested tables reset it). */
export const TABLE_CARD: InjectionKey<boolean> = Symbol('s-table-card')
