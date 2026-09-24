// DTOs of the console REST API (docs/CONTRACTS.md §5). Fields marked
// "assumed" are not spelled out in the contract; views must tolerate their
// absence.

export type LText = string | Record<string, string>

/** Money is a decimal string ("12.34000000"). */
export type Money = string

// ------------------------------------------------------------------ auth / me

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user?: Me
}

export interface Me {
  id: number
  email: string
  display_name: string
  roles: string[]
  permissions: string[]
  superuser: boolean
}

export interface MenuItem {
  id: string
  label: LText
  icon?: string
  path: string
  plugin_key?: string
}

export interface MenuSection {
  section: string | Record<string, string>
  items: MenuItem[]
}

// ------------------------------------------------------------------ users, roles, permissions

export interface User {
  id: number
  email: string
  display_name: string
  status: string
  max_concurrency: number
  roles?: string[] // assumed
  group_ids?: number[] // assumed
  balance?: Money // assumed
  last_login_at?: string | null
  created_at?: string
}

export interface Role {
  id: number
  key: string
  name: LText
  description?: LText
  builtin: boolean
  superuser: boolean
  permission_keys?: string[] // assumed
  member_count?: number // assumed
}

export interface PermissionItem {
  key: string
  label: LText
  sensitive: boolean
  status: string // active | disabled | removed
}

export interface PermissionModule {
  module: string
  label: LText
  source: string // core | plugin
  plugin_key?: string | null
  status: string
  permissions: PermissionItem[]
}

// ------------------------------------------------------------------ keys, groups, proxies

export interface ApiKey {
  id: number
  user_id?: number
  user_email?: string // assumed
  group_id: number
  group_name?: string // assumed
  name: string
  key_prefix: string
  status: string
  expires_at?: string | null
  last_used_at?: string | null
  created_at: string
  key?: string // plaintext, only in the create response
}

export interface Group {
  id: number
  name: string
  description: string
  status: string
  rate_multiplier: string | number
  visibility: 'public' | 'restricted'
  model_allowlist: string[]
  account_count?: number // assumed
  key_count?: number // assumed
  created_at?: string
}

export interface Proxy {
  id: number
  name: string
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username: string
  password?: string // write-only; "******" when set (assumed)
  status: string
  created_at?: string
}

export interface ProxyTestResult {
  ok: boolean
  latency_ms?: number
  ip?: string
  message?: string
}

// ------------------------------------------------------------------ accounts

export interface AccountFormRef {
  mode: 'schema' | 'iframe' | 'native'
  page?: string
  component?: string
}

export interface AccountType {
  plugin_key: string
  plugin_name: LText
  plugin_version?: string // assumed
  platform: string
  type: string
  label: LText
  description?: LText
  form: AccountFormRef
  sensitive_fields: string[]
}

export interface Account {
  id: number
  name: string
  plugin_key: string
  platform: string
  type: string
  group_ids: number[]
  proxy_id: number | null
  priority: number
  max_concurrency: number
  schedulable: boolean
  status: string
  status_reason?: string
  credentials?: Record<string, unknown>
  in_use?: number
  cooldown_until?: string | null
  cooldown_reason?: string // assumed
  orphaned?: boolean
  last_used_at?: string | null
  created_at?: string
}

export interface AccountTestResult {
  ok: boolean
  status: number
  latency_ms: number
  message: string
}

// ------------------------------------------------------------------ billing

export type PriceMode = 'per_request' | 'per_token' | 'expression'

export interface Price {
  id: number
  platform: string
  model_pattern: string
  mode: PriceMode
  config: Record<string, any>
  expression: string
  expr_version: number
  expr_hash: string
  source: 'plugin_default' | 'admin'
  plugin_key?: string | null
  enabled: boolean
  note: string
  updated_at?: string
}

export interface PriceValidateResult {
  ok: boolean
  expression: string
  errors: Array<string | { message: string; [k: string]: unknown }>
  warnings: Array<string | { message: string; [k: string]: unknown }>
}

export interface PricePreviewResult {
  cost: Money
  tier: string
  rules: Array<{ cond: string; multiplier: number | string; matched: boolean }>
  breakdown: Record<string, unknown>
}

export interface LedgerEntry {
  id: number
  user_id: number
  user_email?: string // assumed
  delta: Money
  balance_after: Money
  kind: string
  ref_type: string
  ref_id: string
  operator_id?: number | null
  plugin_key?: string | null
  note: string
  created_at: string
}

export interface UsageLog {
  id: number
  request_id: string
  user_id: number
  user_email?: string // assumed
  api_key_id: number
  group_id: number
  group_name?: string // assumed
  account_id: number | null
  account_name?: string // assumed
  plugin_key: string
  platform: string
  protocol: string
  endpoint: string
  model: string
  upstream_model?: string
  stream: boolean
  status_code: number
  success: boolean
  error_type: string
  error_message?: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  cache_creation_1h_tokens?: number
  total_cost: Money
  rate_multiplier?: string | number
  billing_status: string
  billing_mode?: string
  matched_tier?: string
  price_id?: number | null
  expr_hash?: string
  billing_detail?: Record<string, any>
  hook_decisions?: Array<{ plugin_key: string; hook_id: string; decision: string; latency_ms: number; note?: string }>
  sticky_rule?: string
  sticky_hit?: boolean
  latency_ms: number
  first_token_ms?: number
  ledger_id?: number | null // assumed
  created_at: string
}

export interface UsageSummaryRow {
  key: string
  requests: number
  success?: number
  input_tokens?: number
  output_tokens?: number
  total_cost: Money
}

export interface BillingSettings {
  missing_price_policy: 'reject' | 'free'
  min_balance: Money
  big_cost_warning_usd: Money
}

// ------------------------------------------------------------------ sticky

export interface StickyRule {
  id: number
  name: string
  source: 'plugin_default' | 'admin'
  plugin_key?: string | null
  enabled: boolean
  priority: number
  match: { protocols?: string[]; models?: string[]; userAgentContains?: string[] }
  key_sources: Array<{ type: string; path?: string; name?: string; needs?: string[] }>
  value_regex: string
  ttl_seconds: number
  key_includes: string[]
  on_failure: 'failover' | 'stick'
}

export interface StickyStats {
  rule: string
  hits: number
  misses: number
  rebinds: number
}

export interface StickySettings {
  enabled: boolean
  default_ttl_seconds: number
  keep_on_account_disabled: boolean
}

// ------------------------------------------------------------------ plugins

export type Trust = 'official' | 'verified' | 'community' | 'unsigned' | string

export interface PluginSummary {
  key: string
  name: LText
  status: string
  status_reason?: string
  active_version?: string | null
  desired_version?: string | null
  publisher?: string
  trust?: Trust
  nodes?: Record<string, number> | Array<{ node_id: string; state: string }> // summary, shape assumed
  description?: LText
}

export interface HostPermissionReview {
  id: string
  risk: 'low' | 'medium' | 'high' | 'critical'
  scope?: Record<string, unknown> | null
  reason?: LText
  optional?: boolean
  requires?: string
}

export interface PluginReview {
  plugin_key: string
  version: string
  name: LText
  publisher: string
  trust: Trust
  signature_status: string
  host_compat_ok: boolean
  host_compat?: string
  capabilities: Array<string | { id: string }>
  gateway_endpoints: Array<Record<string, any>>
  platform?: { id: string; protocols: string[]; account_types: Array<Record<string, any>> } | null
  hooks: Array<Record<string, any>>
  jobs: Array<Record<string, any>>
  events: Array<string | Record<string, any>>
  routes: Array<Record<string, any>>
  menus: Array<Record<string, any>>
  user_permissions: Array<{ key: string; label: LText; description?: LText; sensitive?: boolean }>
  database?: { schema: string; migrations: string[] } | null
  resources?: Record<string, any> | null
  external_services: string[]
  host_permissions: HostPermissionReview[]
  diff?: { added: string[]; widened: string[]; removed: string[] } | null
}

export interface RolloutNode {
  node_id: string
  boot_id: string
  state: string
  error: string
}

export interface Rollout {
  id: number
  plugin_key: string
  action: string
  from_version: string
  target_version: string
  phase: string
  coordinator: string
  error: string
  nodes: RolloutNode[]
}

export interface UIPluginPage {
  type: 'table' | 'form' | 'iframe' | 'native'
  title?: LText
  source?: string
  columns?: Array<{ key: string; label: LText; format?: string }>
  schema?: string
  submit?: string
  src?: string
  component?: string
}

export interface UIPlugin {
  key: string
  version: string
  name?: LText
  asset_base: string
  menus: Array<{ id: string; section: string; label: LText; icon?: string; page: string; permission?: string; order?: number }>
  pages: Record<string, UIPluginPage>
  slots: Array<{ slot: string; component: string; permission?: string }>
  native_entry: string
  trust: Trust
  host_ui_compat?: string
}

export interface NodeInfo {
  node_id: string
  boot_id: string
  addr: string
  host_version: string
  started_at: string
  last_heartbeat: string
  plugins: Record<string, string | Record<string, any>>
}

export interface Publisher {
  id: number
  name: string
  trust_level: string
  status: string
  created_at: string
  revoked_at?: string | null
  keys?: Array<{ key_id: string; public_key: string; status: string; not_before?: string | null; not_after?: string | null; created_at?: string }>
}

export interface MarketSource {
  id: number
  name: string
  url: string
  enabled: boolean
}

export interface MarketPlugin {
  key: string
  name: LText
  description?: LText
  publisher: string
  trust?: Trust
  versions: Array<{ version: string; url?: string; sha256?: string; size?: number; host_compat?: string }>
  installed_version?: string | null // assumed
  latest_version?: string // assumed
  categories?: string[] // assumed
}
