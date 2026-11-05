import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPasskey, getPasskey, passkeyCancelled } from './webauthn'

const bytes = (...v: number[]) => new Uint8Array(v).buffer
const credentials = { create: vi.fn(), get: vi.fn() }
vi.stubGlobal('navigator', { ...navigator, credentials })
afterEach(() => vi.clearAllMocks())

describe('passkey ceremony', () => {
  it('decodes the options and encodes the new credential as base64url', async () => {
    credentials.create.mockResolvedValue({
      id: 'abc',
      type: 'public-key',
      rawId: bytes(0xfb, 0xff),
      getClientExtensionResults: () => ({}),
      response: { clientDataJSON: bytes(1), attestationObject: bytes(2), getTransports: () => ['internal'] }
    })
    const out: any = await createPasskey({ publicKey: { challenge: '-_8', user: { id: 'AQ', name: 'a' }, excludeCredentials: [{ id: 'Ag', type: 'public-key' }] } })
    const sent = credentials.create.mock.calls[0][0].publicKey
    expect([...new Uint8Array(sent.challenge)]).toEqual([0xfb, 0xff])
    expect([...new Uint8Array(sent.user.id)]).toEqual([1])
    expect([...new Uint8Array(sent.excludeCredentials[0].id)]).toEqual([2])
    expect(out).toMatchObject({ id: 'abc', rawId: '-_8', response: { clientDataJSON: 'AQ', attestationObject: 'Ag', transports: ['internal'] } })
  })

  it('encodes an assertion, with no allow list for a discoverable login', async () => {
    credentials.get.mockResolvedValue({
      id: 'abc',
      type: 'public-key',
      rawId: bytes(1),
      getClientExtensionResults: () => ({}),
      response: { clientDataJSON: bytes(1), authenticatorData: bytes(2), signature: bytes(3), userHandle: bytes(49) }
    })
    const out: any = await getPasskey({ publicKey: { challenge: 'AQ' } })
    expect(credentials.get.mock.calls[0][0].publicKey.allowCredentials).toBeUndefined()
    expect(out.response).toEqual({ clientDataJSON: 'AQ', authenticatorData: 'Ag', signature: 'Aw', userHandle: 'MQ' })
  })

  it('treats a dismissed prompt as a cancellation, not an error', async () => {
    credentials.get.mockResolvedValue(null)
    const err = await getPasskey({ publicKey: { challenge: 'AQ' } }).catch((e) => e)
    expect(passkeyCancelled(err)).toBe(true)
    expect(passkeyCancelled(new Error('boom'))).toBe(false)
  })
})
