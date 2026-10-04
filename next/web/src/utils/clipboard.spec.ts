import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

// Migrated from scripts/clipboard-test.mjs: secure-context API, HTTP fallback,
// permission fallback, focus kept inside a modal, exact text, cleanup.
describe('copyText', () => {
  const sample = 'test-key-with-\nexact-newline'

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  function stubClipboard(clipboard: unknown) {
    vi.stubGlobal('navigator', { ...navigator, clipboard })
  }

  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn(async () => {})
    stubClipboard({ writeText })
    const exec = vi.fn(() => true)
    document.execCommand = exec
    expect(await copyText(sample)).toBe(true)
    expect(writeText).toHaveBeenCalledWith(sample)
    expect(exec).not.toHaveBeenCalled()
  })

  for (const [name, clipboard] of [
    ['missing API (plain http)', undefined],
    ['permission denied', { writeText: async () => Promise.reject(new Error('denied')) }]
  ] as const) {
    it(`falls back to execCommand: ${name}`, async () => {
      stubClipboard(clipboard)
      const modal = document.createElement('div')
      modal.setAttribute('role', 'dialog')
      const button = document.createElement('button')
      modal.appendChild(button)
      document.body.appendChild(modal)
      button.focus()

      let seen: { value: string; parent: Element | null } | null = null
      document.execCommand = vi.fn((cmd: string) => {
        expect(cmd).toBe('copy')
        const field = document.querySelector('textarea')!
        seen = { value: field.value, parent: field.parentElement }
        return true
      })
      expect(await copyText(sample)).toBe(true)
      expect(seen!.value).toBe(sample)
      expect(seen!.parent).toBe(modal) // stays inside the modal (focus trap)
      expect(document.querySelector('textarea')).toBeNull() // cleaned up
      expect(document.activeElement).toBe(button) // focus restored
    })
  }

  it('reports failure and cleans up', async () => {
    stubClipboard(undefined)
    for (const result of [() => false, () => { throw new Error('blocked') }]) {
      document.execCommand = vi.fn(result)
      expect(await copyText(sample)).toBe(false)
      expect(document.querySelector('textarea')).toBeNull()
    }
  })
})
