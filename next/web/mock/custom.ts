import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fail } from './router'

// Mock of the built-in custom upstream plugin (docs/UPSTREAM-DECLARATIVE.md
// §5), read from plugins/custom (manifest and form) and the core presets
// (sdk/platforms/upstream) so it follows them: three account types whose
// `upstream` is the manifest layer merged over its preset (what GET
// /account-types returns, §4.4), their schema form with the
// `upstream-editor` widget, and a few of the server's account layer checks
// (sdk/upstream) reported like the core does, so the editor's error
// mapping can be tried: a blocked header, a path without a leading /.

const read = (path: string): any => {
  try {
    return JSON.parse(readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8'))
  } catch {
    return {}
  }
}
const manifest = read('plugins/custom/manifest.json')
const form = { schema: read('plugins/custom/forms/custom.schema.json'), ui_schema: read('plugins/custom/forms/custom.ui.json') }

/** JSON merge patch (RFC 7386), the way layers of an upstream merge. */
function merge(base: any, patch: any): any {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch
  const out = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k]
    else out[k] = merge(out[k], v)
  }
  return out
}

export const customAccountTypes = (manifest.accountTypes || []).map((d: any) => ({
  plugin_key: 'custom',
  plugin_name: manifest.name,
  plugin_version: manifest.version,
  asset_base: `/plugin-ui/custom/${manifest.version}-dev`,
  trust: 'official',
  type: d.id,
  label: d.label,
  description: d.description,
  creation_group: d.creationGroup,
  auth_method_label: d.authMethodLabel,
  form: { mode: 'schema' },
  sensitive_fields: d.sensitiveFields || [],
  supports: (d.platforms || []).map((p: any) => p.platform),
  // The type's own passHeaders for each platform, else the platform's (manifest.AccountType.PassHeaders).
  pass_headers: [
    ...new Set(
      (d.platforms || []).flatMap((p: any) =>
        p.passHeaders?.length ? p.passHeaders : read(`sdk/platforms/${p.platform}.json`).passHeaders || []
      )
    )
  ],
  upstream: merge(read(`sdk/platforms/upstream/${d.upstream.preset}.json`), d.upstream)
}))

export const customForm = () => form

const BLOCKED = /^(authorization|x-api-key|x-goog-api-key|api-key|cookie|host|proxy-.*|x-sub2api-.*|x-kin-.*)$/

/** ValidateCredentials of a custom type as far as the mock goes: errors on settings field upstream, "<path>: <message>". */
export function customCredentialErrors(creds: Record<string, any>) {
  const up = creds.upstream
  if (!up) return null
  const fields: Array<{ field: string; code: string; message: string }> = []
  const add = (path: string, code: string, message: string) =>
    fields.push({ field: 'credentials.upstream', code, message: `${path}: ${message}` })
  for (const name of Object.keys(up.headers || {})) {
    if (BLOCKED.test(name)) add(`headers.${name}`, 'blocked', `header ${name} cannot be written; credentials go in auth`)
  }
  for (const [proto, r] of Object.entries<any>(up.routes || {})) {
    if (!String(r?.path || '').startsWith('/')) add(`routes.${proto}.path`, 'invalid', 'a path starts with /')
  }
  return fields.length ? fail(400, 'invalid_argument', 'invalid credentials', { fields }) : null
}
