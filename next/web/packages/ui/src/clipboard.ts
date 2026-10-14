/** Copies text: navigator.clipboard when available (secure contexts), else a hidden textarea + execCommand. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall back below */
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    document.body.appendChild(el)
    el.select()
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    el.remove()
    return !!ok
  } catch {
    return false
  }
}
