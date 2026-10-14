import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, put, toast } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), toast: vi.fn() }))
vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<typeof import('@sub2api/host')>()), api: { get, put } }))
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<typeof import('@sub2api/ui')>()), toast }))
import { ApiError } from '@sub2api/host'
import { useSettingsForm } from './useSettingsForm'

interface S { enabled: boolean; ttl: number }
function make() {
  return useSettingsForm<S>({
    path: '/settings/x',
    defaults: { enabled: true, ttl: 60 },
    responseKey: 'enabled',
    toBody: (f, errs) => {
      if (f.ttl <= 0) errs.ttl = 'positive'
      return { ...f }
    }
  })
}

describe('useSettingsForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads, tracks dirty and resets to the loaded values', async () => {
    get.mockResolvedValue({ enabled: false, ttl: 30 })
    const s = make()
    expect(s.isLoaded.value).toBe(false)
    await s.load()
    expect(get).toHaveBeenCalledWith('/settings/x')
    expect(s.form).toEqual({ enabled: false, ttl: 30 })
    expect(s.dirty.value).toBe(false)
    s.form.ttl = 10
    expect(s.dirty.value).toBe(true)
    s.reset()
    expect(s.form.ttl).toBe(30)
    expect(s.dirty.value).toBe(false)
  })

  it('stops on client validation errors without calling the server', async () => {
    get.mockResolvedValue({ enabled: true, ttl: 30 })
    const s = make()
    await s.load()
    s.form.ttl = 0
    expect(await s.save()).toBe(false)
    expect(s.errors.value).toEqual({ ttl: 'positive' })
    expect(put).not.toHaveBeenCalled()
  })

  it('saves, applies the response and falls back to the body when the response is empty', async () => {
    get.mockResolvedValue({ enabled: true, ttl: 30 })
    const s = make()
    await s.load()
    s.form.ttl = 45
    put.mockResolvedValue({})
    expect(await s.save()).toBe(true)
    expect(put).toHaveBeenCalledWith('/settings/x', { enabled: true, ttl: 45 })
    expect(s.form.ttl).toBe(45)
    expect(s.dirty.value).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('maps server field errors to errors without a toast', async () => {
    get.mockResolvedValue({ enabled: true, ttl: 30 })
    const s = make()
    await s.load()
    s.form.ttl = 5
    put.mockRejectedValue(new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'ttl', message: 'too small' }] } }))
    expect(await s.save()).toBe(false)
    expect(s.errors.value).toEqual({ ttl: 'too small' })
    expect(toast).not.toHaveBeenCalled()
    expect(s.dirty.value).toBe(true)
  })

  it('keeps a load failure inline when asked to', async () => {
    get.mockRejectedValue(new ApiError(503, { code: 'unavailable', message: 'down' }))
    const s = useSettingsForm<{ repository: string }>({ path: '/r', defaults: { repository: '' }, inlineLoadError: true })
    await s.load()
    expect(s.loadError.value).toBe('down')
    expect(s.isLoaded.value).toBe(false)
    expect(toast).not.toHaveBeenCalled()
  })
})
