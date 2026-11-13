import { describe, expect, it } from 'vitest'
import { pendingStepUp, requestStepUp, settleStepUp } from './stepUp'

const flush = () => new Promise((r) => setTimeout(r))

describe('requestStepUp', () => {
  it('shows one verification at a time and resolves each with its proof or null', async () => {
    const a = requestStepUp({ scope: 'user.delete', context: 'DELETE /api/v1/users/1' })
    const b = requestStepUp({ scope: 'apikey.reveal', context: 'POST /api/v1/me/api-keys/2/reveal' })
    await flush()
    expect(pendingStepUp.value?.challenge.scope).toBe('user.delete')
    settleStepUp('p1')
    expect(await a).toBe('p1')
    await flush()
    expect(pendingStepUp.value?.challenge.scope).toBe('apikey.reveal')
    settleStepUp(null)
    expect(await b).toBeNull()
    expect(pendingStepUp.value).toBeNull()
  })
})
