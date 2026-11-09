// Server field errors of the account editor (ApiError.fields) and the section
// that holds each field.

export type EditorSection = 'connection' | 'models' | 'scheduling' | 'advanced' | 'cc_features'

export const CONNECTION_FIELDS = ['name', 'group_ids', 'proxy_id', 'proxy_url', 'settings', 'settings.locale', 'settings.timezone']
const SCHEDULING_FIELDS = ['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit', 'spm_limit']

/** The advanced section (request forwarding): header passthrough rules (CONTRACTS §81), the parameter override (§84), the conversion loss policy (CONVERT-MATRIX §6.3) and the account layer of the environment variables (`environment.<key>`). */
const ADVANCED_PREFIXES = ['header_passthrough', 'param_override', 'conversion_loss_policy', 'environment']
export const isAdvancedField = (k: string) => ADVANCED_PREFIXES.some(p => k === p || k.startsWith(`${p}.`) || k.startsWith(`${p}[`))

/** Scheduling and limit fields. */
export const isSchedulingField = (k: string) => SCHEDULING_FIELDS.includes(k)

const CREDENTIAL_RE = /^credentials[.[]?(.*?)]?$/
const isModelsField = (k: string) => k === 'models' || k.startsWith('models.') || k.startsWith('models[') || k.startsWith('model_mapping')

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
  if (Object.keys(cred).length || CONNECTION_FIELDS.some((k) => k in base)) return 'connection'
  if (Object.keys(base).some(isModelsField)) return 'models'
  if (Object.keys(base).some(k => k.startsWith('cc_feature_policy'))) return 'cc_features'
  if (Object.keys(base).some(isAdvancedField) && !Object.keys(base).some(isSchedulingField)) return 'advanced'
  return Object.keys(base).length ? 'scheduling' : null
}
