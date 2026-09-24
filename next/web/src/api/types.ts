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
  label?: string | Record<string, string>
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
  permission_keys?: string[]
  user_count?: number
  member_count?: number // deprecated alias
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
  /** Platforms reachable with this key (same as its group's). */
  platforms?: string[]
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
  api_key_count?: number // server spelling of key_count
  /**
   * Platforms served by the group: supported by the account types of its
   * accounts (sorted ids). API keys bound to the group can call their endpoints.
   */
  platforms?: string[]
  created_at?: string
}

// ------------------------------------------------------------------ platforms (CONTRACTS §13)

/** A gateway endpoint declared by a platform. */
export interface PlatformEndpoint {
  method: string
  /** Path pattern; segments may be ":param" or ":param:suffix". */
  path: string
  protocol: string
  /** usage: billed by usage; free: not billed (e.g. count_tokens). */
  billing: 'usage' | 'free' | string
}

/**
 * A platform: built into the core (anthropic, openai, gemini) or declared by
 * an enabled plugin. Endpoints belong to exactly one platform.
 */
export interface Platform {
  id: string
  label: LText
  builtin: boolean
  /** Declaring plugin (plugin platforms only). */
  plugin_key?: string | null
  plugin_name?: LText // assumed, not in the contract
  endpoints: PlatformEndpoint[]
  /** Registered account types that declare support for the platform. */
  account_types: Array<{ plugin_key: string; type: string; label: LText }>
}

/**
 * A platform as listed by GET /me/platforms (CONTRACTS §14.1): every platform
 * available now, without account types; any logged-in user may read it.
 */
export interface MyPlatform {
  id: string
  label: LText
  builtin: boolean
  endpoints: PlatformEndpoint[]
}

export interface Proxy {
  id: number
  name: string
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username: string
  /** The password is never returned (CONTRACTS §15.4); this tells whether one is stored. */
  has_password?: boolean
  status: string
  account_count?: number
  created_at?: string
  updated_at?: string
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

/** An endpoint an account type can serve (CONTRACTS §12, §13). */
export interface AccountTypeEndpoint {
  method: string
  path: string
  /** Protocol of the endpoint (client side). */
  protocol: string
  /** Platform that declares the endpoint. */
  platform: string
  /** true: the type supports the platform; false: served through a core protocol converter. */
  native: boolean
}

/** A platform an account type declares support for. */
export interface AccountTypePlatform {
  id: string
  label: LText
  builtin: boolean
  /** false: the platform does not exist now (its plugin is not enabled). */
  available: boolean
}

/**
 * An account type is identified by (plugin_key, type). Any plugin can declare
 * account types; each declares the platforms it supports (ARCHITECTURE §6.6).
 */
export interface AccountType {
  plugin_key: string
  plugin_name: LText
  plugin_version?: string
  asset_base?: string
  trust?: Trust
  type: string
  label: LText
  description?: LText
  form: AccountFormRef
  sensitive_fields: string[]
  /** Platforms the type supports (built-in or plugin platforms). */
  platforms: AccountTypePlatform[]
  /** Endpoints of available supported platforms (native) plus converted ones. */
  endpoints: AccountTypeEndpoint[]
}

export interface Account {
  id: number
  name: string
  /** Plugin that declares the account type. */
  plugin_key: string
  type: string
  type_label?: LText
  group_ids: number[]
  groups?: Array<{ id: number; name: string }>
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

/** Prices are global per model (no platform); the result is the base price. */
export interface Price {
  id: number
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
  /** Client's X-Request-Id (truncated to 128 characters), empty when absent (CONTRACTS §14.4). */
  client_request_id?: string | null
  user_id: number
  user_email?: string // assumed
  api_key_id: number
  group_id: number
  group_name?: string // assumed
  account_id: number | null
  account_name?: string // assumed
  /** Plugin that declares the account type. */
  plugin_key: string
  /** Account type id (within plugin_key). */
  account_type?: string
  /** Platform of the client endpoint. */
  platform: string
  /** Protocol of the client endpoint. */
  protocol: string
  /** Protocol sent upstream; differs from protocol when converted. */
  upstream_protocol?: string
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

/** GET/PUT /settings/gateway (CONTRACTS §8, §14.4). */
export interface GatewaySettings {
  /** Attempts per request incl. failover, 1–10 (default 3). */
  max_attempts: number
  /** Timeout of platform calls on the request hot path, 100–30000 ms (default 2000). */
  platform_call_timeout_ms: number
  /** Default hook timeout when the manifest sets none, 50–2000 ms (default 300). */
  default_hook_timeout_ms: number
}

/** Validation ranges of GatewaySettings, mirrored from the server. */
export const GATEWAY_SETTINGS_RANGES: Record<keyof GatewaySettings, [number, number]> = {
  max_attempts: [1, 10],
  platform_call_timeout_ms: [100, 30000],
  default_hook_timeout_ms: [50, 2000]
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
  /** Ships with the image: can be disabled, not uninstalled. */
  builtin?: boolean
  status_reason?: string
  active_version?: string | null
  desired_version?: string | null
  publisher?: string
  trust?: Trust
  /** Live nodes of the cluster; nodes that did not report the plugin count as `absent`. */
  node_summary?: { total: number; states: Record<string, number> }
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

export interface ReviewAccountType {
  id: string
  label: LText
  form_mode?: string
  /** Supported platforms (ids, or manifest objects {platform, ...}). */
  platforms: Array<string | { platform: string; [k: string]: unknown }>
}

/** A new platform declared by the plugin, with its endpoints. */
export interface ReviewPlatform {
  id: string
  label?: LText
  endpoints: PlatformEndpoint[]
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
  /** Derived from platforms[].endpoints. */
  gateway_endpoints: Array<Record<string, any>>
  /** New platforms declared by the plugin (CONTRACTS §13). */
  platforms?: ReviewPlatform[]
  /** Account types declared by the plugin (top level, any plugin). */
  account_types?: ReviewAccountType[]
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
  versions: MarketVersion[]
  installed_version?: string | null // assumed
  latest_version?: string // assumed
  categories?: string[] // assumed
}

/** A version of a market plugin (CONTRACTS §11.1, §14.3). */
export interface MarketVersion {
  version: string
  url?: string
  sha256?: string
  size?: number
  host_compat?: string
  /** host_compat satisfied by the running core version; absent on old servers. */
  compatible?: boolean
}

// ------------------------------------------------------------------ plugin egress (CONTRACTS §14.2)

/** Egress logs aggregated per destination (GET /plugins/:key/egress `summary`). */
export interface EgressSummaryRow {
  host: string
  port?: number | null
  count: number
  ok?: number
  denied?: number
  errors?: number
  bytes_in: number
  bytes_out: number
  last_at?: string | null
}

/** A host the plugin ever connected to (`domains`). */
export interface EgressDomain {
  host: string
  first_seen_at: string
  last_seen_at: string
  connections: number
  /** First seen within the last 24 hours. */
  new: boolean
}

/** One egress connection; result is "open" while the connection is alive. */
export interface EgressLogRow {
  id?: number
  node_id?: string
  network?: string
  host: string
  port?: number
  started_at?: string
  duration_ms?: number | null
  bytes_in?: number | null
  bytes_out?: number | null
  result?: 'open' | 'ok' | 'denied' | 'error' | string
  error?: string
  closed_at?: string | null
}

export interface EgressReport {
  from?: string
  to?: string
  summary?: EgressSummaryRow[]
  domains?: EgressDomain[]
  items?: EgressLogRow[]
}

/** Response of DELETE /plugins/:key (CONTRACTS §14.3); 204 on older servers. */
export interface UninstallResult {
  /** Accounts soft-deleted with purge_accounts=true. */
  accounts_deleted?: number
}
