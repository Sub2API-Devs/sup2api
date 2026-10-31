import type { JevQuestions } from '../host'

// Settings keys of the settings tab, their defaults and ranges (forms/
// settings.schema.json, internal/moderation/settings.go), and the pure
// helpers of the form: draft ⇄ stored values, validation and the patch of
// changed keys. Tested in __tests__/fields.test.mts.

export interface NumberSpec {
  min: number
  max: number
  /** Shown divided by it (analysis_timeout_ms is edited in seconds). */
  scale?: number
}

export const NUMBER_FIELDS: Record<string, NumberSpec> = {
  block_status: { min: 400, max: 599 },
  watch_days: { min: 1, max: 365 },
  analysis_every_violations: { min: 0, max: 1000 },
  ban_threshold: { min: 0, max: 1000 },
  ban_window_hours: { min: 1, max: 8760 },
  ban_duration_hours: { min: 0, max: 87600 },
  analysis_timeout_ms: { min: 10000, max: 600000, scale: 1000 },
  analysis_concurrency: { min: 1, max: 16 },
  analysis_context_kb: { min: 16, max: 1024 },
  analysis_keep_per_user: { min: 1, max: 1000 },
  hit_retention_days: { min: 1, max: 3650 },
  overturned_retention_days: { min: 1, max: 3650 },
  error_retention_days: { min: 1, max: 3650 },
  pass_retention_days: { min: 1, max: 3 },
  stats_retention_days: { min: 7, max: 3650 },
  error_rate_alert_percent: { min: 0, max: 100 },
  max_concurrency: { min: 1, max: 256 },
  queue_size: { min: 1, max: 100000 },
  cache_ttl_seconds: { min: 0, max: 604800 },
  cache_entries: { min: 1000, max: 1000000 },
  input_max_chars: { min: 256, max: 100000 },
  min_chars: { min: 0, max: 1000 }
}

/** The built-in block message (settings.go DefaultBlockMessage); an empty message means it. */
export const DEFAULT_BLOCK_MESSAGE = '提示词审核未通过，请调整输入后重试'

/** Schema defaults of every key this page edits; other keys are never sent changed. */
export const DEFAULTS: Record<string, unknown> = {
  mode: 'off',
  exempt_user_ids: [],
  block_status: 403,
  block_message: DEFAULT_BLOCK_MESSAGE,
  auto_watch: true,
  watch_days: 30,
  analysis_every_violations: 30,
  ban_threshold: 0,
  ban_window_hours: 24,
  ban_duration_hours: 24,
  analysis_channel_id: 0,
  analysis_guidelines: '',
  analysis_timeout_ms: 60000,
  analysis_concurrency: 2,
  analysis_context_kb: 64,
  analysis_keep_per_user: 20,
  analysis_allow_upgrade: true,
  analysis_allow_downgrade: true,
  analysis_allow_remove: true,
  record_pass: false,
  record_overturned: true,
  record_errors: true,
  store_text: true,
  hit_retention_days: 180,
  overturned_retention_days: 30,
  error_retention_days: 7,
  pass_retention_days: 3,
  stats_retention_days: 90,
  error_rate_alert_percent: 5,
  notify_webhook_url: '',
  max_concurrency: 16,
  queue_size: 1000,
  cache_ttl_seconds: 3600,
  cache_entries: 100000,
  input_max_chars: 12000,
  min_chars: 2,
  jev_default_set: null
}

export const BLOCK_MESSAGE_MAX = 500
export const GUIDELINES_MAX_BYTES = 16384
export const WEBHOOK_MAX = 2048
export const EXEMPT_MAX = 1000
export const JEV_MAX_ITEMS = 32

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** The stored values with the page's keys filled from the defaults. */
export function withDefaults(values: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(values || {}) }
  for (const [k, v] of Object.entries(DEFAULTS)) if (out[k] === undefined) out[k] = clone(v)
  return out
}

/**
 * Editable copy of the page's keys. Empty analysis guidelines mean the
 * built-in ones, so the editor starts with the built-in text.
 */
export function toDraft(stored: Record<string, unknown>, defaultGuidelines: string): Record<string, any> {
  const d: Record<string, any> = {}
  for (const k of Object.keys(DEFAULTS)) d[k] = clone(stored[k] ?? DEFAULTS[k])
  if (!d.analysis_guidelines) d.analysis_guidelines = defaultGuidelines
  return d
}

/** Draft as it is stored: guidelines equal to the built-in ones are saved empty, so they keep following updates. */
export function toStored(draft: Record<string, any>, defaultGuidelines: string): Record<string, unknown> {
  const s: Record<string, unknown> = { ...draft }
  const g = String(draft.analysis_guidelines ?? '').trim()
  s.analysis_guidelines = g === defaultGuidelines.trim() ? '' : g
  s.block_message = String(draft.block_message ?? '').trim()
  s.notify_webhook_url = String(draft.notify_webhook_url ?? '').trim()
  return s
}

/** Changed keys of the page (only these are written). */
export function diff(stored: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const k of Object.keys(DEFAULTS)) if (!same(stored[k] ?? DEFAULTS[k], next[k])) patch[k] = clone(next[k])
  return patch
}

export interface FieldError {
  code: 'integer' | 'range' | 'tooLong' | 'url' | 'ids' | 'tooMany' | 'jev'
  params?: Record<string, number | string>
}

const runes = (s: string) => [...s].length
const bytes = (s: string) => new TextEncoder().encode(s).length

/** Problems of the draft by key; an empty object = valid. */
export function validate(draft: Record<string, any>): Record<string, FieldError> {
  const errs: Record<string, FieldError> = {}
  for (const [k, spec] of Object.entries(NUMBER_FIELDS)) {
    const v = draft[k]
    if (typeof v !== 'number' || !Number.isInteger(v)) errs[k] = { code: 'integer' }
    else if (v < spec.min || v > spec.max) errs[k] = { code: 'range', params: { min: spec.min, max: spec.max } }
  }
  if (runes(String(draft.block_message ?? '').trim()) > BLOCK_MESSAGE_MAX) errs.block_message = { code: 'tooLong', params: { max: BLOCK_MESSAGE_MAX } }
  const url = String(draft.notify_webhook_url ?? '').trim()
  if (url.length > WEBHOOK_MAX) errs.notify_webhook_url = { code: 'tooLong', params: { max: WEBHOOK_MAX } }
  else if (url && !/^https?:\/\/\S+$/.test(url)) errs.notify_webhook_url = { code: 'url' }
  if (bytes(String(draft.analysis_guidelines ?? '').trim()) > GUIDELINES_MAX_BYTES) errs.analysis_guidelines = { code: 'tooLong', params: { max: GUIDELINES_MAX_BYTES } }
  const ids: unknown[] = Array.isArray(draft.exempt_user_ids) ? draft.exempt_user_ids : []
  if (ids.length > EXEMPT_MAX) errs.exempt_user_ids = { code: 'tooMany', params: { max: EXEMPT_MAX } }
  else if (ids.some((x) => !/^[0-9]+$/.test(String(x)))) errs.exempt_user_ids = { code: 'ids' }
  if (draft.jev_default_set && jevIssues(draft.jev_default_set).length) errs.jev_default_set = { code: 'jev' }
  return errs
}

export interface JevIssue {
  /** -1 = the set itself (preamble, item count) */
  index: number
  field: 'items' | 'preamble' | 'category' | 'label' | 'question' | 'threshold' | 'answer'
}

const CATEGORY_RE = /^[a-z0-9/_-]{1,64}$/

/** Problems of a Jev question set against the schema. */
export function jevIssues(set: JevQuestions): JevIssue[] {
  const out: JevIssue[] = []
  const items = set.items || []
  if (items.length < 1 || items.length > JEV_MAX_ITEMS) out.push({ index: -1, field: 'items' })
  if (runes(set.preamble || '') > 2000) out.push({ index: -1, field: 'preamble' })
  items.forEach((q, i) => {
    if (!CATEGORY_RE.test(q.category || '')) out.push({ index: i, field: 'category' })
    if (runes(q.label || '') > 64) out.push({ index: i, field: 'label' })
    const n = runes((q.question || '').trim())
    if (n < 1 || n > 2000) out.push({ index: i, field: 'question' })
    const th = Number(q.threshold)
    if (!(th > 0 && th <= 1)) out.push({ index: i, field: 'threshold' })
    if (runes(q.answer_yes || '') > 1000 || runes(q.answer_no || '') > 1000) out.push({ index: i, field: 'answer' })
  })
  return out
}

