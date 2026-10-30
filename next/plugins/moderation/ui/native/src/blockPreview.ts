// What a refused request receives: the host renders the plugin's deny in the
// endpoint's error format. Mirrors writeError in
// server/internal/gateway/errors.go (status outside 400–599 → 403).

export const BLOCK_FORMATS = ['openai', 'anthropic', 'gemini'] as const
export type BlockFormat = (typeof BLOCK_FORMATS)[number]

const DENY_CODE = 'moderation_blocked'
const DEFAULT_MESSAGE = 'request blocked by gateway policy'

const OPENAI_TYPE: Record<number, string> = { 401: 'authentication_error', 402: 'insufficient_quota', 403: 'permission_error', 404: 'not_found_error', 429: 'rate_limit_error' }
const ANTHROPIC_TYPE: Record<number, string> = {
  400: 'invalid_request_error',
  401: 'authentication_error',
  402: 'billing_error',
  403: 'permission_error',
  404: 'not_found_error',
  413: 'request_too_large',
  429: 'rate_limit_error',
  503: 'overloaded_error',
  529: 'overloaded_error'
}
const GOOGLE_STATUS: Record<number, string> = {
  400: 'INVALID_ARGUMENT',
  413: 'INVALID_ARGUMENT',
  401: 'UNAUTHENTICATED',
  402: 'FAILED_PRECONDITION',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  429: 'RESOURCE_EXHAUSTED',
  503: 'UNAVAILABLE',
  504: 'DEADLINE_EXCEEDED'
}

/** The HTTP status and JSON body a refused request of the format receives. */
export function blockResponse(format: BlockFormat, rawStatus: number, rawMessage: string): { status: number; body: string } {
  const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 403
  const message = rawMessage || DEFAULT_MESSAGE
  const server = status >= 500
  const bodies: Record<BlockFormat, () => unknown> = {
    openai: () => ({ error: { message, type: OPENAI_TYPE[status] ?? (server ? 'server_error' : 'invalid_request_error'), code: DENY_CODE, param: null } }),
    anthropic: () => ({ type: 'error', error: { type: ANTHROPIC_TYPE[status] ?? (server ? 'api_error' : 'invalid_request_error'), message, code: DENY_CODE } }),
    gemini: () => ({
      error: {
        code: status,
        message,
        status: GOOGLE_STATUS[status] ?? (server ? 'INTERNAL' : 'UNKNOWN'),
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: DENY_CODE, domain: 'sub2api' }]
      }
    })
  }
  return { status, body: JSON.stringify(bodies[format](), null, 2) }
}
