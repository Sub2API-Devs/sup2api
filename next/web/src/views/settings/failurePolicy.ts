import { createItemId } from '@sub2api/ui'

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
  for (const key of ['max_retries', 'backoff_ms'] as const) check(key, form[key])
  if (form.schema_version >= 2 && form.switch_account) check('retries_per_account', form.retries_per_account)
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
    schema_version: 3,
    revision: 0,
    retry_enabled: false,
    max_retries: 2,
    retries_per_account: 0,
    switch_account: true,
    reset_sticky: true,
    egress: 'account_configured',
    backoff_ms: 200,
    max_wait_ms: 0,
    respect_retry_after: false,
    account_enabled: false,
    retry_rules: [],
    account_rules: []
  }
}
export function newFailureRule(name: string, account: boolean): FailureRule {
  return {
    id: createItemId(),
    name,
    enabled: true,
    match: { source: 'upstream', status_codes: '', keywords: [], mode: 'any', groups: [], models: [], protocols: [] },
    action: account ? 'disable' : 'retry',
    same_account_retries: 0,
    exhausted_action: '',
    egress: '',
    cooldown_seconds: 0
  }
}
export function normalizedPolicy<T extends FailurePolicyForm>(policy: T): T {
  const p: T = JSON.parse(JSON.stringify(policy))
  if (p.schema_version >= 3) {
    p.reset_sticky = true
    p.egress = 'account_configured'
    p.respect_retry_after = false
    p.max_wait_ms = 0
    if (!p.switch_account) p.retries_per_account = 0
    p.retry_rules.forEach(r => fixedRule(r, false))
    p.account_rules.forEach(r => fixedRule(r, true))
  }
  for (const r of [...p.retry_rules, ...p.account_rules]) {
    r.match.keywords = [...new Set((r.match.keywords || []).map(k => k.trim()).filter(Boolean))]
    r.match.status_codes = normalizeStatusCodes(r.match.status_codes)
    r.match.groups ||= []
    r.match.models ||= []
    r.match.protocols ||= []
  }
  return p
}

export function needsPolicyMigration(policy: FailurePolicy): boolean {
  return policy.schema_version < 3
}

// This is an editable migration draft; the server keeps executing v1 until publish.
export function editablePolicy(policy: FailurePolicy): FailurePolicyForm {
  const p = normalizedPolicy(policy)
  if (p.schema_version >= 3) return p
  const rule = p.retry_rules.find(r => r.enabled && r.action !== 'return')
  const exhausted = rule?.action === 'retry' ? rule.exhausted_action : rule?.action
  if (p.schema_version === 1) {
    p.retries_per_account = rule?.action === 'retry' ? rule.same_account_retries : 0
    p.switch_account = exhausted !== 'return'
  }
  p.schema_version = 3
  p.retry_rules = p.retry_rules.filter(r => r.enabled && r.action !== 'return')
  p.account_rules = p.account_rules.filter(r => r.enabled && r.action !== 'none')
  return normalizedPolicy(p)
}

function fixedRule(rule: FailureRule, account: boolean) {
  rule.enabled = true
  rule.action = account ? 'disable' : 'retry'
  rule.same_account_retries = 0
  rule.exhausted_action = ''
  rule.egress = ''
  rule.cooldown_seconds = 0
}

export function normalizeStatusCodes(value: string): string {
  return value
    .replace(/[，；;\r\n]/g, ',')
    .split(',')
    .map(code => code.trim())
    .filter(Boolean)
    .join(',')
}

export function ruleFormErrors(rule: FailureRule, message: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!rule.name.trim()) errors.name = message
  const codes = normalizeStatusCodes(rule.match.status_codes).split(',').filter(Boolean)
  if (
    codes.some(code => {
      if (!/^\d{3}(\s*-\s*\d{3})?$/.test(code)) return true
      const [lo = 0, hi = lo] = code.split('-').map(Number)
      return lo < 400 || hi > 599 || lo > hi
    })
  )
    errors.status_codes = message
  if (!codes.length && !rule.match.keywords.some(k => k.trim()) && rule.match.source !== 'transport') errors.conditions = message
  if (rule.match.groups.some(id => !Number.isInteger(id) || id <= 0)) errors.groups = message
  return errors
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
