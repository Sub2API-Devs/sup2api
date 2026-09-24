import { lt } from '@/i18n'

/** Validation issue: a string, or {code, message: string | {en, zh}, detail}. */
export type Issue = string | { code?: string; message?: unknown; detail?: unknown; [k: string]: unknown }

export function issueText(x: Issue): string {
  if (typeof x === 'string') return x
  if (x && typeof x === 'object') {
    const m = lt(x.message)
    if (m) return m
    if (x.code) return String(x.code)
  }
  return JSON.stringify(x)
}
