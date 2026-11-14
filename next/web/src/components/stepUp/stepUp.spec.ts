import { describe, expect, it } from 'vitest'
import { cancelStepUps, pendingStepUp, requestStepUp, settleStepUp } from './stepUp'

const DELETE = { scope: 'user.delete', context: 'DELETE /api/v1/users/1' }
const REVEAL = { scope: 'apikey.reveal', context: 'POST /api/v1/me/api-keys/2/reveal' }

describe('requestStepUp', () => {
  it('shows one verification at a time and resolves each with its proof or null', async () => {
    const a = requestStepUp(DELETE)
    const b = requestStepUp(REVEAL)
    expect(pendingStepUp.value?.challenge).toEqual(DELETE)
    settleStepUp('p1')
    expect(await a).toBe('p1')
    expect(pendingStepUp.value?.challenge).toEqual(REVEAL)
    settleStepUp(null)
    expect(await b).toBeNull()
    expect(pendingStepUp.value).toBeNull()
  })

  it('gives each request its own entry, also with the same challenge', () => {
    void requestStepUp(DELETE)
    const first = pendingStepUp.value
    settleStepUp('p')
    void requestStepUp(DELETE)
    expect(pendingStepUp.value?.id).not.toBe(first?.id)
    settleStepUp(null)
  })

  it('drops an aborted request, shown or waiting', async () => {
    const shown = new AbortController()
    const queued = new AbortController()
    const a = requestStepUp(DELETE, shown.signal)
    const b = requestStepUp(REVEAL, queued.signal)
    const c = requestStepUp(REVEAL)
    queued.abort()
    expect(await b).toBeNull()
    shown.abort()
    expect(await a).toBeNull()
    expect(pendingStepUp.value?.challenge).toEqual(REVEAL)
    settleStepUp('pc')
    expect(await c).toBe('pc')
    expect(await requestStepUp(DELETE, AbortSignal.abort())).toBeNull()
  })

  it('cancels every verification when the session ends', async () => {
    const a = requestStepUp(DELETE)
    const b = requestStepUp(REVEAL)
    cancelStepUps()
    expect(await a).toBeNull()
    expect(await b).toBeNull()
    expect(pendingStepUp.value).toBeNull()
  })
})
