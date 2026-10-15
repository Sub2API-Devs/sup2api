export interface FailureMatch {
  source: 'upstream' | 'transport' | 'core'
  status_codes: string
  keywords: string[]
  mode: 'all' | 'any'
  groups: number[]
  models: string[]
  protocols: string[]
}
export interface FailureRule {
  id: string
  name: string
  enabled: boolean
  match: FailureMatch
  action: string
  same_account_retries: number
  exhausted_action: string
  egress: string
  cooldown_seconds: number
}
export interface FailurePolicy {
  schema_version: number
  revision: number
  retry_enabled: boolean
  max_retries: number
  backoff_ms: number
  max_wait_ms: number
  respect_retry_after: boolean
  account_enabled: boolean
  retry_rules: FailureRule[]
  account_rules: FailureRule[]
}
export interface FailurePolicyResponse {
  configured: boolean
  policy: FailurePolicy
}
export type FailurePolicyForm = Omit<FailurePolicy, 'max_retries' | 'backoff_ms' | 'max_wait_ms'> & {
  max_retries: number | null
  backoff_ms: number | null
  max_wait_ms: number | null
}

export function policyFormErrors(form: FailurePolicyForm, message: string): Record<string, string> {
  const errors: Record<string, string> = {}
  const check = (key: string, value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value)) errors[key] = message
  }
  for (const key of ['max_retries', 'backoff_ms', 'max_wait_ms'] as const) check(key, form[key])
  form.retry_rules.forEach((rule, i) => {
    if (rule.action === 'retry') check(`retry_rules.${i}.same_account_retries`, rule.same_account_retries)
  })
  form.account_rules.forEach((rule, i) => {
    if (rule.action === 'cooldown') check(`account_rules.${i}.cooldown_seconds`, rule.cooldown_seconds)
  })
  return errors
}
export interface FailureDecision {
  action: string
  account_action: string
  retry_rule?: string
  account_rule?: string
  egress?: string
  reason?: string
  account_result?: string
  attempt?: number
  account_id?: number
  revision?: number
  status?: number
}
export interface FailurePreview {
  decision: FailureDecision
  text_truncated: boolean
}
export function emptyFailurePolicy(): FailurePolicy {
  return {
    schema_version: 1,
    revision: 0,
    retry_enabled: false,
    max_retries: 2,
    backoff_ms: 200,
    max_wait_ms: 5000,
    respect_retry_after: true,
    account_enabled: false,
    retry_rules: [],
    account_rules: []
  }
}
export function newFailureRule(name: string, account: boolean): FailureRule {
  return {
    id: crypto.randomUUID(),
    name,
    enabled: true,
    match: { source: 'upstream', status_codes: '', keywords: [], mode: 'all', groups: [], models: [], protocols: [] },
    action: account ? 'none' : 'return',
    same_account_retries: 1,
    exhausted_action: 'return',
    egress: 'same_proxy',
    cooldown_seconds: 60
  }
}
export function normalizedPolicy<T extends FailurePolicyForm>(policy: T): T {
  const p: T = JSON.parse(JSON.stringify(policy))
  for (const r of [...p.retry_rules, ...p.account_rules]) {
    r.match.keywords = (r.match.keywords || []).map(k => k.trim()).filter(Boolean)
    r.match.groups ||= []
    r.match.models ||= []
    r.match.protocols ||= []
  }
  return p
}
