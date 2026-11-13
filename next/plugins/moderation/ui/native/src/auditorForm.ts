import { jevPayload } from './host'
import { YES_NO_THRESHOLD, thresholdOverrides } from './thresholdPresets'
import type { Auditor, AuditorConfig, AuditorTryTarget, AuditorType, Category, Defaults, JevQuestion, JevQuestions } from './types'

// The auditor editor's form (AuditorEditModal.vue): what a stored auditor
// shows, the config the form saves or tries, and whether an auditor's try
// takes images.
//
// Defaults (0.11.2): what an auditor leaves empty - the question table, the
// LLM system prompt and categories - runs on the plugin's default, and the
// form shows that default as editable content instead of hiding it. The
// config keeps the part empty (it follows the default) while the form's own
// flag for it is off and its content equals the default; any edit saves the
// content as the auditor's own. A part the stored config already had stays
// its own, even when it equals the default.

/** The parts of an auditor that may run on the plugin's default. */
export interface OwnParts {
  questions: boolean
  system_prompt: boolean
  categories: boolean
}

export interface AuditorForm {
  name: string
  type: AuditorType
  channel_id: number
  /** per category: the typed value (SInput type=number gives a number, null when cleared) */
  thresholds: Record<string, string | number | null>
  /** the parts the auditor has its own (off = it runs on the default, shown in the form) */
  own: OwnParts
  questions: JevQuestions
  /** Jev: review images; both LLM types: the model supports images. Absent in a stored config = on. */
  review_images: boolean
  system_prompt: string
  categories: string
  tool_choice: string
  max_turns: number | null
  temperature: number | null
  max_tokens: number | null
  flag_as_hit: boolean
}

/** The form of a stored auditor, or of a new one (null); the parts it leaves empty show the defaults. */
export function auditorFormOf(a: Auditor | null, d?: Defaults | null): AuditorForm {
  const c: AuditorConfig = a?.config || {}
  const own: OwnParts = { questions: !!c.questions, system_prompt: !!c.system_prompt, categories: !!c.categories?.length }
  return {
    name: a?.name || '',
    type: a?.type || 'openai_moderation',
    channel_id: a?.channel_id || 0,
    thresholds: Object.fromEntries(Object.entries(c.thresholds || {}).map(([k, v]) => [k, String(v)])),
    own,
    questions: copyQuestions((own.questions && c.questions) || d?.default),
    review_images: c.review_images !== false,
    system_prompt: (own.system_prompt && c.system_prompt) || d?.llm_system_prompt || '',
    categories: categoryText(own.categories ? c.categories : d?.llm_categories),
    tool_choice: c.tool_choice || 'required',
    max_turns: c.max_turns || 3,
    temperature: c.temperature ?? 0,
    max_tokens: c.max_tokens || 512,
    flag_as_hit: !!c.flag_as_hit
  }
}

/** A deep copy of a question table (an empty one for none). */
export const copyQuestions = (q: JevQuestions | null | undefined): JevQuestions => ({ preamble: q?.preamble || '', items: (q?.items || []).map((x) => ({ ...x })) })

/** Categories as the form edits them: one "id: description" per line. */
export const categoryText = (cats: Category[] | null | undefined) => (cats || []).map((x) => `${x.id}: ${x.description}`).join('\n')

/** The categories of the form's text: one per non-empty line, "id: description" or "id：description". */
export function parseCategories(text: string): Category[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.search(/[:：]/)
      return i < 0 ? { id: l, description: '' } : { id: l.slice(0, i).trim(), description: l.slice(i + 1).trim() }
    })
}

const rowKey = (q: JevQuestion) => JSON.stringify([q.category, q.label || '', q.question, q.answer_yes || '', q.answer_no || '', Number(q.threshold)])
const sameRows = (a: JevQuestion[], b: JevQuestion[]) => a.length === b.length && a.every((q, i) => rowKey(q) === rowKey(b[i]))
/** Whether two question tables say the same (a cleared label or answer equals an absent one). */
export const sameQuestions = (a: JevQuestions, b: JevQuestions | null | undefined) => (a.preamble || '') === (b?.preamble || '') && sameRows(a.items, b?.items || [])
const sameCategories = (a: Category[], b: Category[]) => JSON.stringify(a) === JSON.stringify(b.map((c) => ({ id: c.id, description: c.description })))

/** Which parts of the form run on the default: not the auditor's own and unchanged from the default. */
export function usesDefault(form: AuditorForm, d: Defaults | null | undefined): OwnParts {
  return {
    questions: !form.own.questions && sameQuestions(form.questions, d?.default),
    system_prompt: !form.own.system_prompt && form.system_prompt.trim() === (d?.llm_system_prompt || '').trim(),
    categories: !form.own.categories && sameCategories(parseCategories(form.categories), d?.llm_categories || [])
  }
}

/** Shows the defaults in the parts that run on them and show nothing yet (the defaults arrived after the form was filled). */
export function fillDefaults(form: AuditorForm, d: Defaults | null | undefined) {
  if (!d) return
  if (!form.own.questions && !form.questions.items.length && !form.questions.preamble) form.questions = copyQuestions(d.default)
  if (!form.own.system_prompt && !form.system_prompt) form.system_prompt = d.llm_system_prompt
  if (!form.own.categories && !form.categories) form.categories = categoryText(d.llm_categories)
}

/** Puts the defaults back into the form: the type's default parts, shown as their content, saved as empty. */
export function restoreDefaults(form: AuditorForm, d: Defaults | null | undefined) {
  if (form.type === 'llm_verdict') {
    Object.assign(form.own, { system_prompt: false, categories: false })
    form.system_prompt = d?.llm_system_prompt || ''
    form.categories = categoryText(d?.llm_categories)
    return
  }
  form.own.questions = false
  form.questions = copyQuestions(d?.default)
}

/** How a question table differs from the default, per default row by category: the same, changed or missing; extra counts the rows the default does not have. */
export function questionDiff(current: JevQuestions, def: JevQuestions) {
  const mine = new Map(current.items.map((q) => [q.category, q]))
  const rows = def.items.map((q) => {
    const m = mine.get(q.category)
    return { question: q, state: !m ? ('missing' as const) : rowKey(m) === rowKey(q) ? ('same' as const) : ('changed' as const) }
  })
  const known = new Set(def.items.map((q) => q.category))
  return { preambleSame: (current.preamble || '') === (def.preamble || ''), rows, extra: current.items.filter((q) => !known.has(q.category)).length }
}

/**
 * The config the form saves or tries. A cleared OpenAI threshold is not
 * sent, so its default applies (engine.go compileAuditor starts from the
 * default thresholds and only overrides the categories given). Jev and both
 * LLM types always send review_images, true or false. A part that runs on
 * the default (usesDefault) is sent empty, as it was stored.
 */
export function auditorConfig(form: AuditorForm, d?: Defaults | null): AuditorConfig {
  if (form.type === 'openai_moderation') return { thresholds: thresholdOverrides(form.thresholds) }
  const def = usesDefault(form, d)
  if (form.type === 'typesafe') return { review_images: form.review_images, questions: def.questions ? null : jevPayload(form.questions) }
  // the table's thresholds are not used (YES_NO_THRESHOLD)
  if (form.type === 'llm_questions') {
    return {
      review_images: form.review_images,
      questions: def.questions ? null : { preamble: form.questions.preamble, items: form.questions.items.map((q) => ({ ...q, threshold: YES_NO_THRESHOLD })) }
    }
  }
  return {
    review_images: form.review_images,
    system_prompt: def.system_prompt ? '' : form.system_prompt,
    categories: def.categories ? [] : parseCategories(form.categories),
    tool_choice: form.tool_choice,
    max_turns: Number(form.max_turns) || 3,
    temperature: Number(form.temperature) || 0,
    max_tokens: Number(form.max_tokens) || 512,
    flag_as_hit: form.flag_as_hit
  }
}

export const isLLMAuditor = (type: string | undefined) => type === 'llm_verdict' || type === 'llm_questions'

/** An LLM auditor whose "model supports images" switch is off reviews the text only (absent = on). */
export const llmTextOnly = (type: string | undefined, config: AuditorConfig | null | undefined) => isLLMAuditor(type) && config?.review_images === false

/** Whether a try takes no images: by the unsaved edits when the target has a draft, else by the stored config. */
export function tryTextOnly(target: Pick<AuditorTryTarget, 'type' | 'config' | 'draft'> | null | undefined): boolean {
  if (!target) return false
  return target.draft ? llmTextOnly(target.draft.type ?? target.type, target.draft.config) : llmTextOnly(target.type, target.config)
}

/** The images a try sends: none for a text-only auditor, whatever was attached before. */
export const tryImages = (target: Pick<AuditorTryTarget, 'type' | 'config' | 'draft'> | null | undefined, images: string[]): string[] => (tryTextOnly(target) ? [] : images)
