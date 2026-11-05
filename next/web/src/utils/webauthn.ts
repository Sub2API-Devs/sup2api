// The browser side of a passkey ceremony: the server's options carry binary
// fields as base64url, and navigator.credentials wants ArrayBuffers back and
// forth.

function toBuffer(value: string): ArrayBuffer {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out.buffer
}

function fromBuffer(value: ArrayBuffer | null | undefined): string | undefined {
  if (!value) return undefined
  let raw = ''
  for (const byte of new Uint8Array(value)) raw += String.fromCharCode(byte)
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const descriptors = (list?: Array<{ id: string }>) => list?.map((x) => ({ ...x, id: toBuffer(x.id) }))

/** Whether this browser, on this address, can use passkeys at all. */
export function passkeySupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials && window.isSecureContext
}

/** The user dismissed the browser's prompt or it timed out: nothing to report. */
export function passkeyCancelled(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')
}

/** Asks for a new passkey; returns the JSON the server's finish endpoint takes. */
export async function createPasskey(options: { publicKey: any }): Promise<unknown> {
  const pk = options.publicKey
  const cred = (await navigator.credentials.create({
    publicKey: { ...pk, challenge: toBuffer(pk.challenge), user: { ...pk.user, id: toBuffer(pk.user.id) }, excludeCredentials: descriptors(pk.excludeCredentials) }
  })) as PublicKeyCredential | null
  if (!cred) throw new DOMException('no credential', 'NotAllowedError')
  const res = cred.response as AuthenticatorAttestationResponse
  return {
    id: cred.id,
    rawId: fromBuffer(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: fromBuffer(res.clientDataJSON),
      attestationObject: fromBuffer(res.attestationObject),
      transports: res.getTransports?.() ?? []
    },
    clientExtensionResults: cred.getClientExtensionResults()
  }
}

/** Asks for an existing passkey; returns the JSON the server's finish endpoint takes. */
export async function getPasskey(options: { publicKey: any }): Promise<unknown> {
  const pk = options.publicKey
  const cred = (await navigator.credentials.get({
    publicKey: { ...pk, challenge: toBuffer(pk.challenge), allowCredentials: descriptors(pk.allowCredentials) }
  })) as PublicKeyCredential | null
  if (!cred) throw new DOMException('no credential', 'NotAllowedError')
  const res = cred.response as AuthenticatorAssertionResponse
  return {
    id: cred.id,
    rawId: fromBuffer(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: fromBuffer(res.clientDataJSON),
      authenticatorData: fromBuffer(res.authenticatorData),
      signature: fromBuffer(res.signature),
      userHandle: fromBuffer(res.userHandle)
    },
    clientExtensionResults: cred.getClientExtensionResults()
  }
}
