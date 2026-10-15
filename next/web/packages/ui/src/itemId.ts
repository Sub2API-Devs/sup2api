let sequence = 0

/** Local UI item identity, not a credential. Also works on non-HTTPS consoles. */
export function createItemId(): string {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  }
  return `ui-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`
}
