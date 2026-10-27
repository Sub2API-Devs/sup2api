import { ApiError, api, apiBase, session } from '@sub2api/host'
import { browserTZ } from '@/components/stats/stats'
import { currentLocale } from '@/i18n'

/**
 * Downloads GET <path> (/usage/export or /me/usage/export, CONTRACTS §66.5)
 * under the list's filters as a CSV file. The endpoint streams the file, so
 * it is fetched with the session token and saved through a temporary object
 * URL instead of the JSON client. An expired token is renewed once by any
 * JSON call, then the download is retried.
 */
export async function exportUsage(path: string, filters: Record<string, unknown>): Promise<void> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  q.set('tz', browserTZ())
  q.set('lang', currentLocale() === 'zh' ? 'zh' : 'en')
  const send = () => {
    const token = session.get()?.access_token
    return fetch(`${apiBase()}${path}?${q}`, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
  }
  let res = await send()
  if (res.status === 401) {
    await api.get('/me')
    res = await send()
  }
  if (!res.ok) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, body?.error || { code: 'unavailable', message: res.statusText || 'export failed' })
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'usage.csv'
  const url = URL.createObjectURL(await res.blob())
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
