import type { PluginHost } from '@sub2api/host'

let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useGrowthHost(): PluginHost {
  if (!host) throw new Error('growth UI used before register(host)')
  return host
}

export const PERM_READ = 'growth:read'
export const PERM_MANAGE = 'growth:manage'

export function canManage(): boolean {
  return useGrowthHost().can(PERM_MANAGE)
}
