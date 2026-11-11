import { jevPayload } from './host'
import { YES_NO_THRESHOLD, thresholdOverrides } from './thresholdPresets'
import type { Auditor, AuditorConfig, AuditorTryTarget, AuditorType, JevQuestions } from './types'

// The auditor editor's form (AuditorEditModal.vue): what a stored auditor
// shows, the config the form saves or tries, and whether an auditor's try
// takes images.

export interface AuditorForm {
  name: string
  type: AuditorType
  channel_id: number
  /** per category: the typed value (SInput type=number gives a number, null when cleared) */
  thresholds: Record<string, string | number | null>
  ownQuestions: boolean
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

/** The form of a stored auditor, or of a new one (null). */
export function auditorFormOf(a: Auditor | null): AuditorForm {
  const c: AuditorConfig = a?.config || {}
  return {
    name: a?.name || '',
    type: a?.type || 'openai_moderation',
    channel_id: a?.channel_id || 0,
    thresholds: Object.fromEntries(Object.entries(c.thresholds || {}).map(([k, v]) => [k, String(v)])),
    ownQuestions: !!c.questions,
    questions: { preamble: c.questions?.preamble || '', items: (c.questions?.items || []).map((q) => ({ ...q })) },
    review_images: c.review_images !== false,
    system_prompt: c.system_prompt || '',
    categories: (c.categories || []).map((x) => `${x.id}: ${x.description}`).join('\n'),
    tool_choice: c.tool_choice || 'required',
    max_turns: c.max_turns || 3,
    temperature: c.temperature ?? 0,
    max_tokens: c.max_tokens || 512,
    flag_as_hit: !!c.flag_as_hit
  }
}

/**
 * The config the form saves or tries. A cleared OpenAI threshold is not
 * sent, so its default applies (engine.go compileAuditor starts from the
 * default thresholds and only overrides the categories given). Jev and both
 * LLM types always send review_images, true or false.
 */
export function auditorConfig(form: AuditorForm): AuditorConfig {
  if (form.type === 'openai_moderation') return { thresholds: thresholdOverrides(form.thresholds) }
  if (form.type === 'typesafe') return { review_images: form.review_images, questions: form.ownQuestions ? jevPayload(form.questions) : null }
  // the table's thresholds are not used (YES_NO_THRESHOLD)
  if (form.type === 'llm_questions') {
    return {
      review_images: form.review_images,
      questions: form.ownQuestions ? { preamble: form.questions.preamble, items: form.questions.items.map((q) => ({ ...q, threshold: YES_NO_THRESHOLD })) } : null
    }
  }
  const categories = form.categories
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.search(/[:：]/)
      return i < 0 ? { id: l, description: '' } : { id: l.slice(0, i).trim(), description: l.slice(i + 1).trim() }
    })
  return {
    review_images: form.review_images,
    system_prompt: form.system_prompt,
    categories,
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
