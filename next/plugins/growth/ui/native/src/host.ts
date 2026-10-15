import type { PluginHost } from '@sub2api/host'

let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useGrowthHost(): PluginHost {
  if (!host) throw new Error('growth UI used before register(host)')
  return host
}

/** Human-readable message of a failed call (ApiError is an Error), else `fallback`. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}
