// Server field errors of the account editor (ApiError.fields) and the section
// that holds each field.

export type EditorSection = 'connection' | 'models' | 'scheduling' | 'cc_features'

export const CONNECTION_FIELDS = ['name', 'group_ids', 'proxy_id', 'proxy_url', 'settings', 'settings.locale', 'settings.timezone']
const SCHEDULING_FIELDS = ['priority', 'weight', 'max_concurrency', 'rpm_limit', 'tpm_limit', 'spm_limit']

/** Scheduling fields, and the account layer of the environment variables (`environment.<key>`). */
export const isSchedulingField = (k: string) => SCHEDULING_FIELDS.includes(k) || k.startsWith('environment.')

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
  return Object.keys(base).length ? 'scheduling' : null
}
