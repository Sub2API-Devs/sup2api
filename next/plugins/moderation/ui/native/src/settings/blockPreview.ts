
// What a refused client receives (block-response preview). Mirrors the
// core's gateway error writer (server/internal/gateway/errors.go writeError):
// the hook denial becomes {Status, Code: moderation_blocked, Message} and is
// written in the endpoint's format. Moderation runs before the upstream call,
// so a streaming request is refused before its event stream starts and gets
// the same JSON body and status. Tested in __tests__/blockPreview.test.mts.

export const BLOCK_CODE = 'moderation_blocked'

/** Status codes offered by the settings page (the schema allows 400–599). */
export const BLOCK_STATUSES = [400, 403, 451]

export type BlockFormat = 'openai' | 'anthropic' | 'gemini'

export function anthropicType(status: number): string {
  if (status === 400) return 'invalid_request_error'
  if (status === 401) return 'authentication_error'
  if (status === 402) return 'billing_error'
  if (status === 403) return 'permission_error'
  if (status === 404) return 'not_found_error'
  if (status === 413) return 'request_too_large'
  if (status === 429) return 'rate_limit_error'
  if (status === 503 || status === 529) return 'overloaded_error'
  if (status >= 500) return 'api_error'
  return 'invalid_request_error'
}

export function openaiType(status: number): string {
  if (status === 401) return 'authentication_error'
  if (status === 402) return 'insufficient_quota'
  if (status === 403) return 'permission_error'
  if (status === 404) return 'not_found_error'
  if (status === 429) return 'rate_limit_error'
  if (status >= 500) return 'server_error'
  return 'invalid_request_error'
}

export function googleStatus(status: number): string {
  switch (status) {
    case 400:
    case 413:
      return 'INVALID_ARGUMENT'
    case 401:
      return 'UNAUTHENTICATED'
    case 402:
      return 'FAILED_PRECONDITION'
    case 403:
      return 'PERMISSION_DENIED'
    case 404:
      return 'NOT_FOUND'
    case 429:
      return 'RESOURCE_EXHAUSTED'
    case 503:
      return 'UNAVAILABLE'
    case 504:
      return 'DEADLINE_EXCEEDED'
  }
  return status >= 500 ? 'INTERNAL' : 'UNKNOWN'
}

/** Error body of one endpoint format; `msg` is the message sent (the built-in text when the setting is empty). */
export function blockBody(format: BlockFormat, status: number, msg: string): unknown {
  switch (format) {
    case 'anthropic':
      return { type: 'error', error: { type: anthropicType(status), message: msg, code: BLOCK_CODE } }
    case 'gemini':
      return {
        error: {
          code: status,
          message: msg,
          status: googleStatus(status),
          details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: BLOCK_CODE, domain: 'sub2api' }]
        }
      }
    default:
      return { error: { message: msg, type: openaiType(status), code: BLOCK_CODE, param: null } }
  }
}

/** HTTP response text of a format: status line, content type, pretty JSON. */
export function blockResponse(format: BlockFormat, status: number, message: string): string {
  return `HTTP ${status}\nContent-Type: application/json\n\n${JSON.stringify(sortKeys(blockBody(format, status, message)), null, 2)}`
}

/** Copy with object keys sorted, as Go's encoding/json writes the core's maps. */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]))
  }
  return v
}
