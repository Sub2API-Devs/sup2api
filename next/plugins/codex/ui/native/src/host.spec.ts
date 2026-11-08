import { describe, expect, it } from 'vitest'
import { ApiError } from '@sub2api/host'
import { errorMessage } from './host'

describe('errorMessage', () => {
  it('shows the field messages of an invalid_argument error (pluginsdk.BadRequest)', () => {
    const e = new ApiError(400, {
      code: 'invalid_argument',
      message: 'invalid request / 请求参数不正确',
      details: { fields: [{ field: 'session_id', code: 'required', message: 'session_id is required / 缺少 session_id' }] }
    })
    expect(errorMessage(e, 'fallback')).toBe('session_id is required / 缺少 session_id')
  })

  it('shows the message of a flow refusal as given', () => {
    const e = new ApiError(400, { code: 'state_mismatch', message: 'state mismatch / state 不一致' })
    expect(errorMessage(e, 'fallback')).toBe('state mismatch / state 不一致')
  })

  it('falls back when there is no message', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
    expect(errorMessage('nope', 'fallback')).toBe('fallback')
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback')
  })
})
