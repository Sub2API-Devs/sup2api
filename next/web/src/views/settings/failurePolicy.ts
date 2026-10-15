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
  retries_per_account: number
  switch_account: boolean
  reset_sticky: boolean
  egress: string
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
export type FailurePolicyForm = Omit<FailurePolicy, 'max_retries' | 'retries_per_account' | 'backoff_ms' | 'max_wait_ms'> & {
  max_retries: number | null
  retries_per_account: number | null
  backoff_ms: number | null
  max_wait_ms: number | null
}

export function policyFormErrors(form: FailurePolicyForm, message: string): Record<string, string> {
  const errors: Record<string, string> = {}
  const check = (key: string, value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value)) errors[key] = message
  }
  for (const key of ['max_retries', 'backoff_ms', 'max_wait_ms'] as const) check(key, form[key])
  if (form.schema_version >= 2 && form.switch_account) check('retries_per_account', form.retries_per_account)
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
    schema_version: 2,
    revision: 0,
    retry_enabled: false,
    max_retries: 2,
    retries_per_account: 0,
    switch_account: true,
    reset_sticky: true,
    egress: 'same_proxy',
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
    action: account ? 'none' : 'retry',
    same_account_retries: 1,
    exhausted_action: 'return',
    egress: 'same_proxy',
    cooldown_seconds: 60
  }
}
export function normalizedPolicy<T extends FailurePolicyForm>(policy: T): T {
  const p: T = JSON.parse(JSON.stringify(policy))
  if (p.schema_version >= 2) {
    p.reset_sticky = true
    const count = p.retries_per_account
    if (!p.switch_account && (count === null || !Number.isInteger(count) || count < 0 || count > 9)) p.retries_per_account = 0
  }
  for (const r of [...p.retry_rules, ...p.account_rules]) {
    r.match.keywords = (r.match.keywords || []).map(k => k.trim()).filter(Boolean)
    r.match.groups ||= []
    r.match.models ||= []
    r.match.protocols ||= []
  }
  return p
}

export function needsPolicyMigration(policy: FailurePolicy): boolean {
  return policy.schema_version < 2 || (policy.switch_account && !policy.reset_sticky)
}

// This is an editable migration draft; the server keeps executing v1 until publish.
export function editablePolicy(policy: FailurePolicy): FailurePolicyForm {
  const p = normalizedPolicy(policy)
  if (p.schema_version >= 2) return p
  const rule = p.retry_rules.find(r => r.enabled && r.action !== 'return')
  const exhausted = rule?.action === 'retry' ? rule.exhausted_action : rule?.action
  p.schema_version = 2
  p.retries_per_account = rule?.action === 'retry' ? rule.same_account_retries : 0
  p.switch_account = exhausted !== 'return'
  p.reset_sticky = true
  p.egress = rule?.egress || 'same_proxy'
  for (const r of p.retry_rules) {
    if (r.action !== 'return') r.action = 'retry'
  }
  return p
}

export function retryAccountSequence(policy: FailurePolicyForm): string[] {
  const count = policy.max_retries
  const perAccount = policy.switch_account ? policy.retries_per_account : 0
  if (count === null || perAccount === null || !Number.isInteger(count) || !Number.isInteger(perAccount)) return []
  if (count < 0 || count > 9 || perAccount < 0 || perAccount > 9) return []
  const sequence = ['A']
  if (!policy.retry_enabled) return sequence
  for (let i = 0; i < count; i++) {
    const account = !policy.switch_account ? 0 : perAccount === 0 ? i + 1 : Math.floor(i / perAccount)
    sequence.push(String.fromCharCode(65 + account))
  }
  return sequence
}
