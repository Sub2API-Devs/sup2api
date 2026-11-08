import { MODES, MODE_GROUPS, CONDITION_MODES, textToValue, type ConditionDraft, type OperationDraft, type Problem } from './model'

type T = (key: string, named?: Record<string, unknown>) => string
const P = 'accounts.paramOverride'

const short = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const shown = (text: string) => short(text.replace(/\s+/g, ' ').trim()) || '""'

/** The mode picker's options, grouped like new-api's (fields, strings, headers, control). */
export function modeOptions(t: T) {
  return MODE_GROUPS.map(group => ({
    value: group,
    label: t(`${P}.groups.${group}`),
    options: Object.keys(MODES)
      .filter(m => MODES[m].group === group)
      .map(m => ({ value: m, label: t(`${P}.modes.${m}`) }))
  }))
}

export const conditionModeOptions = (t: T) => CONDITION_MODES.map(m => ({ value: m, label: t(`${P}.cond.${m}`) }))

function describeCondition(c: ConditionDraft, t: T): string {
  const value = shown(c.valueText)
  const mode = t(`${P}.cond.${c.mode}`)
  return t(c.invert ? `${P}.say.condNot` : `${P}.say.cond`, { path: c.path || '?', mode, value })
}

/** What the operation does, in one line (without its conditions). */
export function describeAction(d: OperationDraft, t: T): string {
  const meta = MODES[d.mode]
  if (!meta) return t(`${P}.say.unsupported`, { mode: d.mode || '?' })
  const value =
    meta.value === 'list'
      ? d.list.join(', ')
      : meta.value === 'error'
        ? d.error.message
        : meta.value === 'header' && typeof textToValue(d.valueText) === 'object'
          ? t(`${P}.say.tokenMap`)
          : d.valueText
  return t(`${P}.say.${d.mode}`, {
    path: d.path || '?',
    from: shown(d.from),
    to: shown(d.to),
    value: shown(value),
    status: d.error.status_code
  })
}

/** "When model starts with claude- or …" (empty without conditions). */
export function describeConditions(d: OperationDraft, t: T): string {
  if (!d.conditions.length) return ''
  const joined = d.conditions.map(c => describeCondition(c, t)).join(t(d.logic === 'AND' ? `${P}.say.and` : `${P}.say.or`))
  return t(`${P}.say.when`, { conditions: joined })
}

export function describeOperation(d: OperationDraft, t: T): string {
  const when = describeConditions(d, t)
  return when ? `${when} → ${describeAction(d, t)}` : describeAction(d, t)
}

/** The list entry's name: the operator's description, or what it does. */
export const operationName = (d: OperationDraft, t: T) => d.description.trim() || describeAction(d, t)

const FIELD_LABELS: Record<string, string> = {
  description: 'description',
  mode: 'mode',
  path: 'path',
  from: 'textFrom',
  to: 'textTo',
  value: 'value',
  'error.message': 'errMessage',
  'error.status_code': 'errStatus',
  'cond.path': 'condPath',
  'cond.value': 'condValue'
}

/** The field a problem is about, as the editor labels it ("Condition 2 · Field path"). */
function fieldLabel(field: string, t: T): string {
  const cond = /^conditions\.(\d+)\.(\w+)$/.exec(field)
  if (cond) return `${t(`${P}.condition`)} ${Number(cond[1]) + 1} · ${t(`${P}.${FIELD_LABELS[`cond.${cond[2]}`]}`)}`
  return FIELD_LABELS[field] ? t(`${P}.${FIELD_LABELS[field]}`) : field
}

export function describeProblem(p: Problem, t: T): string {
  return t(`${P}.problems.${p.code}`, { field: fieldLabel(p.field, t), detail: p.detail ?? '' })
}
