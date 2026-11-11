import type { FilterChipItem, SelectOption } from '@sub2api/ui'

// Filters of the records tab (EventsTab): the selects that stand for two
// query parameters (verdict, flow) and the chips of the applied filters.

/** The verdict select sets one of these query parameters at a time. */
export const CONCLUSION_PARAMS = ['review_status', 'ai_verdict', 'verdict'] as const
export type ConclusionParam = (typeof CONCLUSION_PARAMS)[number]

/**
 * Options of a select that stands for two query parameters: each value is
 * "<first>:<option value>" (a verdict parameter and its value, a flow id and
 * a version).
 */
export const pairOptions = (first: string | number, options: SelectOption[]): SelectOption[] => options.map((o) => ({ ...o, value: `${first}:${o.value}` }))

function splitPair(v: string): [string, string] {
  const i = v.indexOf(':')
  return i < 0 ? ['', ''] : [v.slice(0, i), v.slice(i + 1)]
}

/** The verdict select's value as its query: "review_status:pending" sets review_status, the other two ''. */
export function conclusionQuery(v: string): Record<ConclusionParam, string> {
  const [param, value] = splitPair(v)
  return { review_status: '', ai_verdict: '', verdict: '', ...(CONCLUSION_PARAMS.includes(param as ConclusionParam) && { [param]: value }) }
}

/** The verdict select's value of a query ('' when none of its parameters is set). */
export function conclusionValue(q: Partial<Record<ConclusionParam, unknown>>): string {
  const param = CONCLUSION_PARAMS.find((p) => q[p])
  return param ? `${param}:${q[param]}` : ''
}

/** The flow select's value as its query: "<flow id>:<version>", an empty version for every version. */
export function flowQuery(v: string): { flow_id: number | ''; flow_version: number | '' } {
  const [id, version] = splitPair(v)
  return { flow_id: id ? Number(id) : '', flow_version: id && version ? Number(version) : '' }
}

/** The flow select's value of a query ('' without flow_id). */
export const flowValue = (q: { flow_id?: unknown; flow_version?: unknown }): string => (q.flow_id ? `${q.flow_id}:${q.flow_version || ''}` : '')

/** A filter field: a select (its options), else a text input. */
export interface FilterField<K extends string = string> {
  key: K
  label: string
  options?: SelectOption[]
}

export const isSet = (v: unknown): boolean => v !== undefined && v !== null && String(v).trim() !== ''

/** The label of a select's value, "group · option" inside an optgroup; the value itself when no option has it. */
export function optionText(options: SelectOption[], value: unknown): string {
  for (const o of options) {
    const hit = o.options?.find((c) => String(c.value) === String(value))
    if (hit) return `${o.label} · ${hit.label}`
    if (!o.options && String(o.value) === String(value)) return o.label
  }
  return String(value)
}

/** Chips of the fields set in `values` (the applied filters, keyed like the fields), in field order. */
export function filterChips(fields: FilterField[], values: Record<string, unknown>): FilterChipItem[] {
  return fields
    .filter((f) => isSet(values[f.key]))
    .map((f) => ({ key: f.key, label: f.label, value: f.options ? optionText(f.options, values[f.key]) : String(values[f.key]).trim() }))
}
