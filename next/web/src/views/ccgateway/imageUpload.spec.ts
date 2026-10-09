import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, session } from '@sub2api/host'
import {
  CHUNK_SIZE,
  MAX_IMAGE_SIZE,
  backoffMs,
  createUploadTransport,
  formatMiB,
  imageFileProblem,
  mismatchOffset,
  retryable,
  uploadImage,
  uploadPercent,
  type UploadTransport,
  type UploadCreated,
  type UploadPosition,
  type ImageLoadResult,
  type ImageRole
} from './imageUpload'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api: mocks }))

const ID = 'AbCdEfGhIjKlMnOpQrStUv' // 22 characters
const blob = (n: number) => new Blob([new Uint8Array(n).map((_, i) => i % 251)])
const loaded = { sha256: 'f'.repeat(64), images: [{ id: 'sha256:' + 'a'.repeat(64), tags: ['ccgateway-worker:0.2.0'] }], ref: 'ccgateway-worker:0.2.0' }
const conflict = (offset: unknown) => new ApiError(409, { code: 'conflict', message: 'offset mismatch', details: { reason: 'offset_mismatch', offset } })

/** Fake controller: keeps the received offset and answers like the core. */
function fakeTransport(size: number) {
  let received = 0
  return {
    create: vi.fn(async (_size: number, _signal?: AbortSignal): Promise<UploadCreated> => ({ upload_id: ID, offset: 0, size })),
    put: vi.fn(async (_id: string, offset: number, chunk: Blob, _signal?: AbortSignal): Promise<UploadPosition> => {
      if (offset !== received) throw conflict(received)
      received += chunk.size
      return { offset: received, size }
    }),
    load: vi.fn(async (_id: string, _role: ImageRole): Promise<ImageLoadResult> => loaded),
    remove: vi.fn(async (_id: string): Promise<void> => undefined)
  } satisfies UploadTransport
}
const noSleep = vi.fn(async () => undefined)

describe('chunked image upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the chunks in order, reports progress, then loads and applies the role', async () => {
    const t = fakeTransport(10)
    const progress: number[] = []
    const phases: string[] = []
    const result = await uploadImage(blob(10), 'egress', t, { chunkSize: 4, sleep: noSleep, onProgress: p => progress.push(p.offset), onPhase: p => phases.push(p) })
    expect(result).toEqual(loaded)
    expect(t.create).toHaveBeenCalledWith(10, undefined)
    expect(t.put.mock.calls.map(c => [c[1], (c[2] as Blob).size])).toEqual([[0, 4], [4, 4], [8, 2]])
    expect(progress).toEqual([0, 4, 8, 10])
    expect(phases).toEqual(['upload', 'load'])
    expect(t.load).toHaveBeenCalledWith(ID, 'egress')
    expect(t.remove).not.toHaveBeenCalled()
  })

  it('sends the exact bytes of each slice', async () => {
    const source = blob(9)
    const got: number[] = []
    const t = fakeTransport(9)
    t.put.mockImplementation(async (_id: string, offset: number, chunk: Blob) => {
      got.push(...new Uint8Array(await chunk.arrayBuffer()))
      return { offset: offset + chunk.size, size: 9 }
    })
    await uploadImage(source, 'app', t, { chunkSize: 4, sleep: noSleep })
    expect(got).toEqual([...new Uint8Array(await source.arrayBuffer())])
  })

  it('uses 16 MiB chunks by default', () => {
    expect(CHUNK_SIZE).toBe(16 * 1024 * 1024)
  })

  it('resumes at the controller offset after a 409 offset_mismatch (lost response)', async () => {
    let calls = 0
    const t = fakeTransport(12)
    const put = t.put.getMockImplementation()!
    t.put.mockImplementation(async (id: string, offset: number, chunk: Blob) => {
      calls++
      // The second chunk arrives, but its response is lost: the client still thinks it is at 4.
      if (calls === 2) { await put(id, offset, chunk); throw new TypeError('network') }
      return put(id, offset, chunk)
    })
    const result = await uploadImage(blob(12), 'app', t, { chunkSize: 4, sleep: noSleep })
    expect(result).toEqual(loaded)
    // 0, 4 (lost), 4 again → 409 offset 8, then 8
    expect(t.put.mock.calls.map(c => c[1])).toEqual([0, 4, 4, 8])
    expect(noSleep).toHaveBeenCalledTimes(1)
    expect(t.load).toHaveBeenCalledTimes(1)
  })

  it('retries a failing chunk up to 3 times with backoff', async () => {
    const t = fakeTransport(8)
    const put = t.put.getMockImplementation()!
    let failures = 0
    t.put.mockImplementation(async (id: string, offset: number, chunk: Blob) => {
      if (offset === 4 && failures < 3) { failures++; throw new ApiError(502, { code: 'internal', message: 'bad gateway' }) }
      return put(id, offset, chunk)
    })
    await uploadImage(blob(8), 'app', t, { chunkSize: 4, sleep: noSleep })
    expect(noSleep.mock.calls.map(c => (c as unknown[])[0])).toEqual([1000, 2000, 4000])
    expect(t.load).toHaveBeenCalledTimes(1)
  })

  it('gives up after the third retry and deletes the upload', async () => {
    const t = fakeTransport(8)
    t.put.mockRejectedValue(new TypeError('network'))
    await expect(uploadImage(blob(8), 'app', t, { chunkSize: 4, sleep: noSleep })).rejects.toBeInstanceOf(TypeError)
    expect(t.put).toHaveBeenCalledTimes(4)
    expect(t.remove).toHaveBeenCalledWith(ID)
    expect(t.load).not.toHaveBeenCalled()
  })

  it('does not retry a refused chunk', async () => {
    const refused = new ApiError(400, { code: 'invalid_argument', message: 'too large', details: { reason: 'invalid_request' } })
    const t = fakeTransport(8)
    t.put.mockRejectedValue(refused)
    await expect(uploadImage(blob(8), 'app', t, { chunkSize: 4, sleep: noSleep })).rejects.toBe(refused)
    expect(t.put).toHaveBeenCalledTimes(1)
    expect(t.remove).toHaveBeenCalledWith(ID)
  })

  it('does not loop on offset mismatches forever', async () => {
    const t = fakeTransport(8)
    t.put.mockRejectedValue(conflict(0))
    await expect(uploadImage(blob(8), 'app', t, { chunkSize: 4, sleep: noSleep })).rejects.toBeInstanceOf(ApiError)
    expect(t.put).toHaveBeenCalledTimes(4)
    expect(t.remove).toHaveBeenCalled()
  })

  it('cancels: stops sending, deletes the upload and never loads', async () => {
    const ctrl = new AbortController()
    const t = fakeTransport(12)
    const put = t.put.getMockImplementation()!
    t.put.mockImplementation(async (id: string, offset: number, chunk: Blob, signal?: AbortSignal) => {
      const r = await put(id, offset, chunk, signal)
      if (offset === 4) ctrl.abort()
      return r
    })
    await expect(uploadImage(blob(12), 'controller', t, { chunkSize: 4, signal: ctrl.signal, sleep: noSleep })).rejects.toMatchObject({ name: 'AbortError' })
    expect(t.put).toHaveBeenCalledTimes(2)
    expect(t.remove).toHaveBeenCalledWith(ID)
    expect(t.load).not.toHaveBeenCalled()
  })

  it('cancels while waiting to retry', async () => {
    const ctrl = new AbortController()
    const t = fakeTransport(8)
    t.put.mockRejectedValue(new TypeError('network'))
    const sleep = vi.fn(async () => { ctrl.abort(); throw new DOMException('cancelled', 'AbortError') })
    await expect(uploadImage(blob(8), 'app', t, { chunkSize: 4, signal: ctrl.signal, sleep })).rejects.toMatchObject({ name: 'AbortError' })
    expect(t.put).toHaveBeenCalledTimes(1)
    expect(t.remove).toHaveBeenCalledWith(ID)
  })

  it('refuses an upload id that does not match the contract', async () => {
    const t = fakeTransport(4)
    t.create.mockResolvedValue({ upload_id: '../x', offset: 0, size: 4 })
    await expect(uploadImage(blob(4), 'app', t, { sleep: noSleep })).rejects.toThrow('invalid upload id')
    expect(t.put).not.toHaveBeenCalled()
  })

  it('does not delete the upload when loading fails (the load request deletes it)', async () => {
    const failed = new ApiError(400, { code: 'invalid_argument', message: 'load failed', details: { reason: 'load_failed' } })
    const t = fakeTransport(4)
    t.load.mockRejectedValue(failed)
    await expect(uploadImage(blob(4), 'app', t, { sleep: noSleep })).rejects.toBe(failed)
    expect(t.remove).not.toHaveBeenCalled()
  })

  it('classifies errors and files', () => {
    expect(mismatchOffset(conflict(8), 10)).toBe(8)
    expect(mismatchOffset(conflict(11), 10)).toBeNull()
    expect(mismatchOffset(conflict('8'), 10)).toBeNull()
    expect(mismatchOffset(new ApiError(409, { code: 'conflict', message: '', details: { reason: 'too_many_uploads' } }), 10)).toBeNull()
    expect(retryable(new TypeError('x'))).toBe(true)
    expect(retryable(new ApiError(503, { code: 'unavailable', message: '' }))).toBe(true)
    expect(retryable(new ApiError(429, { code: 'rate_limited', message: '' }))).toBe(true)
    expect(retryable(new ApiError(404, { code: 'not_found', message: '' }))).toBe(false)
    expect(retryable(new DOMException('t', 'TimeoutError'))).toBe(true)
    expect(retryable(new Error('x'))).toBe(false)
    expect(backoffMs(1)).toBe(1000)
    expect(backoffMs(9)).toBe(8000)
    expect(imageFileProblem({ name: 'worker.tar', size: 10 })).toBeNull()
    expect(imageFileProblem({ name: 'worker.TAR.GZ', size: 10 })).toBeNull()
    expect(imageFileProblem({ name: 'worker.tgz', size: 10 })).toBeNull()
    expect(imageFileProblem({ name: 'worker.zip', size: 10 })).toBe('type')
    expect(imageFileProblem({ name: 'worker.tar', size: 0 })).toBe('empty')
    expect(imageFileProblem({ name: 'worker.tar', size: MAX_IMAGE_SIZE + 1 })).toBe('tooLarge')
    expect(uploadPercent({ offset: 5, size: 10 })).toBe(50)
    expect(uploadPercent({ offset: 0, size: 0 })).toBe(0)
    expect(formatMiB(16 * 1024 * 1024)).toBe('16.0 MiB')
  })
})

describe('upload transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.set({ access_token: 'tok-1', refresh_token: 'r', expires_at: Date.now() + 3600_000 })
  })

  const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  it('PUTs the raw chunk with the offset header and the session token', async () => {
    const fetchImpl = vi.fn(async () => ok({ offset: 4, size: 8 }))
    const chunk = blob(4)
    const r = await createUploadTransport(fetchImpl as unknown as typeof fetch).put(ID, 0, chunk)
    expect(r).toEqual({ offset: 4, size: 8 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`/api/v1/system/ccgateway/runtime/uploads/${ID}`)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(chunk)
    expect(init.headers).toMatchObject({ 'X-CCG-Offset': '0', 'Content-Type': 'application/octet-stream', Authorization: 'Bearer tok-1' })
  })

  it('turns a 409 into an ApiError carrying the controller offset', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'conflict', message: 'offset mismatch', details: { reason: 'offset_mismatch', offset: 16 } } }), { status: 409 }))
    const e = await createUploadTransport(fetchImpl as unknown as typeof fetch).put(ID, 0, blob(4)).catch(x => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(mismatchOffset(e, 32)).toBe(16)
  })

  it('lets the shared client renew the session after a 401, then sends the chunk again', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(ok({ offset: 4, size: 4 }))
    mocks.get.mockImplementation(async () => { session.set({ access_token: 'tok-2', refresh_token: 'r2', expires_at: Date.now() + 3600_000 }); return { offset: 0, size: 4 } })
    const r = await createUploadTransport(fetchImpl as unknown as typeof fetch).put(ID, 0, blob(4))
    expect(r).toEqual({ offset: 4, size: 4 })
    expect(mocks.get).toHaveBeenCalledWith(`/system/ccgateway/runtime/uploads/${ID}`, undefined, expect.anything())
    expect(((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer tok-2')
  })

  it('creates, loads with apply and deletes through the console client', async () => {
    mocks.post.mockResolvedValue({})
    mocks.del.mockResolvedValue(null)
    const t = createUploadTransport(vi.fn() as unknown as typeof fetch)
    await t.create(123)
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtime/uploads', { size: 123 }, expect.anything())
    await t.load(ID, 'controller')
    expect(mocks.post).toHaveBeenLastCalledWith(`/system/ccgateway/runtime/uploads/${ID}/load`, { role: 'controller', apply: true }, expect.anything())
    await t.remove(ID)
    expect(mocks.del).toHaveBeenCalledWith(`/system/ccgateway/runtime/uploads/${ID}`, undefined, expect.anything())
  })
})
