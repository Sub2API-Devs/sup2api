import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }))
vi.mock('@sub2api/ui', async (orig) => ({ ...(await orig<typeof import('@sub2api/ui')>()), toast }))
import { ApiError } from '@sub2api/host'
import { applyFormError } from './formErrors'

describe('applyFormError', () => {
  it('shows field errors next to the fields only', () => {
    const errors = ref<Record<string, string>>({})
    const e = new ApiError(400, { code: 'invalid_argument', message: 'bad', details: { fields: [{ field: 'name', message: 'required' }] } })
    expect(applyFormError(e, errors)).toBe(true)
    expect(errors.value).toEqual({ name: 'required' })
    expect(toast).not.toHaveBeenCalled()
  })
  it('toasts any other error and clears stale field errors', () => {
    const errors = ref<Record<string, string>>({ name: 'old' })
    expect(applyFormError(new ApiError(500, { code: 'internal', message: 'boom' }), errors)).toBe(false)
    expect(errors.value).toEqual({})
    expect(toast).toHaveBeenCalledWith('boom', 'error')
  })
})
