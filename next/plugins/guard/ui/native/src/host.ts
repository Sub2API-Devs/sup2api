import type { PluginHost } from '@sub2api/host'

// Plugin-scoped host handed to register(); shared by all guard components.
let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useGuardHost(): PluginHost {
  if (!host) throw new Error('guard UI used before register(host)')
  return host
}

export type RuleKind = 'keyword' | 'regex'

export interface Rule {
  id?: number
  name: string
  kind: RuleKind
  pattern: string
  enabled: boolean
  updated_at?: string
}

export interface Stats {
  from: string
  to: string
  bucket: 'hour' | 'day'
  blocked_total: number
  requests_total: number
  trend: Array<{ ts: string; blocked: number; total: number }>
  top_rules: Array<{ rule_id: number; name: string; kind: RuleKind; pattern: string; hits: number }>
  recent?: Array<{
    occurred_at: string
    rule_id: number
    rule_name: string
    request_id: string
    user_id: number
    group_id: number
    model: string
    snippet?: string
  }>
}

export type Range = 'today' | '24h' | '7d' | '30d'

export function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function fetchStats(query: Record<string, string>): Promise<Stats> {
  return useGuardHost().pluginApi.get<Stats>('/stats', { tz: timezone(), ...query })
}

export async function fetchRules(): Promise<Rule[]> {
  const r = await useGuardHost().pluginApi.get<Rule[] | { rules: Rule[] }>('/rules')
  return Array.isArray(r) ? r : r?.rules || []
}

export async function saveRules(rules: Rule[]): Promise<Rule[]> {
  const r = await useGuardHost().pluginApi.put<Rule[] | { rules: Rule[] }>('/rules', { rules })
  return Array.isArray(r) ? r : r?.rules || rules
}
