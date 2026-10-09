// Image upload of the control-panel mode (CONTRACTS §53.6): a container image
// archive (docker save, .tar / .tar.gz / .tgz) is sent to the core in 16 MiB
// chunks, each forwarded to the controller on its own, then loaded and applied:
//
//   POST   /system/ccgateway/runtime/uploads {size}         → {upload_id, offset, size}
//   PUT    /system/ccgateway/runtime/uploads/:id  (X-CCG-Offset, raw bytes) → {offset, size}
//          409 details.reason = offset_mismatch, details.offset = where the controller is
//   POST   /system/ccgateway/runtime/uploads/:id/load {role, apply: true}
//   DELETE /system/ccgateway/runtime/uploads/:id            (cancel / give up)
//
// The chunk loop is a pure function over an injectable transport, so the
// resume / retry / cancel rules are unit-tested apart from the component.
import { ApiError, api, apiBase, session } from '@sub2api/host'
import type { CcgRuntimeImages, CcgWorkersReport } from '@/api/types'

export type ImageRole = 'app' | 'egress' | 'controller'
export const IMAGE_ROLES: readonly ImageRole[] = ['app', 'egress', 'controller']
export const CHUNK_SIZE = 16 * 1024 * 1024
/** Retries of one chunk after its first failure. */
export const MAX_RETRIES = 3
/** Largest archive the controller accepts (§53.5). */
export const MAX_IMAGE_SIZE = 4 * 1024 * 1024 * 1024
/**
 * Loading (docker load + switching the image, up to 90 s for the controller; for an app image also the
 * in-place worker update of every runtime, §53.7) is one synchronous request; the core gives it 25 minutes.
 */
export const LOAD_TIMEOUT_MS = 26 * 60_000
/** POST /system/ccgateway/runtime/workers: the core gives the whole run 25 minutes. */
export const WORKERS_TIMEOUT_MS = 26 * 60_000
const CHUNK_TIMEOUT_MS = 5 * 60_000
const UPLOAD_ID_RE = /^[A-Za-z0-9_-]{22}$/
const UPLOADS = '/system/ccgateway/runtime/uploads'

export interface UploadPosition { offset: number; size: number }
export interface UploadCreated extends UploadPosition { upload_id: string }
export interface ImageLoadResult {
  sha256: string
  images: Array<{ id: string; tags: string[] }>
  ref: string
  runtime?: CcgRuntimeImages
  /** An applied app image: the in-place worker update of the existing runtimes (§53.7). */
  workers?: CcgWorkersReport
}

export interface UploadTransport {
  create(size: number, signal?: AbortSignal): Promise<UploadCreated>
  put(id: string, offset: number, chunk: Blob, signal?: AbortSignal): Promise<UploadPosition>
  load(id: string, role: ImageRole): Promise<ImageLoadResult>
  remove(id: string): Promise<void>
}

export type UploadPhase = 'upload' | 'load'
export interface UploadOptions {
  signal?: AbortSignal
  onProgress?: (p: UploadPosition) => void
  onPhase?: (phase: UploadPhase) => void
  chunkSize?: number
  retries?: number
  /** Delay before the n-th retry (1-based); injectable for tests. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

/** Why a file cannot be uploaded, or null. */
export type ImageFileProblem = 'type' | 'empty' | 'tooLarge'
export function imageFileProblem(file: { name: string; size: number } | null | undefined): ImageFileProblem | null {
  if (!file) return 'empty'
  if (!/\.(?:tar|tar\.gz|tgz)$/i.test(file.name)) return 'type'
  if (file.size < 1) return 'empty'
  if (file.size > MAX_IMAGE_SIZE) return 'tooLarge'
  return null
}

/** Percentage (0–100, whole) of an upload position. */
export function uploadPercent(p: UploadPosition | null | undefined): number {
  if (!p || !(p.size > 0)) return 0
  return Math.min(100, Math.max(0, Math.floor((p.offset / p.size) * 100)))
}

/** Byte count as MiB with one decimal ("12.5 MiB"). */
export function formatMiB(bytes: number): string {
  return `${(Math.max(0, bytes) / (1024 * 1024)).toFixed(1)} MiB`
}

function abortError(): DOMException {
  return new DOMException('The upload was cancelled', 'AbortError')
}

export function isAbort(e: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')
}

/** details.offset of a 409 offset_mismatch, when it is a usable position; else null. */
export function mismatchOffset(e: unknown, size: number): number | null {
  const d = (e as { details?: { reason?: unknown; offset?: unknown } } | null)?.details
  if (d?.reason !== 'offset_mismatch') return null
  const o = d.offset
  return typeof o === 'number' && Number.isInteger(o) && o >= 0 && o <= size ? o : null
}

/** Transient failures worth retrying the same chunk: network errors, timeouts, 408 / 429 / 5xx. */
export function retryable(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 408 || e.status === 429 || e.status >= 500
  if (e instanceof DOMException) return e.name === 'TimeoutError'
  return e instanceof TypeError
}

export function backoffMs(attempt: number): number {
  return Math.min(8000, 1000 * 2 ** (attempt - 1))
}

function sleepFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    const onAbort = () => { clearTimeout(timer); reject(abortError()) }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Uploads `file` in order, resuming at the controller's offset after a 409
 * offset_mismatch and retrying a failed chunk up to `retries` times; then
 * loads and applies it as `role`. Cancelling (signal) or giving up deletes the
 * upload; the load request deletes it itself, so it is not deleted after that.
 */
export async function uploadImage(file: Blob, role: ImageRole, transport: UploadTransport, opts: UploadOptions = {}): Promise<ImageLoadResult> {
  const { signal, onProgress, onPhase } = opts
  const chunkSize = opts.chunkSize ?? CHUNK_SIZE
  const retries = opts.retries ?? MAX_RETRIES
  const sleep = opts.sleep ?? sleepFor
  const size = file.size
  if (signal?.aborted) throw abortError()
  onPhase?.('upload')
  const created = await transport.create(size, signal)
  const id = created?.upload_id
  if (typeof id !== 'string' || !UPLOAD_ID_RE.test(id)) throw new Error('invalid upload id')
  try {
    if (signal?.aborted) throw abortError()
    let offset = mismatchOffset({ details: { reason: 'offset_mismatch', offset: created.offset ?? 0 } }, size) ?? 0
    let failures = 0
    onProgress?.({ offset, size })
    while (offset < size) {
      if (signal?.aborted) throw abortError()
      const end = Math.min(offset + chunkSize, size)
      try {
        const r = await transport.put(id, offset, file.slice(offset, end), signal)
        const next = r?.offset
        if (typeof next !== 'number' || !Number.isInteger(next) || next <= offset || next > size) throw new Error('invalid upload offset')
        offset = next
        failures = 0
        onProgress?.({ offset, size })
      } catch (e) {
        if (isAbort(e, signal)) throw signal?.aborted ? abortError() : e
        const resume = mismatchOffset(e, size)
        if (resume === null && !retryable(e)) throw e
        if (++failures > retries) throw e
        if (resume !== null) {
          // The controller already holds a different amount (e.g. the previous response was lost): continue from there.
          offset = resume
          onProgress?.({ offset, size })
          continue
        }
        await sleep(backoffMs(failures), signal)
      }
    }
  } catch (e) {
    await transport.remove(id).catch(() => undefined)
    throw e
  }
  if (signal?.aborted) {
    await transport.remove(id).catch(() => undefined)
    throw abortError()
  }
  onPhase?.('load')
  return transport.load(id, role)
}

// ---------------------------------------------------------------- transport over the console API

function statusCode(status: number): string {
  return status === 400 ? 'invalid_argument' : status === 404 ? 'not_found' : status === 409 ? 'conflict' : status === 413 ? 'payload_too_large' : status === 503 ? 'unavailable' : 'internal'
}

async function readJSON(res: Response): Promise<any> {
  const text = await res.text().catch(() => '')
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

function timeoutSignal(ms: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

/**
 * The console client JSON-encodes every non-FormData body, so a raw chunk is
 * sent with fetch carrying the same session token. A 401 lets the shared
 * client renew the session (one refresh shared with every other request, or
 * sign-out when it cannot) by reading the upload, then the chunk is sent once more.
 */
export function createUploadTransport(fetchImpl: typeof fetch = (...args) => fetch(...args)): UploadTransport {
  const path = (id: string) => `${UPLOADS}/${encodeURIComponent(id)}`
  async function put(id: string, offset: number, chunk: Blob, signal?: AbortSignal): Promise<UploadPosition> {
    const send = () => {
      const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/octet-stream', 'X-CCG-Offset': String(offset) }
      const token = session.get()?.access_token
      if (token) headers.Authorization = 'Bearer ' + token
      return fetchImpl(apiBase() + path(id), { method: 'PUT', headers, body: chunk, signal: timeoutSignal(CHUNK_TIMEOUT_MS, signal) })
    }
    let res = await send()
    if (res.status === 401) {
      await api.get(path(id), undefined, { signal })
      res = await send()
    }
    const json = await readJSON(res)
    if (!res.ok) throw new ApiError(res.status, json?.error || { code: statusCode(res.status), message: res.statusText || 'request failed' })
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as UploadPosition
  }
  return {
    create: (size, signal) => api.post<UploadCreated>(UPLOADS, { size }, { signal: timeoutSignal(60_000, signal) }),
    put,
    load: (id, role) => api.post<ImageLoadResult>(`${path(id)}/load`, { role, apply: true }, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) }),
    remove: async id => { await api.del(path(id), undefined, { signal: AbortSignal.timeout(30_000) }) }
  }
}
