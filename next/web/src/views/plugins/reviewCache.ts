// Reviews returned by upload / install-from-market, kept in memory (and in
// sessionStorage so a reload of the consent page still works) until the
// consent page reads them. GET /plugins/:key/versions/:version/review is
// the primary source; this is the fallback.
import type { PluginReview } from '@/api/types'

const STORAGE_KEY = 's2a.pluginReviews'
const cache = new Map<string, PluginReview>()

function id(key: string, version: string) {
  return `${key}@${version}`
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    /* storage unavailable or full */
  }
}

try {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, PluginReview>)) cache.set(k, v)
} catch {
  /* ignore */
}

export function putReview(r: PluginReview) {
  cache.set(id(r.plugin_key, r.version), r)
  persist()
}

export function getReview(key: string, version: string): PluginReview | undefined {
  return cache.get(id(key, version))
}

export function dropReview(key: string, version: string) {
  cache.delete(id(key, version))
  persist()
}

/** Path of the consent page for a review. */
export function consentPath(key: string, version: string): string {
  return `/plugins/${encodeURIComponent(key)}/versions/${encodeURIComponent(version)}/consent`
}
