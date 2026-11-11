import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { rangeBounds, type RangeKey } from '@sub2api/ui'
import type { LocationQuery } from 'vue-router'

/** The search bar's starting filters: the range, and the fields it always sends. */
export function baseUsageFilters(range: RangeKey) {
  return {
    ...rangeBounds(range),
    model_contains: '',
    success: '',
    client_ip: '',
    // exact match on the client's X-Request-Id (CONTRACTS §14.4)
    client_request_id: ''
  }
}

/** Values of the operators' conversion filter (CONVERT-MATRIX §6.2): by grade, any converted grade, or with losses. */
export const CONVERSION_FILTERS = ['native', 'converted', 'good', 'fair', 'discouraged', 'local', 'lossy'] as const

/** Label key of a conversion filter value: the grade's, or the filter's own. */
export const conversionFilterLabel = (v: string) =>
  v === 'converted' || v === 'lossy' ? `usage.conversion.filters.${v}` : `accounts.conversion.grades.${v}`

const QUERY_FILTERS = ['user_id', 'group_name', 'model_contains', 'api_key_id', 'from', 'to'] as const

/** The filters a link presets (?user_id=…&from=…&to=…); a user cannot preset another user. */
export function queryUsageFilters(query: LocationQuery, admin: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of QUERY_FILTERS) {
    const v = query[k]
    if (typeof v === 'string' && v !== '' && (admin || (k !== 'user_id' && k !== 'group_name'))) out[k] = v
  }
  return out
}

// A search field is named after the query parameter it sets, except the
// boxes that take an id or a name: all digits set the id (user 7 is
// user_id=7), any other text the name (user_email contains "ann").
const ID_OR_NAME: Record<string, readonly [id: string, name: string]> = {
  user: ['user_id', 'user_email'],
  api_key: ['api_key_id', 'api_key_name'],
  account: ['account_id', 'account_name']
}

/** The query parameters a search field sets. */
export const fieldParams = (field: string): readonly string[] => ID_OR_NAME[field] ?? [field]

/** What a search field shows for the parameters `values`: the id, else the name. */
export function fieldText(values: Record<string, unknown>, field: string): string {
  const [id, name] = ID_OR_NAME[field] ?? [field]
  return String(values[id] || (name && values[name]) || '')
}

/** The parameters a search field sets for the text typed in it (the other one of an id-or-name box cleared). */
export function fieldPatch(field: string, text: string): Record<string, string> {
  const pair = ID_OR_NAME[field]
  if (!pair) return { [field]: text }
  const isId = /^\d+$/.test(text.trim())
  return { [pair[0]]: isId ? text : '', [pair[1]]: isId ? '' : text }
}

/** Who searches, and under which log type. */
export interface UsageSearchContext {
  admin: boolean
  /** An operator who may read accounts gets the account filter. */
  accounts: boolean
  /** Groups are picked from a list (group_id), not typed (group_name). */
  groupSelect: boolean
  /** The failed requests log type: the status is settled, the HTTP status and error type join. */
  errors: boolean
}

/** Parameters the search keeps without a field of its own: set by a link or a table action, shown as removable chips. */
const HIDDEN = ['group_id', 'group_name', 'success', 'status_code', 'error_type', 'client_request_id', 'platform', 'endpoint', 'stream']
const ADMIN_HIDDEN = ['plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol']

/**
 * The usage search, after new-api's log filters: the common fields on the
 * first row (`primary`, after the range and log type), the less used behind
 * More filters (`advanced`), every parameter it manages (`params`; Reset
 * clears them all) and those shown as chips when set (`tagged`: all but the
 * first row's, and the status the failed requests type sets itself).
 */
export function usageSearchLayout(c: UsageSearchContext) {
  const group = c.groupSelect ? 'group_id' : 'group_name'
  const primary = ['model_contains', c.admin ? 'user' : group, 'api_key']
  const advanced = [
    ...(c.admin ? [group, 'request_id'] : ['request_id']),
    ...(c.admin && c.accounts ? ['account'] : []),
    'client_ip',
    'protocol',
    ...(c.admin ? ['conversion'] : []),
    ...(c.errors ? [] : ['success']),
    'billing_status',
    ...(c.errors ? ['status_code', 'error_type'] : [])
  ]
  const params = [...new Set([...primary, ...advanced, ...HIDDEN, ...(c.admin ? ADMIN_HIDDEN : [])].flatMap(fieldParams))]
  const untagged = [...primary.flatMap(fieldParams), ...(c.errors ? ['success'] : [])]
  return { primary, advanced, params, tagged: params.filter(p => !untagged.includes(p)) }
}

/** Parameters labelled outside usage.search. */
const LABEL_KEYS: Record<string, string> = { success: 'common.status', billing_status: 'usage.billing.statusLabel' }

/**
 * Labels of the usage search: `label` names a field or parameter, `options`
 * holds the choices of those picked from a list (the empty first choice names
 * the filter, as the fields carry no labels), `valueLabel` reads a set value
 * as its choice. `groupOptions` and `protocolOptions` (the request types under
 * the search) fill the group and type lists; a type already set stays listed.
 */
export function useUsageSearchLabels(
  groupOptions: MaybeRefOrGetter<Array<{ value: string | number; label: string }>>,
  protocolOptions: MaybeRefOrGetter<string[]>,
  protocol: MaybeRefOrGetter<string>
) {
  const { t } = useI18n()
  const label = (key: string) => t(LABEL_KEYS[key] ?? `usage.search.${key}`)
  const choices = (key: string, list: Array<{ value: string | number; label: string }>) => [
    { value: '', label: label(key) },
    ...list.filter(o => o.value !== '').map(o => ({ value: String(o.value), label: o.label }))
  ]
  const options = computed<Record<string, Array<{ value: string; label: string }>>>(() => {
    const groups = toValue(groupOptions)
    const types = toValue(protocolOptions)
    const current = toValue(protocol)
    return {
      ...(groups.length ? { group_id: choices('group_id', groups) } : {}),
      protocol: choices('protocol', [...types, ...(current && !types.includes(current) ? [current] : [])].map(v => ({ value: v, label: v }))),
      conversion: choices('conversion', CONVERSION_FILTERS.map(v => ({ value: v, label: t(conversionFilterLabel(v)) }))),
      success: choices('success', [{ value: 'true', label: t('usage.success.ok') }, { value: 'false', label: t('usage.success.failed') }]),
      billing_status: choices('billing_status', ['billed', 'free', 'pending', 'failed'].map(v => ({ value: v, label: t(`usage.billing.status.${v}`) }))),
      stream: choices('stream', [{ value: 'true', label: t('usage.stream') }, { value: 'false', label: t('usage.nonStream') }])
    }
  })
  const valueLabel = (key: string, value: string) => options.value[key]?.find(o => o.value === value && value !== '')?.label ?? value
  return { label, options, valueLabel }
}
