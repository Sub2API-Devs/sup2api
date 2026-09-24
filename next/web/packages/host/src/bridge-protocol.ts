// postMessage protocol between the console and sandboxed plugin iframes
// (sandbox="allow-scripts", so the iframe origin is "null" and it never sees
// the console session). Every message is an object with `s2a: 1`.
//
// iframe -> console
//   {s2a:1, kind:"ready"}                                    iframe loaded; console answers with "init"
//   {s2a:1, kind:"resize", height}                           content height in px
//   {s2a:1, kind:"request", id, method, params}              console answers with "response"
//       method "api.call"  params {method, path, query?, body?}
//                          path is relative to /api/v1/p/<plugin key>/ (absolute
//                          "/api/v1/p/<key>/..." is accepted); anything else is rejected
//       method "navigate"  params {path}                     console route, e.g. "/p/guard/rules"
//       method "toast"     params {message, kind?}
//   {s2a:1, kind:"response", id, result?, error?}            answer to a console request
//   {s2a:1, kind:"change", value}                            (account form) value changed
//
// console -> iframe
//   {s2a:1, kind:"init", plugin, page, mode, theme, locale, value?}
//       mode "page" | "account-form"; value = initial form value (account form)
//   {s2a:1, kind:"theme", theme}  {s2a:1, kind:"locale", locale}
//   {s2a:1, kind:"request", id, method, params}
//       method "getValue"  -> result: current value
//       method "setValue"  params {value}
//       method "validate"  -> result: {ok: boolean, errors?: {field: message}}
//       method "setErrors" params {errors: {field: message}}  (server-side field errors)
//   {s2a:1, kind:"response", id, result?, error?: {code, message}}

// Native account-form components (manifest form.mode = "native") receive props
// {modelValue, mode: "create"|"edit", account?, errors} and emit
// "update:modelValue"; they may expose validate(): boolean | Promise<boolean>.
// account.detail.tabs / account.form.widgets slot components receive {account}.

export const BRIDGE_TAG = 1 as const

export type BridgeMode = 'page' | 'account-form'

export interface BridgeError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type BridgeMessage =
  | { s2a: 1; kind: 'ready' }
  | { s2a: 1; kind: 'resize'; height: number }
  | { s2a: 1; kind: 'request'; id: string; method: string; params?: any }
  | { s2a: 1; kind: 'response'; id: string; result?: any; error?: BridgeError }
  | { s2a: 1; kind: 'change'; value: any }
  | {
      s2a: 1
      kind: 'init'
      plugin: string
      page: string
      mode: BridgeMode
      theme: 'light' | 'dark'
      locale: string
      value?: any
    }
  | { s2a: 1; kind: 'theme'; theme: 'light' | 'dark' }
  | { s2a: 1; kind: 'locale'; locale: string }

export function isBridgeMessage(v: unknown): v is BridgeMessage {
  return !!v && typeof v === 'object' && (v as any).s2a === 1 && typeof (v as any).kind === 'string'
}
