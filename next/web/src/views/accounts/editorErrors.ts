// Server field errors of the account editor (ApiError.fields) and the section
// that holds each field; the common controls of each section.
import type { CommonControlName } from '@/api/types'

/** The core sections and the plugin ones (`plugin:<plugin>:<component>`, account.editor.section). */
export type EditorSection = 'connection' | 'models' | 'scheduling' | 'advanced' | 'cc_features' | `plugin:${string}`
export const pluginSection = (key: string): EditorSection => `plugin:${key}`

/** Rows of the scheduling group and of the limits group. */
export const SCHEDULING_ROWS: readonly CommonControlName[] = ['priority', 'weight', 'max_concurrency', 'schedulable', 'auto_disable']
export const RATE_LIMITS: readonly CommonControlName[] = ['rpm_limit', 'tpm_limit', 'spm_limit']
const SCHEDULING_CONTROLS: readonly CommonControlName[] = [...SCHEDULING_ROWS, ...RATE_LIMITS, 'usage_limit', 'model_limits']
/**
 * Sections made only of common controls: hidden when every one of them is.
 * The advanced section is not: its conversion loss policy is always shown.
 */
export const SECTION_CONTROLS: Partial<Record<EditorSection, readonly CommonControlName[]>> = { scheduling: SCHEDULING_CONTROLS }

export const CONNECTION_FIELDS = ['name', 'group_ids', 'proxy_id', 'proxy_url', 'settings', 'settings.locale', 'settings.timezone']

/** Whether the field (or a part of it: `field.x`, `field[0]`) is one of these. */
const fieldOf = (fields: readonly string[]) => (k: string) => fields.some(p => k === p || k.startsWith(`${p}.`) || k.startsWith(`${p}[`))

/** The advanced section (request forwarding): header passthrough rules (CONTRACTS §81), the parameter override (§84), the conversion loss policy (CONVERT-MATRIX §6.3) and the account layer of the environment variables (`environment.<key>`). */
export const isAdvancedField = fieldOf(['header_passthrough', 'param_override', 'conversion_loss_policy', 'environment'])

/** Scheduling and limit fields: the scheduling section's controls (a model list's limits included). */
export const isSchedulingField = fieldOf(SCHEDULING_CONTROLS)

const CREDENTIAL_RE = /^credentials[.[]?(.*?)]?$/
const isModelsField = fieldOf(['models', 'model_mapping'])

/** The server's error of the model list / mapping, as `field: text` ('' when there is none). */
export function modelsErrorText(errors: Record<string, string>): string {
  for (const [k, v] of Object.entries(errors)) if (/^models(\[|$)/.test(k)) return `${k}: ${v}`
  return ''
}

export function mappingErrorText(errors: Record<string, string>): string {
  for (const [k, v] of Object.entries(errors)) if (/^model_mapping([.[]|$)/.test(k)) return k === 'model_mapping' ? v : `${k}: ${v}`
  return ''
}

/** Splits field errors into the plugin form's (`credentials.x` → `x`) and the editor's own. */
export function splitFieldErrors(all: Record<string, string>): { cred: Record<string, string>; base: Record<string, string> } {
  const cred: Record<string, string> = {}
  const base: Record<string, string> = {}
  for (const [k, v] of Object.entries(all)) {
    const m = CREDENTIAL_RE.exec(k)
    if (m && k.startsWith('credentials')) cred[m[1].replace(/^\./, '')] = v
    else base[k] = v
  }
  return { cred, base }
}

/** The first section holding one of these errors, or null. */
export function sectionOfErrors(base: Record<string, string>, cred: Record<string, string>): EditorSection | null {
  if (Object.keys(cred).length || CONNECTION_FIELDS.some(k => k in base)) return 'connection'
  if (Object.keys(base).some(isModelsField)) return 'models'
  if (Object.keys(base).some(k => k.startsWith('cc_feature_policy'))) return 'cc_features'
  if (Object.keys(base).some(isAdvancedField) && !Object.keys(base).some(isSchedulingField)) return 'advanced'
  return Object.keys(base).length ? 'scheduling' : null
}
