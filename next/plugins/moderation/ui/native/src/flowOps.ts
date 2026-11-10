import type { Auditor, AuditorType, Channel, Flow, Spec, Stage } from './types'

// Flow editing operations of the canvas editor (CONTRACTS §72.7), ported from
// new-api web/shared/src/content-moderation/ops.ts + validate.ts. Every
// function returns a new spec and never mutates its input; an operation that
// would produce an invalid arrangement (unsupported type, the same auditor
// twice in a stage, past the stage / auditor limits) returns the input
// unchanged, so callers compare by identity to detect a no-op.
//
// Differences from new-api: the spec has no `enabled` (flows.enabled is its
// own column), four auditor types can be placed, at most 8 stages of at
// most 8 auditors (internal/moderation/flow.go).
//
// Stage order: the review stages first, then the fallback stages (补审,
// Stage.fallback). Every operation keeps that order.

export type Combine = Stage['combine']

/** Looks up an auditor's type; undefined when the auditor does not exist. */
type AuditorTypeOf = (id: number) => string | undefined

const AUDITOR_TYPES: readonly AuditorType[] = ['openai_moderation', 'typesafe', 'llm_verdict', 'llm_questions']
export const MAX_STAGES = 8
export const MAX_STAGE_AUDITORS = 8
export const TOTAL_TIMEOUT_MIN_MS = 1000
export const TOTAL_TIMEOUT_MAX_MS = 120_000
export const NAME_MAX = 64

/**
 * A manual total timeout typed in seconds, as ms; null when it cannot be a
 * manual value (empty, not a number, 0 or less: 0 means automatic). Values
 * out of 1–120 s are returned, the publish check reports them.
 */
export function manualTimeoutMs(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (s === '') return null
  const ms = Math.round(Number(s) * 1000)
  return Number.isFinite(ms) && ms > 0 ? ms : null
}
export const COMBINES: readonly Combine[] = ['any', 'all', 'at_least']

/** Channel timeout used when a channel stores 0 (§72.6 defaults by type). */
export const DEFAULT_CHANNEL_TIMEOUT_MS: Record<string, number> = {
  openai_moderation: 3000,
  typesafe: 8000,
  llm: 15000,
  llm_verdict: 15000,
  llm_questions: 15000
}

export function isAuditorType(type: string | undefined): type is AuditorType {
  return (AUDITOR_TYPES as readonly (string | undefined)[]).includes(type)
}

/** A blank draft: all models, 100 % sampling, timeout computed on publish. */
export function newSpec(): Spec {
  return { model_filter: { type: 'all', models: [] }, sample_rate: 100, total_timeout_ms: 0, stages: [] }
}

const withStages = (spec: Spec, stages: Stage[]): Spec => ({ ...spec, stages })

/** How many review stages lead the list: the index of the first fallback stage (all of them when there is none). */
export function reviewStageCount(stages: readonly Pick<Stage, 'fallback'>[]): number {
  const first = stages.findIndex((s) => s.fallback)
  return first < 0 ? stages.length : first
}

/** Inserts a review stage holding one auditor at `at` (default: last); it never lands behind a fallback stage. */
export function addStage(spec: Spec, auditor: number, typeOf: AuditorTypeOf, at: number = spec.stages.length): Spec {
  if (!isAuditorType(typeOf(auditor)) || spec.stages.length >= MAX_STAGES) return spec
  const stages = [...spec.stages]
  stages.splice(Math.min(at, reviewStageCount(stages)), 0, { auditors: [auditor], combine: 'any' })
  return withStages(spec, stages)
}

export function removeStage(spec: Spec, index: number): Spec {
  if (!spec.stages[index]) return spec
  return withStages(
    spec,
    spec.stages.filter((_, i) => i !== index)
  )
}

/**
 * Moves a stage to another position (stage order is the check order). A
 * review stage stays among the review stages and a fallback stage among the
 * fallback stages: a target across that border is a no-op (setFallback
 * changes what a stage is).
 */
export function moveStage(spec: Spec, from: number, to: number): Spec {
  if (from === to || !spec.stages[from] || to < 0 || to >= spec.stages.length) return spec
  if (!!spec.stages[from].fallback !== !!spec.stages[to].fallback) return spec
  const stages = [...spec.stages]
  const [stage] = stages.splice(from, 1)
  stages.splice(to, 0, stage)
  return withStages(spec, stages)
}

/** Adds an auditor to a stage (in parallel); no duplicates, allowed types only. */
export function addAuditor(spec: Spec, stageIndex: number, auditor: number, typeOf: AuditorTypeOf): Spec {
  const stage = spec.stages[stageIndex]
  if (!stage || stage.auditors.includes(auditor) || stage.auditors.length >= MAX_STAGE_AUDITORS) return spec
  if (!isAuditorType(typeOf(auditor))) return spec
  return withStages(
    spec,
    spec.stages.map((s, i) => (i === stageIndex ? { ...s, auditors: [...s.auditors, auditor] } : s))
  )
}

/** Removes the auditor at `auditorIndex`; a stage left empty is removed too. */
export function removeAuditor(spec: Spec, stageIndex: number, auditorIndex: number): Spec {
  const stage = spec.stages[stageIndex]
  if (!stage || auditorIndex < 0 || auditorIndex >= stage.auditors.length) return spec
  const auditors = stage.auditors.filter((_, i) => i !== auditorIndex)
  if (!auditors.length) return removeStage(spec, stageIndex)
  return withStages(
    spec,
    spec.stages.map((s, i) => (i === stageIndex ? { ...s, auditors } : s))
  )
}

/**
 * Moves an auditor within or across stages. `to.stage === stages.length`
 * creates a new review stage, the last one before the fallback stages;
 * `to.index` defaults to the end of the target.
 * A source stage left empty is removed. A target that already has the
 * auditor (or is full) is a no-op.
 */
function moveAuditor(spec: Spec, from: { stage: number; index: number }, to: { stage: number; index?: number }): Spec {
  const auditor = spec.stages[from.stage]?.auditors[from.index]
  if (auditor === undefined) return spec
  if (to.stage < 0 || to.stage > spec.stages.length) return spec
  const target = spec.stages[to.stage]
  if (to.stage !== from.stage && target && (target.auditors.includes(auditor) || target.auditors.length >= MAX_STAGE_AUDITORS)) return spec
  // A new stage is only refused when the source stage stays (it would add one).
  if (!target && spec.stages.length >= MAX_STAGES && spec.stages[from.stage].auditors.length > 1) return spec

  const stages: Stage[] = spec.stages.map((s) => ({ ...s, auditors: [...s.auditors] }))
  stages[from.stage].auditors.splice(from.index, 1)
  if (to.stage === stages.length) stages.splice(reviewStageCount(stages), 0, { auditors: [auditor], combine: 'any' })
  else {
    const list = stages[to.stage].auditors
    list.splice(Math.min(to.index ?? list.length, list.length), 0, auditor)
  }
  return withStages(
    spec,
    stages.filter((s) => s.auditors.length > 0)
  )
}

/**
 * any / all drop `n`; at_least keeps an integer n ≥ 1 (default 1). An `n`
 * above the auditor count is allowed and counts as the auditor count. A
 * fallback stage stays one.
 */
function normalizeCombine(stage: Stage): Stage {
  const fallback = stage.fallback ? { fallback: true } : {}
  if (stage.combine !== 'at_least') return { auditors: stage.auditors, combine: stage.combine, ...fallback }
  const n = Math.max(1, Math.floor(Number(stage.n ?? 1)) || 1)
  return { auditors: stage.auditors, combine: 'at_least', n, ...fallback }
}

/**
 * Makes a stage a fallback stage (补审) or a review stage again. A fallback
 * stage moves behind every review stage and a review stage in front of every
 * fallback stage, so the spec keeps the order the backend requires. The
 * first stage cannot be a fallback stage: with no review stage left in front
 * of it the spec is returned unchanged.
 */
export function setFallback(spec: Spec, stageIndex: number, fallback: boolean): Spec {
  const stage = spec.stages[stageIndex]
  if (!stage || !!stage.fallback === fallback) return spec
  const { fallback: _drop, ...rest } = stage
  const changed: Stage = fallback ? { ...rest, fallback: true } : rest
  const others = spec.stages.filter((_, i) => i !== stageIndex)
  const review = others.filter((s) => !s.fallback)
  if (fallback && !review.length) return spec
  return withStages(spec, [...review, changed, ...others.filter((s) => s.fallback)])
}

export function setCombine(spec: Spec, stageIndex: number, combine: Combine, n?: number): Spec {
  if (!spec.stages[stageIndex]) return spec
  return withStages(
    spec,
    spec.stages.map((s, i) => (i === stageIndex ? normalizeCombine({ ...s, combine, n: n ?? s.n }) : s))
  )
}

/**
 * The draft as it is sent and compared: fixed key order, models always an
 * array, `n` only on at_least, `fallback` only when true. Leaves invalid
 * values as they are so that validation still reports them.
 */
export function canonicalSpec(spec: Spec): Spec {
  return {
    model_filter: { type: spec.model_filter?.type, models: [...(spec.model_filter?.models || [])] },
    sample_rate: spec.sample_rate,
    total_timeout_ms: spec.total_timeout_ms,
    stages: (spec.stages || []).map((s) => {
      const st: Stage = { auditors: [...(s.auditors || [])], combine: s.combine || 'any' }
      if (st.combine === 'at_least') st.n = s.n
      if (s.fallback) st.fallback = s.fallback
      return st
    })
  }
}

export const sameSpec = (a: Spec, b: Spec) => JSON.stringify(canonicalSpec(a)) === JSON.stringify(canonicalSpec(b))

// ---- templates

/**
 * first_behavior = first review (OpenAI) → behavior review (Jev);
 * single = one OpenAI stage. Each stage preselects the only auditor of its
 * type; with none or several the stage stays empty for the user to pick
 * (validation reports it until then).
 */
export type FlowTemplate = 'first_behavior' | 'single'
export const FLOW_TEMPLATES: readonly FlowTemplate[] = ['first_behavior', 'single']

export function applyTemplate(spec: Spec, template: FlowTemplate, auditors: readonly { id: number; type: string }[]): Spec {
  const onlyOf = (type: AuditorType): number[] => {
    const matches = auditors.filter((a) => a.type === type)
    return matches.length === 1 ? [matches[0].id] : []
  }
  const types: AuditorType[] = template === 'single' ? ['openai_moderation'] : ['openai_moderation', 'typesafe']
  return withStages(
    spec,
    types.map((type) => ({ auditors: onlyOf(type), combine: 'any' as const }))
  )
}

export type StageRole = 'first' | 'behavior' | 'review' | 'fallback'

/** A fallback stage = fallback (补审); stage 1 = first (初审); a later stage holding a Jev auditor = behavior; else review (analysis_prompt.go stageRole). */
export function stageRole(index: number, stage: Pick<Stage, 'auditors' | 'fallback'>, typeOf: AuditorTypeOf): StageRole {
  if (stage.fallback) return 'fallback'
  if (index === 0) return 'first'
  return stage.auditors.some((id) => typeOf(id) === 'typesafe') ? 'behavior' : 'review'
}

// ---- auditors as the canvas shows them

/** An auditor with its channel resolved (from the list fields or the channel list). */
export interface CanvasAuditor {
  id: number
  name: string
  type: AuditorType
  channelId: number
  channelName: string
  /** false = disabled or missing: its calls fail (an errored auditor leaves the stage's count; a stage with no verdict is passed over) */
  channelOk: boolean
  /** effective single-call timeout (type default when the channel stores 0) */
  timeoutMs: number
}

export function canvasAuditors(auditors: readonly Auditor[], channels: readonly Channel[]): CanvasAuditor[] {
  const byId = new Map(channels.map((c) => [c.id, c]))
  return auditors.map((a) => {
    const ch = byId.get(a.channel_id)
    const enabled = a.channel_enabled ?? ch?.enabled ?? (channels.length ? false : a.usable)
    const timeout = a.channel_timeout_ms ?? ch?.timeout_ms ?? 0
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      channelId: a.channel_id,
      channelName: a.channel_name ?? ch?.name ?? '',
      channelOk: !!enabled,
      timeoutMs: timeout > 0 ? timeout : DEFAULT_CHANNEL_TIMEOUT_MS[a.channel_type || a.type] || 0
    }
  })
}

/** Automatic total timeout: Σ over stages of the slowest channel of the stage. */
/** The canvas auditors by id, with an auditor's type (undefined when it is missing) and name (#id when missing). */
export function auditorIndex(auditors: readonly CanvasAuditor[]) {
  const byId: ReadonlyMap<number, CanvasAuditor> = new Map(auditors.map((a) => [a.id, a]))
  return {
    byId,
    typeOf: ((id) => byId.get(id)?.type) as AuditorTypeOf,
    nameOf: (id: number) => byId.get(id)?.name ?? `#${id}`
  }
}

export function autoTimeoutMs(spec: Spec, byId: ReadonlyMap<number, CanvasAuditor>): number {
  return spec.stages.reduce((sum, st) => sum + Math.max(0, ...st.auditors.map((id) => byId.get(id)?.timeoutMs ?? 0)), 0)
}

/** The flow a group is bound to (flows list). */
export interface GroupOwner {
  flowId: number
  flowName: string
}

/** How the core's groups are moderated now; group ids, the default group 0 aside. */
interface GroupCoverage {
  /** groups with a flow of their own */
  own: number[]
  /** groups moderated by a live flow (their own, else the default group's) */
  moderated: number[]
  /** groups without a flow of their own while the default group has no live flow */
  unbound: number[]
  /** bound groups whose flow is disabled or unpublished (incl. the default group 0): the binding does not apply, they go by the default group's flow */
  inactive: number[]
  /** the default group 0 has a live flow: what unbound groups and groups of an inactive flow fall back to */
  defaultLive: boolean
  /** bound groups the core does not know (anymore) */
  stale: number[]
  /** groups bound to "not moderated" (flow 0, §72.17) */
  exempt: number[]
}

/**
 * Group coverage (mirrors snapshot.flowFor): a group bound to an enabled and
 * published flow uses that flow; a group bound to "not moderated" (exempt)
 * is not moderated; other groups, those bound to a disabled or unpublished
 * flow included (the binding does not apply, 0.8.0), use the flow of the
 * default group 0. Account bindings are not counted (the bindings tab).
 */
export function groupCoverage(
  groupIds: readonly number[],
  flows: readonly Pick<Flow, 'groups' | 'enabled' | 'version'>[],
  exempt: readonly number[] = []
): GroupCoverage {
  const owner = new Map<number, Pick<Flow, 'enabled' | 'version'>>()
  for (const f of flows) for (const g of f.groups) owner.set(g, f)
  const skipped = new Set(exempt)
  for (const g of exempt) owner.set(g, { enabled: false, version: 0 })
  const live = (id: number) => {
    const f = owner.get(id)
    return !!f?.enabled && f.version > 0
  }
  const known = new Set(groupIds)
  const defaultLive = live(0)
  return {
    own: groupIds.filter((id) => owner.has(id)),
    moderated: groupIds.filter((id) => !skipped.has(id) && (live(id) || defaultLive)),
    unbound: defaultLive ? [] : groupIds.filter((id) => !owner.has(id)),
    inactive: [...owner.keys()].filter((id) => (id === 0 || known.has(id)) && !live(id) && !skipped.has(id)),
    stale: [...owner.keys()].filter((id) => id !== 0 && !known.has(id)),
    exempt: groupIds.filter((id) => skipped.has(id)),
    defaultLive
  }
}

// ---- validation (mirrors ParseSpec + Spec.Validate)

type SpecIssueCode =
  | 'unknown_field'
  | 'invalid_field'
  | 'invalid_model_filter'
  | 'models_required'
  | 'invalid_sample_rate'
  | 'invalid_total_timeout'
  | 'no_stages'
  | 'too_many_stages'
  | 'empty_stage'
  | 'too_many_auditors'
  | 'duplicate_auditor'
  | 'unknown_auditor'
  | 'unsupported_auditor_type'
  | 'invalid_combine'
  | 'invalid_n'
  | 'fallback_first'
  | 'fallback_order'

export interface SpecIssue {
  code: SpecIssueCode
  /** stage index of a stage-level issue */
  stage?: number
  auditor?: number
  field?: string
}

const SPEC_KEYS = ['model_filter', 'sample_rate', 'total_timeout_ms', 'stages']
const MODEL_FILTER_KEYS = ['type', 'models']
const STAGE_KEYS = ['auditors', 'combine', 'n', 'fallback']
const MODEL_FILTER_TYPES = new Set(['all', 'only', 'exclude'])
const COMBINE_VALUES = new Set(['', 'any', 'all', 'at_least'])

const unknownKeys = (value: object, known: readonly string[]) => Object.keys(value).filter((k) => !known.includes(k))

/** Validates a draft; `typeOf` resolves auditor ids. Empty = publishable. */
export function validateSpec(spec: Spec, typeOf: AuditorTypeOf): SpecIssue[] {
  const issues: SpecIssue[] = []
  for (const field of unknownKeys(spec, SPEC_KEYS)) issues.push({ code: 'unknown_field', field })

  const filter = spec.model_filter ?? { type: '', models: [] }
  for (const field of unknownKeys(filter, MODEL_FILTER_KEYS)) issues.push({ code: 'unknown_field', field: `model_filter.${field}` })
  const models = filter.models ?? []
  if (!MODEL_FILTER_TYPES.has(filter.type) || !Array.isArray(models)) issues.push({ code: 'invalid_model_filter' })
  else if (filter.type !== 'all' && !models.length) issues.push({ code: 'models_required' })

  const rate = spec.sample_rate ?? 0
  if (typeof rate !== 'number' || !(rate >= 0 && rate <= 100)) issues.push({ code: 'invalid_sample_rate' })

  const timeout = spec.total_timeout_ms ?? 0
  if (!(Number.isInteger(timeout) && (timeout === 0 || (timeout >= TOTAL_TIMEOUT_MIN_MS && timeout <= TOTAL_TIMEOUT_MAX_MS)))) {
    issues.push({ code: 'invalid_total_timeout' })
  }

  const stages = spec.stages ?? []
  if (!Array.isArray(stages)) {
    issues.push({ code: 'invalid_field', field: 'stages' })
    return issues
  }
  if (!stages.length) issues.push({ code: 'no_stages' })
  if (stages.length > MAX_STAGES) issues.push({ code: 'too_many_stages' })
  // The first stage is a review stage and no review stage follows a fallback stage (Spec.Validate).
  if (stages[0]?.fallback) issues.push({ code: 'fallback_first', stage: 0 })
  stages.forEach((st, i) => {
    if (i > 0 && stages[i - 1]?.fallback && !st?.fallback) issues.push({ code: 'fallback_order', stage: i })
    issues.push(...validateStage(st, i, typeOf))
  })
  return issues
}

function validateStage(stage: Stage, index: number, typeOf: AuditorTypeOf): SpecIssue[] {
  if (typeof stage !== 'object' || stage === null) return [{ code: 'invalid_field', stage: index, field: 'stages' }]
  const issues: SpecIssue[] = []
  for (const field of unknownKeys(stage, STAGE_KEYS)) issues.push({ code: 'unknown_field', stage: index, field })
  const auditors = stage.auditors ?? []
  if (!Array.isArray(auditors)) return [...issues, { code: 'invalid_field', stage: index, field: 'auditors' }]
  if (!auditors.length) issues.push({ code: 'empty_stage', stage: index })
  if (auditors.length > MAX_STAGE_AUDITORS) issues.push({ code: 'too_many_auditors', stage: index })

  const seen = new Set<number>()
  for (const id of auditors) {
    if (seen.has(id)) issues.push({ code: 'duplicate_auditor', stage: index, auditor: id })
    seen.add(id)
    const type = Number.isInteger(id) ? typeOf(id) : undefined
    if (type === undefined) issues.push({ code: 'unknown_auditor', stage: index, auditor: id })
    else if (!isAuditorType(type)) issues.push({ code: 'unsupported_auditor_type', stage: index, auditor: id })
  }

  const combine = stage.combine ?? ''
  if (!COMBINE_VALUES.has(combine)) issues.push({ code: 'invalid_combine', stage: index })
  const n = stage.n ?? 0
  if (!Number.isInteger(n) || (combine === 'at_least' && n < 1)) issues.push({ code: 'invalid_n', stage: index })
  if (stage.fallback !== undefined && typeof stage.fallback !== 'boolean') issues.push({ code: 'invalid_field', stage: index, field: 'fallback' })
  return issues
}

// ---- drag and drop (new-api canvas-drag.ts)

/** What is dragged: a library auditor, an auditor placed in a stage, or a stage. */
export type CanvasDrag = { kind: 'library'; auditor: number } | { kind: 'node'; stage: number; index: number } | { kind: 'stage'; stage: number }

/** Where it is dropped: a stage, the "new stage" zone, or the library (= remove). */
export type CanvasDropTarget = { kind: 'stage'; stage: number } | { kind: 'new' } | { kind: 'trash' }

const DRAG_TYPE = 'application/x-content-moderation-flow'

export function startCanvasDrag(event: DragEvent, drag: CanvasDrag) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag))
  event.dataTransfer.setData('text/plain', JSON.stringify(drag))
  event.dataTransfer.effectAllowed = 'move'
  event.stopPropagation()
}

export function readCanvasDrag(event: DragEvent): CanvasDrag | null {
  const dt = event.dataTransfer
  if (!dt) return null
  try {
    const value = JSON.parse(dt.getData(DRAG_TYPE) || dt.getData('text/plain'))
    return typeof value === 'object' && value !== null && 'kind' in value ? (value as CanvasDrag) : null
  } catch {
    return null
  }
}

/** dragover: accepts only canvas drags (the payload itself is unreadable until drop). */
export function acceptsCanvasDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  return !!types && (Array.from(types).includes(DRAG_TYPE) || Array.from(types).includes('text/plain'))
}

/** dragleave that only moves onto a child of the drop zone. */
export const leavesInside = (event: DragEvent) => {
  const to = event.relatedTarget as Node | null
  return !!to && (event.currentTarget as HTMLElement | null)?.contains(to) === true
}

/**
 * Applies a drop (new-api flow-canvas applyDrop). Returns the new spec, or
 * the reason nothing changed: `duplicate` (target stage has the auditor),
 * `full` (target stage holds the maximum), `max_stages`, or `noop`.
 */
export function applyDrop(spec: Spec, drag: CanvasDrag, target: CanvasDropTarget, typeOf: AuditorTypeOf): Spec | 'duplicate' | 'full' | 'max_stages' | 'noop' {
  let next = spec
  if (target.kind === 'trash') {
    if (drag.kind === 'node') next = removeAuditor(spec, drag.stage, drag.index)
  } else if (target.kind === 'new') {
    if (drag.kind === 'library') next = addStage(spec, drag.auditor, typeOf)
    if (drag.kind === 'node') next = moveAuditor(spec, drag, { stage: spec.stages.length })
    if (next === spec && drag.kind !== 'stage' && spec.stages.length >= MAX_STAGES) return 'max_stages'
  } else if (drag.kind === 'stage') next = moveStage(spec, drag.stage, target.stage)
  else if (drag.kind === 'library') next = addAuditor(spec, target.stage, drag.auditor, typeOf)
  else if (drag.stage !== target.stage) next = moveAuditor(spec, drag, { stage: target.stage })
  else return 'noop'

  if (next !== spec) return next
  if (drag.kind !== 'stage' && target.kind === 'stage') {
    const st = spec.stages[target.stage]
    const id = drag.kind === 'library' ? drag.auditor : spec.stages[drag.stage]?.auditors[drag.index]
    if (st && id !== undefined && st.auditors.includes(id)) return 'duplicate'
    if (st && st.auditors.length >= MAX_STAGE_AUDITORS) return 'full'
  }
  return 'noop'
}
