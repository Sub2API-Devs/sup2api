export type BetaMapping = 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
export const buildAttachmentFields = ['platform_name', 'os_version', 'shell', 'primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'] as const
export type BuildAttachmentField = (typeof buildAttachmentFields)[number]
export type BuildAttachmentSource = 'client' | 'worker' | 'erase'
export const identityFields = ['user_id'] as const
export type IdentityField = (typeof identityFields)[number]
export type IdentitySource = 'client' | 'worker' | 'replace'
export const billingFields = ['cc_version', 'cc_entrypoint'] as const
export type BillingField = (typeof billingFields)[number]
export type BillingSource = 'client' | 'worker'
// The cc_entrypoint values build may write, and per entrypoint the identity
// lines real clients send with it, the default first (contracts
// features/identity_line.go). Lines are names; Claude Code renders the text.
export const billingEntrypoints = ['cli', 'sdk-cli', 'sdk-ts', 'sdk-py', 'claude-desktop', 'claude-vscode'] as const
export type BillingEntrypoint = (typeof billingEntrypoints)[number]
export const defaultBillingEntrypoint: BillingEntrypoint = 'sdk-cli'
export type IdentityLine = 'official_cli' | 'official_cli_sdk' | 'agent_sdk'
export type IdentityLineChoice = IdentityLine | 'none'
export const identityLineChoices: Record<BillingEntrypoint, readonly IdentityLine[]> = {
  cli: ['official_cli'],
  'sdk-cli': ['agent_sdk', 'official_cli_sdk'],
  'sdk-ts': ['agent_sdk', 'official_cli_sdk'],
  'sdk-py': ['agent_sdk', 'official_cli_sdk'],
  'claude-desktop': ['official_cli_sdk', 'agent_sdk'],
  'claude-vscode': ['official_cli_sdk', 'agent_sdk']
}
export const defaultIdentityLine = (entrypoint: BillingEntrypoint): IdentityLine => identityLineChoices[entrypoint][0]!
function validIdentityLines(lines: Record<string, string> | undefined): boolean {
  return Object.entries(lines ?? {}).every(([entrypoint, line]) =>
    entrypoint in identityLineChoices && (line === 'none' || (identityLineChoices[entrypoint as BillingEntrypoint] as readonly string[]).includes(line)))
}
// Independently editable types; the core also accepts the former whole environment type.
export const attachmentGroups = {
  working_directory: ['primary_directory', 'additional_directories', 'git_repository'],
  platform: ['platform_name', 'shell', 'os_version'],
  model: ['model_name', 'model_id', 'knowledge_cutoff', 'model_other'],
  date: ['current_date', 'date_change'],
  session_context: ['claude_md', 'git_status', 'user_email', 'session_other']
} as const
export const attachmentRows = ['working_directory', 'platform', 'environment_update', 'model', 'date', 'total_tokens_reminder', 'session_context'] as const
export const erasableAttachments = [...attachmentRows, ...Object.values(attachmentGroups).flat()] as const
export type ErasableAttachment = (typeof erasableAttachments)[number]
// Every independently erasable type also supports server rendering.
export const replaceableAttachments = erasableAttachments
export type ReplaceableAttachment = (typeof replaceableAttachments)[number]
export type AttachmentAction = 'keep' | 'gateway' | 'erase'
export function attachmentChildren(type: ErasableAttachment): readonly ErasableAttachment[] {
  return type in attachmentGroups ? attachmentGroups[type as keyof typeof attachmentGroups] : []
}
function containsAttachment(parent: ErasableAttachment, type: ErasableAttachment): boolean {
  return parent === type || attachmentChildren(parent).includes(type)
}
function savedAttachmentAction(policy: RequestPolicy, type: ErasableAttachment): AttachmentAction {
  if (policy.erase_client_attachments?.some(parent => containsAttachment(parent, type))) return 'erase'
  if (policy.replace_client_attachments?.some(parent => containsAttachment(parent, type))) return 'gateway'
  return 'keep'
}
export function attachmentAction(policy: RequestPolicy, type: ErasableAttachment): AttachmentAction | '' {
  const children = attachmentChildren(type)
  if (!children.length) return savedAttachmentAction(policy, type)
  const actions = children.map(child => savedAttachmentAction(policy, child))
  return actions.every(action => action === actions[0]) ? actions[0]! : ''
}
export function setAttachmentAction(policy: RequestPolicy, type: ErasableAttachment, action: AttachmentAction) {
  const erased = new Set(policy.erase_client_attachments ?? [])
  const replaced = new Set(policy.replace_client_attachments ?? [])
  // Editing one child materializes its siblings' inherited choices first.
  for (const parent of attachmentRows) {
    if (parent === type || !containsAttachment(parent, type)) continue
    const inherited = savedAttachmentAction(policy, parent)
    erased.delete(parent)
    replaced.delete(parent)
    for (const child of attachmentChildren(parent)) {
      if (inherited === 'erase') erased.add(child)
      if (inherited === 'gateway') replaced.add(child)
    }
  }
  for (const name of [type, ...attachmentChildren(type)]) {
    erased.delete(name)
    replaced.delete(name)
  }
  if (action === 'erase') erased.add(type)
  if (action === 'gateway') replaced.add(type)
  policy.erase_client_attachments = erasableAttachments.filter(name => erased.has(name))
  policy.replace_client_attachments = replaceableAttachments.filter(name => replaced.has(name))
}
// Native editor state. Legacy attachment and unknown-beta choices are not settings.
export interface RequestPolicy {
  build_attachment_sources?: Partial<Record<BuildAttachmentField, BuildAttachmentSource>>
  build_billing_sources?: Partial<Record<BillingField, BillingSource>>
  // Absent is the default, sdk-cli.
  build_billing_entrypoint?: BillingEntrypoint
  // Absent entrypoints use their default line.
  build_identity_lines?: Partial<Record<BillingEntrypoint, IdentityLineChoice>>
  request_identity_sources?: Partial<Record<IdentityField, IdentitySource>>
  schema_version?: number
  unknown_field: 'reject' | 'ignore'
  allow_fast: boolean
  tool_search?: string
  allow_effort: boolean
  custom_tool_prefix: string
  // 'pass' (default): thinking.type "disabled" goes upstream as sent; 'omit': dropped for models that reject it.
  thinking_disabled_compat?: 'pass' | 'omit'
  // Client attachment types the Worker erases before admission; empty keeps every attachment as sent.
  erase_client_attachments?: ErasableAttachment[]
  // Client attachment types replaced in place with the Worker's Claude Code rendering; never an erased type.
  replace_client_attachments?: ReplaceableAttachment[]
  relay_mode: 'direct' | 'build'
  cli_version?: string
  betas: Array<{ name: string; mapping: BetaMapping }>
}
export function defaultRequestPolicy(): RequestPolicy {
  return {
    unknown_field: 'reject',
    // Supported by the official API, so always on (no longer settings; the core ignores false).
    allow_fast: true,
    allow_effort: true,
    custom_tool_prefix: 'ccgateway',
    tool_search: 'request',
    thinking_disabled_compat: 'pass',
    erase_client_attachments: [],
    replace_client_attachments: [],
    build_attachment_sources: {},
    build_billing_sources: {},
    build_identity_lines: {},
    request_identity_sources: {},
    relay_mode: 'build',
    cli_version: '2.1.304',
    betas: [
      { name: 'interleaved-thinking-2025-05-14', mapping: 'forward' },
      { name: 'fine-grained-tool-streaming-2025-05-14', mapping: 'fine_grained_tools' },
      { name: 'context-1m-2025-08-07', mapping: 'forward' },
      { name: 'fast-mode-2026-02-01', mapping: 'fast' },
      { name: 'advanced-tool-use-2025-11-20', mapping: 'tool_search' },
      { name: 'dev-full-thinking-2025-05-14', mapping: 'forward' },
      { name: 'model-context-window-exceeded-2025-08-26', mapping: 'forward' }
    ]
  }
}
type SavedRequestPolicy = Partial<Omit<RequestPolicy, 'relay_mode' | 'erase_client_attachments' | 'replace_client_attachments'>> & {
  relay_mode?: unknown
  erase_client_attachments?: Array<ErasableAttachment | 'environment'>
  replace_client_attachments?: Array<ReplaceableAttachment | 'environment'>
}
function expandEnvironment(types: Array<ErasableAttachment | 'environment'> = []): ErasableAttachment[] {
  return [...new Set(types.flatMap(type => type === 'environment'
    ? ['working_directory', 'platform', 'environment_update'] as const
    : [type]))]
}
export function normalizeRequestPolicy(policy?: SavedRequestPolicy): RequestPolicy {
  const defaults = defaultRequestPolicy()
  // Pick the editor's fields rather than spreading historical or server-defaulted policy data.
  return {
    ...(policy?.schema_version === undefined ? {} : { schema_version: policy.schema_version }),
    unknown_field: policy?.unknown_field ?? defaults.unknown_field,
    allow_fast: policy?.allow_fast ?? defaults.allow_fast,
    allow_effort: policy?.allow_effort ?? defaults.allow_effort,
    custom_tool_prefix: policy?.custom_tool_prefix ?? defaults.custom_tool_prefix,
    tool_search: policy?.tool_search ?? defaults.tool_search,
    thinking_disabled_compat: policy?.thinking_disabled_compat ?? defaults.thinking_disabled_compat,
    erase_client_attachments: expandEnvironment(policy?.erase_client_attachments),
    replace_client_attachments: expandEnvironment(policy?.replace_client_attachments),
    build_attachment_sources: { ...policy?.build_attachment_sources },
    build_billing_sources: { ...policy?.build_billing_sources },
    ...(policy?.build_billing_entrypoint === undefined ? {} : { build_billing_entrypoint: policy.build_billing_entrypoint }),
    build_identity_lines: { ...policy?.build_identity_lines },
    request_identity_sources: { ...policy?.request_identity_sources },
    relay_mode: policy?.relay_mode === 'build' || policy?.relay_mode === 'direct' ? policy.relay_mode : 'build',
    cli_version: defaults.cli_version,
    betas: policy?.betas ?? defaults.betas
  }
}
export function validRequestPolicy(p: RequestPolicy): boolean {
  return (
    (p.schema_version === undefined || p.schema_version === 1) &&
    Object.entries(p.build_attachment_sources ?? {}).every(([field, source]) =>
      (buildAttachmentFields as readonly string[]).includes(field) && (source === 'client' || source === 'worker' || source === 'erase')) &&
    Object.entries(p.build_billing_sources ?? {}).every(([field, source]) =>
      (billingFields as readonly string[]).includes(field) && (source === 'client' || source === 'worker')) &&
    (p.build_billing_entrypoint === undefined || (billingEntrypoints as readonly string[]).includes(p.build_billing_entrypoint)) &&
    validIdentityLines(p.build_identity_lines) &&
    (!p.custom_tool_prefix || (/^[A-Za-z0-9_-]{1,32}$/.test(p.custom_tool_prefix) && !p.custom_tool_prefix.includes('__'))) &&
    (!p.tool_search || ['request', 'false', 'true', 'auto'].includes(p.tool_search) || /^auto:(0|[1-9][0-9]?|100)$/.test(p.tool_search)) &&
    ['reject', 'ignore'].includes(p.unknown_field) &&
    (!p.thinking_disabled_compat || ['pass', 'omit'].includes(p.thinking_disabled_compat)) &&
    (p.erase_client_attachments ?? []).every((type, i, all) => erasableAttachments.includes(type) && all.indexOf(type) === i) &&
    (p.replace_client_attachments ?? []).every((type, i, all) => replaceableAttachments.includes(type) && all.indexOf(type) === i && !p.erase_client_attachments?.some(erased => containsAttachment(erased, type) || containsAttachment(type, erased))) &&
    ['direct', 'build'].includes(p.relay_mode) &&
    (!p.cli_version || /^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$/.test(p.cli_version))
  )
}

// An absent key follows its parent; this also applies independently to nested fields.
export type FeatureOverrides = Partial<Pick<RequestPolicy, 'relay_mode' | 'unknown_field' | 'tool_search' | 'thinking_disabled_compat' | 'custom_tool_prefix' | 'build_attachment_sources' | 'build_billing_sources' | 'build_billing_entrypoint' | 'build_identity_lines' | 'request_identity_sources'>>
export interface FeatureGroup { enabled: boolean; allow_account_override: boolean; overrides: FeatureOverrides }
export interface AccountFeaturePolicy { mode: 'follow' | 'custom'; overrides: FeatureOverrides; revision: number }
export interface FeaturePreview {
  cc_feature_policy: AccountFeaturePolicy
  groups: Array<{ id: number; name: string }>
  effective: RequestPolicy
  inherited: RequestPolicy
  sources: Record<string, 'global' | 'group' | 'account'>
  editable: boolean
  disabled_reason: string
  policy_revision: string
}
export function newRequestPolicy(): RequestPolicy {
  return { ...defaultRequestPolicy(), build_attachment_sources: { platform_name: 'worker', os_version: 'worker' } }
}
export function mergeFeaturePolicy(parent: RequestPolicy, overrides: FeatureOverrides): RequestPolicy {
  return { ...parent, ...overrides, build_attachment_sources: { ...parent.build_attachment_sources, ...overrides.build_attachment_sources }, build_billing_sources: { ...parent.build_billing_sources, ...overrides.build_billing_sources }, build_identity_lines: { ...parent.build_identity_lines, ...overrides.build_identity_lines }, request_identity_sources: { ...parent.request_identity_sources, ...overrides.request_identity_sources } }
}
export function featureDifferenceCount(parent: RequestPolicy, overrides: FeatureOverrides): number {
  let count = 0
  for (const [key, value] of Object.entries(overrides)) {
    // The identity is not configurable (2026-10-21): a value stored before is
    // neither shown nor applied, so it is not a difference either.
    if (key === 'request_identity_sources') continue
    if (key === 'build_attachment_sources' || key === 'build_billing_sources') {
      for (const [field, source] of Object.entries(value as Record<string, string>)) {
        if (((parent[key] as Record<string, string> | undefined)?.[field] ?? 'client') !== source) count++
      }
    } else if (key === 'build_identity_lines') {
      for (const [entrypoint, line] of Object.entries(value as Record<string, string>)) {
        if ((parent.build_identity_lines?.[entrypoint as BillingEntrypoint] ?? defaultIdentityLine(entrypoint as BillingEntrypoint)) !== line) count++
      }
    } else if (key === 'build_billing_entrypoint') {
      if ((parent.build_billing_entrypoint ?? defaultBillingEntrypoint) !== value) count++
    } else if (parent[key as keyof RequestPolicy] !== value) count++
  }
  return count
}
export function validFeatureOverrides(value: FeatureOverrides): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowed = ['relay_mode', 'unknown_field', 'tool_search', 'thinking_disabled_compat', 'custom_tool_prefix', 'build_attachment_sources', 'build_billing_sources', 'build_billing_entrypoint', 'build_identity_lines', 'request_identity_sources']
  if (Object.entries(value).some(([key, v]) => !allowed.includes(key) || v == null || v === '')) return false
  for (const key of ['build_attachment_sources', 'build_billing_sources', 'build_identity_lines', 'request_identity_sources'] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'object' || Array.isArray(value[key]))) return false
  }
  return validRequestPolicy(mergeFeaturePolicy(defaultRequestPolicy(), value))
}
