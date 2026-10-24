import { beforeEach, describe, expect, it, vi } from 'vitest'

const { del, patch, toast, confirm } = vi.hoisted(() => ({ del: vi.fn(), patch: vi.fn(), toast: vi.fn(), confirm: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<typeof import('@sub2api/host')>()), api: { del, patch } }))
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<typeof import('@sub2api/ui')>()), toast, confirm }))
import { ApiError } from '@sub2api/host'
import { confirmAction, deleteResource, deleteWithConfirm, toggleStatus, useRowSwitch } from './crud'

describe('row actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes only after confirmation, then runs done', async () => {
    const done = vi.fn()
    confirm.mockResolvedValueOnce(false)
    expect(await deleteWithConfirm('/x/1', 'sure?', done)).toBe(false)
    expect(del).not.toHaveBeenCalled()
    confirm.mockResolvedValueOnce(true)
    del.mockResolvedValueOnce(undefined)
    expect(await deleteWithConfirm('/x/1', 'sure?', done)).toBe(true)
    expect(del).toHaveBeenCalledWith('/x/1', undefined)
    expect(done).toHaveBeenCalledOnce()
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('deletes with a query and toasts a failure', async () => {
    del.mockResolvedValueOnce(undefined)
    expect(await deleteResource('/x/1', { keep: 1 })).toBe(true)
    expect(del).toHaveBeenCalledWith('/x/1', { keep: 1 })
    del.mockRejectedValueOnce(new ApiError(500, { code: 'internal', message: 'boom' }))
    expect(await deleteResource('/x/1')).toBe(false)
    expect(toast).toHaveBeenCalledWith('boom', 'error')
  })

  it('flips the status', async () => {
    patch.mockResolvedValueOnce(undefined)
    await toggleStatus('/x/1', 'active')
    expect(patch).toHaveBeenCalledWith('/x/1', { status: 'disabled' })
  })

  it('runs a confirmed non-DELETE action, then done with its result', async () => {
    const run = vi.fn().mockResolvedValue('done')
    const done = vi.fn()
    confirm.mockResolvedValueOnce(false)
    expect(await confirmAction({ message: 'sure?' }, run, done)).toBe(false)
    expect(run).not.toHaveBeenCalled()
    confirm.mockResolvedValueOnce(true)
    expect(await confirmAction({ message: 'sure?' }, run, done)).toBe(true)
    expect(run).toHaveBeenCalledOnce()
    expect(done).toHaveBeenCalledWith('done')
  })

  it('toasts a failed confirmed action and skips done', async () => {
    const done = vi.fn()
    confirm.mockResolvedValueOnce(true)
    const run = vi.fn().mockRejectedValueOnce(new ApiError(500, { code: 'internal', message: 'boom' }))
    expect(await confirmAction({ message: 'sure?' }, run, done)).toBe(false)
    expect(done).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('boom', 'error')
  })

  it('switches a row optimistically and reverts on failure', async () => {
    const row = { id: 7, enabled: false }
    let fail: (e: unknown) => void = () => {}
    const sw = useRowSwitch(() => new Promise((_, reject) => (fail = reject)))
    const pending = sw.set(row, true)
    expect(row.enabled).toBe(true)
    expect(sw.busy.value.has(7)).toBe(true)
    fail(new ApiError(500, { code: 'internal', message: 'boom' }))
    await pending
    expect(row.enabled).toBe(false)
    expect(sw.busy.value.has(7)).toBe(false)
    expect(toast).toHaveBeenCalledWith('boom', 'error')
  })
})
