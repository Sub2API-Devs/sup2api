export interface MockRequest {
  method: string
  path: string
  params: Record<string, string>
  query: Record<string, string>
  body: any
  headers: Record<string, string>
}

export type MockResult = unknown | { __status: number; body: unknown }
export type MockHandler = (req: MockRequest) => MockResult | Promise<MockResult>

export const routes: Array<{ method: string; re: RegExp; keys: string[]; handler: MockHandler }> = []

/** Registers a handler; path uses :param segments and an optional trailing *rest. */
export function on(method: string, path: string, handler: MockHandler) {
  const keys: string[] = []
  const re = new RegExp(
    '^' +
      path.replace(/\/:(\w+)/g, (_, k) => {
        keys.push(k)
        return '/([^/]+)'
      }).replace(/\/\*(\w+)$/, (_, k) => {
        keys.push(k)
        return '/(.*)'
      }) +
      '$'
  )
  routes.push({ method: method.toUpperCase(), re, keys, handler })
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return { __status: status, body: { error: { code, message, details } } }
}

export function noContent() {
  return { __status: 204, body: undefined }
}

/** Paginates an array per ?page=&page_size=. */
export function paginate<T>(items: T[], query: Record<string, string>) {
  const page = Math.max(1, Number(query.page || 1))
  const size = Math.min(200, Math.max(1, Number(query.page_size || 20)))
  return { data: items.slice((page - 1) * size, page * size), page: { page, page_size: size, total: items.length } }
}

let seq = 1000
export function nextId() {
  return ++seq
}

export function now(offsetSec = 0) {
  return new Date(Date.now() + offsetSec * 1000).toISOString()
}

/** Requires a step-up token for sensitive mock operations. */
export function needStepUp(req: MockRequest) {
  return req.headers['x-step-up-token'] ? null : fail(403, 'step_up_required', 'step-up required')
}
