// Helpers for SchemaForm: JSON Schema subset + uiSchema conventions.
//
// uiSchema (per field; "ui:" prefix optional):
//   ui:order        ["a", "b", "*"]       field order of an object ("*" = rest)
//   ui:widget       secret | textarea | select | switch | number | url-presets |
//                   key-value | model-mapping | proxy-select | group-select | hidden
//   ui:title        LocalizedText label           ui:help   LocalizedText hint
//   ui:placeholder  LocalizedText                 ui:options {presets: [...], rows: n, ...}
//   ui:enumNames    [LocalizedText...] labels for enum values
//   ui:visibleWhen  {field: "a.b", equals|notEquals|in|notIn|truthy|falsy}
//                   or a plain map {"mode": "oauth"} (all must match)
// Secrets: widget "secret", format "password" or writeOnly: true. Existing
// values come back as "******" and are sent back unchanged to keep them.

import { lt } from '@/i18n'

export const SECRET_MASK = '******'

export type JSONSchema = Record<string, any>
export type UISchema = Record<string, any>

export function uiGet<T = any>(ui: UISchema | undefined, key: string): T | undefined {
  if (!ui || typeof ui !== 'object') return undefined
  if (('ui:' + key) in ui) return ui['ui:' + key]
  const v = ui[key]
  // Unprefixed keys only count when they look like ui options (not a nested field ui).
  if (v === undefined) return undefined
  if (key === 'title' || key === 'help' || key === 'placeholder') {
    return typeof v === 'string' || isLText(v) ? v : undefined
  }
  if (key === 'widget') return typeof v === 'string' ? (v as T) : undefined
  if (key === 'order' || key === 'enumNames') return Array.isArray(v) ? (v as T) : undefined
  return v
}

function isLText(v: unknown): boolean {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every((x) => typeof x === 'string')
}

export function childUI(ui: UISchema | undefined, key: string): UISchema | undefined {
  if (!ui || typeof ui !== 'object') return undefined
  const v = ui[key]
  return v && typeof v === 'object' && !Array.isArray(v) ? v : undefined
}

export function schemaType(s: JSONSchema | undefined): string {
  if (!s) return 'string'
  let t = s.type
  if (Array.isArray(t)) t = t.find((x) => x !== 'null') || t[0]
  if (!t) {
    if (s.properties || s.additionalProperties) return 'object'
    if (s.items) return 'array'
    if (s.enum) return typeof s.enum[0] === 'number' ? 'number' : 'string'
    if (s.oneOf?.every((o: any) => 'const' in o)) return typeof s.oneOf[0].const === 'number' ? 'number' : 'string'
  }
  return t || 'string'
}

export function isSecret(s: JSONSchema, ui?: UISchema): boolean {
  return uiGet(ui, 'widget') === 'secret' || s.format === 'password' || s.writeOnly === true || s['x-sensitive'] === true
}

export interface EnumOption {
  value: any
  label: string
}

export function enumOptions(s: JSONSchema, ui?: UISchema): EnumOption[] | null {
  const names = uiGet<any[]>(ui, 'enumNames') || s.enumNames
  if (Array.isArray(s.enum)) {
    return s.enum.map((v: any, i: number) => ({ value: v, label: names?.[i] !== undefined ? lt(names[i]) : String(v) }))
  }
  if (Array.isArray(s.oneOf) && s.oneOf.every((o: any) => o && 'const' in o)) {
    return s.oneOf.map((o: any) => ({ value: o.const, label: lt(o['x-title'] || o.title) || String(o.const) }))
  }
  return null
}

export function resolveWidget(s: JSONSchema, ui?: UISchema): string {
  const w = uiGet<string>(ui, 'widget')
  if (w) return w
  if (isSecret(s, ui)) return 'secret'
  const t = schemaType(s)
  if (enumOptions(s, ui) && t !== 'array') return 'select'
  switch (t) {
    case 'boolean':
      return 'switch'
    case 'number':
    case 'integer':
      return 'number'
    case 'array': {
      const it = s.items || {}
      if (enumOptions(it)) return 'multi-select'
      const itType = schemaType(it)
      if (itType === 'object') return 'object-list'
      return 'tags'
    }
    case 'object':
      if (s.properties) return 'object'
      if (s.additionalProperties) return 'key-value'
      return 'json'
    default:
      if (s.format === 'textarea' || (s.maxLength && s.maxLength > 500)) return 'textarea'
      return 'text'
  }
}

export function fieldLabel(key: string, s: JSONSchema, ui?: UISchema): string {
  const title = uiGet(ui, 'title') ?? s['x-title'] ?? s.title
  if (title) return lt(title)
  return key.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function fieldHelp(s: JSONSchema, ui?: UISchema): string {
  const h = uiGet(ui, 'help') ?? s['x-description'] ?? s.description
  return h ? lt(h) : ''
}

export function orderedKeys(s: JSONSchema, ui?: UISchema): string[] {
  const keys = Object.keys(s.properties || {})
  const order = uiGet<string[]>(ui, 'order')
  if (!order?.length) return keys
  const rest = keys.filter((k) => !order.includes(k))
  const out: string[] = []
  for (const k of order) {
    if (k === '*') out.push(...rest)
    else if (keys.includes(k)) out.push(k)
  }
  if (!order.includes('*')) out.push(...rest)
  return out
}

export function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function isVisible(ui: UISchema | undefined, root: any): boolean {
  const cond = uiGet<any>(ui, 'visibleWhen')
  if (!cond || typeof cond !== 'object') return true
  if ('field' in cond) {
    const v = getPath(root, cond.field)
    if ('equals' in cond) return v === cond.equals
    if ('notEquals' in cond) return v !== cond.notEquals
    if (Array.isArray(cond.in)) return cond.in.includes(v)
    if (Array.isArray(cond.notIn)) return !cond.notIn.includes(v)
    if (cond.truthy) return !!v
    if (cond.falsy) return !v
    return true
  }
  return Object.entries(cond).every(([k, want]) => {
    const v = getPath(root, k)
    return Array.isArray(want) ? want.includes(v) : v === want
  })
}

/**
 * Fills schema defaults for missing properties (recursively). `url-presets`
 * fields (base URLs) are left empty: the default is shown as a placeholder and
 * an empty value means "use the plugin's default" (CONTRACTS §21.3).
 */
export function withDefaults(s: JSONSchema, value: any, ui?: UISchema): any {
  const t = schemaType(s)
  if (t === 'object' && s.properties) {
    const out: Record<string, any> = { ...(value && typeof value === 'object' ? value : {}) }
    for (const [k, ps] of Object.entries<JSONSchema>(s.properties)) {
      const pu = ui?.[k]
      if (out[k] === undefined) {
        if (resolveWidget(ps, pu) === 'url-presets') continue
        if (ps.default !== undefined) out[k] = clone(ps.default)
        else if (schemaType(ps) === 'object' && ps.properties) out[k] = withDefaults(ps, undefined, pu)
      } else if (schemaType(ps) === 'object' && ps.properties) {
        out[k] = withDefaults(ps, out[k], pu)
      }
    }
    return out
  }
  return value === undefined && s.default !== undefined ? clone(s.default) : value
}

function clone<T>(v: T): T {
  return v === undefined ? v : JSON.parse(JSON.stringify(v))
}

function isEmpty(v: any): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

export interface ValidateMessages {
  required: string
  minLength: (n: number) => string
  maxLength: (n: number) => string
  pattern: string
  minimum: (n: number) => string
  maximum: (n: number) => string
  integer: string
  url: string
}

/** Client-side validation of visible fields. Returns path -> message. */
export function validate(s: JSONSchema, ui: UISchema | undefined, value: any, msgs: ValidateMessages, root = value, path = ''): Record<string, string> {
  const errs: Record<string, string> = {}
  const t = schemaType(s)
  if (t === 'object' && s.properties) {
    const req: string[] = s.required || []
    for (const k of Object.keys(s.properties)) {
      const cs = s.properties[k]
      const cu = childUI(ui, k)
      if (!isVisible(cu, root) || uiGet(cu, 'widget') === 'hidden') continue
      const p = path ? `${path}.${k}` : k
      const v = value?.[k]
      if (req.includes(k) && (isEmpty(v) || (schemaType(cs) === 'boolean' && v === undefined))) {
        errs[p] = msgs.required
        continue
      }
      Object.assign(errs, validate(cs, cu, v, msgs, root, p))
    }
    return errs
  }
  if (isEmpty(value)) return errs
  if (t === 'string' && typeof value === 'string' && value !== SECRET_MASK) {
    if (s.minLength && value.length < s.minLength) errs[path] = msgs.minLength(s.minLength)
    else if (s.maxLength && value.length > s.maxLength) errs[path] = msgs.maxLength(s.maxLength)
    else if (s.pattern) {
      try {
        if (!new RegExp(s.pattern).test(value)) errs[path] = msgs.pattern
      } catch {
        /* invalid pattern in schema: skip */
      }
    } else if ((s.format === 'uri' || s.format === 'url') && !/^https?:\/\/[^\s]+$/i.test(value)) errs[path] = msgs.url
  }
  if (t === 'number' || t === 'integer') {
    const n = Number(value)
    if (t === 'integer' && !Number.isInteger(n)) errs[path] = msgs.integer
    else if (s.minimum !== undefined && n < s.minimum) errs[path] = msgs.minimum(s.minimum)
    else if (s.maximum !== undefined && n > s.maximum) errs[path] = msgs.maximum(s.maximum)
  }
  if (t === 'array' && Array.isArray(value)) {
    if (s.minItems && value.length < s.minItems) errs[path] = msgs.required
    if (s.items && schemaType(s.items) === 'object') {
      value.forEach((item, i) => Object.assign(errs, validate(s.items, childUI(ui, 'items'), item, msgs, root, `${path}.${i}`)))
    }
  }
  return errs
}
