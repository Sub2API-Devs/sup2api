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
// The cc_entrypoint values build may write into a billing header it adds.
export const billingEntrypoints = ['cli', 'sdk-cli', 'sdk-ts', 'sdk-py', 'claude-desktop', 'claude-vscode'] as const
export type BillingEntrypoint = (typeof billingEntrypoints)[number]
export const defaultBillingEntrypoint: BillingEntrypoint = 'sdk-cli'
// The identity line is no longer configured (2026-10-23): a request without
// one gets the line its billing header's entrypoint calls for. A
// build_identity_lines saved before is ignored by the core and dropped from
// every save (savedOverrides, normalizeRequestPolicy).
const retiredOverrideKeys = ['build_identity_lines'] as const
// Request levels (contracts features/levels.go, 2026-10-23), from the least
// to the most of Claude Code a request is given; each includes the ones
// before it: none is the billing header alone (direct); micro adds the
// identity line (build); low the environment; high CC's system prompt and
// tools. The level decides which layers apply; each layer's choices are kept
// when the level is lower and apply again when it is raised.
export const requestLevels = ['none', 'micro', 'low', 'high'] as const
export type RequestLevel = (typeof requestLevels)[number]
export const defaultRequestLevel: RequestLevel = 'low'
const isLevel = (value: unknown): value is RequestLevel => (requestLevels as readonly unknown[]).includes(value)
const levelRank = (level?: RequestLevel | '') => requestLevels.indexOf(level || defaultRequestLevel)
export const relayModeForLevel = (level?: RequestLevel | ''): 'direct' | 'build' => levelRank(level) === 0 ? 'direct' : 'build'
export const levelHasIdentity = (level?: RequestLevel | '') => levelRank(level) >= 1
export const levelHasEnvironment = (level?: RequestLevel | '') => levelRank(level) >= 2
export const levelHasPromptAndTools = (level?: RequestLevel | '') => levelRank(level) >= 3
// What a level adds to a request without a billing header (one that is not
// Claude Code's), each choice optional and inherited on its own (contracts
// features/injection.go): CC's first-turn attachments in CC's order (from
// low), its system prompt and its own tools (high). The CLI renders all of it.
export const injectionAttachments = ['environment', 'model', 'total_tokens', 'date'] as const
export type InjectionAttachment = (typeof injectionAttachments)[number]
// The tools CC's system prompt names, added at high without a choice, then
// the optional ones (contracts InjectionTools, console order).
export const defaultInjectionTools = ['Bash', 'Read', 'Edit', 'Write'] as const
export const injectionTools = [...defaultInjectionTools, 'Agent', 'WebSearch', 'NotebookEdit'] as const
export type InjectionTool = (typeof injectionTools)[number]
export interface BuildInjection {
  system_prompt?: boolean
  attachments?: Partial<Record<InjectionAttachment, boolean>>
  tools?: Partial<Record<InjectionTool, boolean>>
}
// A choice's value when no layer makes it (LevelInjection): every attachment,
// the system prompt and the default tools are added within their level.
export function injectionDefault(part: 'system_prompt' | 'attachments' | 'tools', name?: string): boolean {
  return part !== 'tools' || (defaultInjectionTools as readonly string[]).includes(name ?? '')
}
// Only what is added; undefined when nothing is (BuildInjection.Effective).
function effectiveInjection(p?: BuildInjection): BuildInjection | undefined {
  if (!p) return undefined
  const out: BuildInjection = {}
  if (p.system_prompt) out.system_prompt = true
  for (const part of ['attachments', 'tools'] as const) {
    const on = Object.entries(p[part] ?? {}).filter(([, value]) => value)
    if (on.length) (out as Record<string, unknown>)[part] = Object.fromEntries(on.map(([name]) => [name, true]))
  }
  return Object.keys(out).length ? out : undefined
}
// LevelInjection: the configured choices within the level, each omitted one at
// its default; nothing outside the level; undefined when nothing is added.
export function levelInjection(level: RequestLevel | '' | undefined, configured?: BuildInjection): BuildInjection | undefined {
  if (!levelHasEnvironment(level)) return undefined
  const out: BuildInjection = { attachments: Object.fromEntries(injectionAttachments.map(name => [name, true])) }
  if (levelHasPromptAndTools(level)) {
    out.system_prompt = configured?.system_prompt ?? true
    out.tools = { ...Object.fromEntries(defaultInjectionTools.map(name => [name, true])), ...configured?.tools }
  }
  out.attachments = { ...out.attachments, ...configured?.attachments }
  return effectiveInjection(out)
}
// LegacyLevel: the level of a policy saved before levels. Direct is none;
// build adding the prompt or a tool is high, converting or adding the
// environment low, otherwise micro; an unknown mode has none ('').
export function legacyLevel(relayMode: unknown, attachments?: Partial<Record<string, string>>, injection?: BuildInjection): RequestLevel | '' {
  if (relayMode === 'direct') return 'none'
  if (relayMode !== 'build' && relayMode !== '' && relayMode !== undefined && relayMode !== null) return ''
  const added = effectiveInjection(injection)
  if (added && (added.system_prompt !== undefined || Object.keys(added.tools ?? {}).length)) return 'high'
  if (Object.values(attachments ?? {}).some(source => source !== 'client')) return 'low'
  if (Object.keys(added?.attachments ?? {}).length) return 'low'
  return 'micro'
}
// A legacy policy added nothing it did not choose, while a level adds its
// omitted choices: the migration writes the level's unchosen ones as off, so
// the level adds exactly what the policy did (the core does the same).
function legacyInjection(level: RequestLevel, injection?: BuildInjection): BuildInjection | undefined {
  if (!levelHasEnvironment(level)) return injection
  const out = mergeInjection(injection) ?? {}
  out.attachments = { ...Object.fromEntries(injectionAttachments.map(name => [name, false])), ...out.attachments }
  if (levelHasPromptAndTools(level)) {
    out.system_prompt ??= false
    out.tools = { ...Object.fromEntries(defaultInjectionTools.map(name => [name, false])), ...out.tools }
  }
  return out
}
function validInjection(value: BuildInjection | undefined): boolean {
  if (value === undefined) return true
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['system_prompt', 'attachments', 'tools'].includes(key))) return false
  if (value.system_prompt !== undefined && typeof value.system_prompt !== 'boolean') return false
  return Object.entries(value.attachments ?? {}).every(([k, v]) => (injectionAttachments as readonly string[]).includes(k) && typeof v === 'boolean') &&
    Object.entries(value.tools ?? {}).every(([k, v]) => (injectionTools as readonly string[]).includes(k) && typeof v === 'boolean')
}
export function mergeInjection(parent?: BuildInjection, child?: BuildInjection): BuildInjection | undefined {
  if (!parent && !child) return undefined
  const out: BuildInjection = { ...parent, ...child?.system_prompt !== undefined && { system_prompt: child.system_prompt } }
  if (parent?.attachments || child?.attachments) out.attachments = { ...parent?.attachments, ...child?.attachments }
  if (parent?.tools || child?.tools) out.tools = { ...parent?.tools, ...child?.tools }
  return out
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
  // Absent choices take their level's default (injectionDefault).
  build_injection?: BuildInjection
  // Which layers apply; relay_mode follows from it (none is direct).
  level: RequestLevel
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
  // Derived from the level and only read: a policy saved before levels has it
  // instead of a level; the editor no longer writes it.
  relay_mode?: 'direct' | 'build'
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
    request_identity_sources: {},
    level: defaultRequestLevel,
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
type SavedRequestPolicy = Partial<Omit<RequestPolicy, 'relay_mode' | 'level' | 'erase_client_attachments' | 'replace_client_attachments'>> & {
  relay_mode?: unknown
  level?: unknown
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
  // A policy saved before levels gets the level LegacyLevel gives it, a
  // retired mode (native, legacy, passthrough) read as build as the core does,
  // with the level's choices it did not make written as off; no saved policy
  // is the default level.
  const legacy = !!policy && !isLevel(policy.level)
  const level = !policy ? defaults.level : isLevel(policy.level) ? policy.level
    : legacyLevel(savedRelayMode(policy.relay_mode), policy.build_attachment_sources, policy.build_injection) || defaults.level
  const injection = knownInjection(legacy ? legacyInjection(level, policy?.build_injection) : policy?.build_injection)
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
    ...(injection === undefined ? {} : { build_injection: injection }),
    request_identity_sources: { ...policy?.request_identity_sources },
    level,
    cli_version: defaults.cli_version,
    betas: policy?.betas ?? defaults.betas
  }
}
// Tools outside the narrowed candidates (2026-10-23: InjectionTools is seven)
// cannot be given any more: a choice saved for one is dropped on reading.
function knownInjection(injection?: BuildInjection): BuildInjection | undefined {
  const out = mergeInjection(injection)
  if (!out?.tools) return out
  const tools = Object.fromEntries(Object.entries(out.tools).filter(([name]) => (injectionTools as readonly string[]).includes(name)))
  if (Object.keys(tools).length) out.tools = tools
  else delete out.tools
  return out
}
// The core reads every saved mode but direct as build before LegacyLevel.
const savedRelayMode = (mode: unknown) => mode === 'direct' ? 'direct' : 'build'
// The level a policy applies; a policy without one (an older core's preview)
// is read the way the core migrates it.
export function levelOf(policy?: Partial<RequestPolicy> & { relay_mode?: unknown }): RequestLevel {
  if (isLevel(policy?.level)) return policy.level
  return (policy && legacyLevel(savedRelayMode(policy.relay_mode), policy.build_attachment_sources, policy.build_injection)) || defaultRequestLevel
}
export function validRequestPolicy(p: RequestPolicy): boolean {
  return (
    (p.schema_version === undefined || p.schema_version === 1) &&
    Object.entries(p.build_attachment_sources ?? {}).every(([field, source]) =>
      (buildAttachmentFields as readonly string[]).includes(field) && (source === 'client' || source === 'worker' || source === 'erase')) &&
    Object.entries(p.build_billing_sources ?? {}).every(([field, source]) =>
      (billingFields as readonly string[]).includes(field) && (source === 'client' || source === 'worker')) &&
    (p.build_billing_entrypoint === undefined || (billingEntrypoints as readonly string[]).includes(p.build_billing_entrypoint)) &&
    validInjection(p.build_injection) &&
    (!p.custom_tool_prefix || (/^[A-Za-z0-9_-]{1,32}$/.test(p.custom_tool_prefix) && !p.custom_tool_prefix.includes('__'))) &&
    (!p.tool_search || ['request', 'false', 'true', 'auto'].includes(p.tool_search) || /^auto:(0|[1-9][0-9]?|100)$/.test(p.tool_search)) &&
    ['reject', 'ignore'].includes(p.unknown_field) &&
    (!p.thinking_disabled_compat || ['pass', 'omit'].includes(p.thinking_disabled_compat)) &&
    (p.erase_client_attachments ?? []).every((type, i, all) => erasableAttachments.includes(type) && all.indexOf(type) === i) &&
    (p.replace_client_attachments ?? []).every((type, i, all) => replaceableAttachments.includes(type) && all.indexOf(type) === i && !p.erase_client_attachments?.some(erased => containsAttachment(erased, type) || containsAttachment(type, erased))) &&
    isLevel(p.level) &&
    (p.relay_mode === undefined || ['direct', 'build'].includes(p.relay_mode)) &&
    (!p.cli_version || /^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$/.test(p.cli_version))
  )
}

// An absent key follows its parent; this also applies independently to nested
// fields. relay_mode is only read: an override saved before levels.
export type FeatureOverrides = Partial<Pick<RequestPolicy, 'level' | 'relay_mode' | 'unknown_field' | 'tool_search' | 'thinking_disabled_compat' | 'custom_tool_prefix' | 'build_attachment_sources' | 'build_billing_sources' | 'build_billing_entrypoint' | 'build_injection' | 'request_identity_sources'>>
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
  const own: FeatureOverrides = savedOverrides(overrides)
  delete own.relay_mode
  const out: RequestPolicy = { ...parent, ...own, build_attachment_sources: { ...parent.build_attachment_sources, ...overrides.build_attachment_sources }, build_billing_sources: { ...parent.build_billing_sources, ...overrides.build_billing_sources }, build_injection: mergeInjection(parent.build_injection, overrides.build_injection), request_identity_sources: { ...parent.request_identity_sources, ...overrides.request_identity_sources } }
  delete out.relay_mode
  // A resolved parent from the core may still carry the retired identity lines.
  for (const key of retiredOverrideKeys) delete (out as unknown as Record<string, unknown>)[key]
  out.level = levelOf(parent)
  // An override saved before levels, as the core migrates it: its level wins;
  // direct is none; build only lifts an inherited none, to the level LegacyLevel
  // gives the merged policy, with that level's unchosen items off.
  if (isLevel(overrides.level)) out.level = overrides.level
  else if (overrides.relay_mode === 'direct') out.level = 'none'
  else if (overrides.relay_mode === 'build' && out.level === 'none') {
    out.level = legacyLevel('build', out.build_attachment_sources, out.build_injection) || defaultRequestLevel
    out.build_injection = legacyInjection(out.level, out.build_injection)
  }
  return out
}
export function featureDifferenceCount(parent: RequestPolicy, overrides: FeatureOverrides): number {
  let count = 0
  for (const [key, value] of Object.entries(savedOverrides(overrides))) {
    // The identity is not configurable (2026-10-21): a value stored before is
    // neither shown nor applied, so it is not a difference either.
    if (key === 'request_identity_sources') continue
    if (key === 'level' || key === 'relay_mode') {
      // A legacy mode counts once, and only without a level beside it.
      if ((key === 'level' || overrides.level === undefined) && mergeFeaturePolicy(parent, overrides).level !== levelOf(parent)) count++
    } else if (key === 'build_attachment_sources' || key === 'build_billing_sources') {
      for (const [field, source] of Object.entries(value as Record<string, string>)) {
        if (((parent[key] as Record<string, string> | undefined)?.[field] ?? 'client') !== source) count++
      }
    } else if (key === 'build_injection') {
      const own = value as BuildInjection
      if (own.system_prompt !== undefined && (parent.build_injection?.system_prompt ?? injectionDefault('system_prompt')) !== own.system_prompt) count++
      for (const field of ['attachments', 'tools'] as const) {
        for (const [name, on] of Object.entries(own[field] ?? {})) {
          if (((parent.build_injection?.[field] as Record<string, boolean> | undefined)?.[name] ?? injectionDefault(field, name)) !== on) count++
        }
      }
    } else if (key === 'build_billing_entrypoint') {
      if ((parent.build_billing_entrypoint ?? defaultBillingEntrypoint) !== value) count++
    } else if (parent[key as keyof RequestPolicy] !== value) count++
  }
  return count
}
// What a save sends: the overrides without the retired keys (the core ignores
// them). An override read from an older save may still hold them.
export function savedOverrides(overrides: FeatureOverrides): FeatureOverrides {
  const out = { ...overrides } as Record<string, unknown>
  for (const key of retiredOverrideKeys) delete out[key]
  return out as FeatureOverrides
}
// A retired key is not validated: savedOverrides drops it from every save.
export function validFeatureOverrides(input: FeatureOverrides): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const value = savedOverrides(input)
  const allowed = ['level', 'relay_mode', 'unknown_field', 'tool_search', 'thinking_disabled_compat', 'custom_tool_prefix', 'build_attachment_sources', 'build_billing_sources', 'build_billing_entrypoint', 'build_injection', 'request_identity_sources']
  if (Object.entries(value).some(([key, v]) => !allowed.includes(key) || v == null || v === '')) return false
  if (value.level !== undefined && !isLevel(value.level)) return false
  if (value.relay_mode !== undefined && !['direct', 'build'].includes(value.relay_mode)) return false
  for (const key of ['build_attachment_sources', 'build_billing_sources', 'build_injection', 'request_identity_sources'] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'object' || Array.isArray(value[key]))) return false
  }
  return validRequestPolicy(mergeFeaturePolicy(defaultRequestPolicy(), value))
}

// ---------------------------------------------------------------- layers at the group and account level
// A group or an account follows or customizes each configurable layer as a
// whole (2026-10-23 user): a layer follows while its overrides hold none of
// its keys; customizing writes every field of the layer, so it overrides the
// parent entirely. An override saved before that holds only some keys counts
// as customized (its unset fields still inherit). The identity line has no
// settings, so it is not a layer here.
export const featureLayers = ['level', 'billing', 'environment', 'prompt'] as const
export type FeatureLayer = (typeof featureLayers)[number]
const present = (value: unknown) => value !== undefined && value !== null &&
  !(typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length)
export function layerCustomized(overrides: FeatureOverrides, layer: FeatureLayer): boolean {
  const injection = overrides.build_injection
  switch (layer) {
    case 'level': return present(overrides.level) || present(overrides.relay_mode)
    case 'billing': return present(overrides.build_billing_entrypoint) || present(overrides.build_billing_sources)
    case 'environment': return present(overrides.build_attachment_sources) || present(injection?.attachments)
    case 'prompt': return injection?.system_prompt !== undefined || present(injection?.tools)
  }
}
// Follow: the layer's keys removed (a legacy relay_mode with the level).
export function followLayer(overrides: FeatureOverrides, layer: FeatureLayer): FeatureOverrides {
  const next: FeatureOverrides = JSON.parse(JSON.stringify(overrides))
  const injection = next.build_injection
  if (layer === 'level') { delete next.level; delete next.relay_mode }
  if (layer === 'billing') { delete next.build_billing_entrypoint; delete next.build_billing_sources }
  if (layer === 'environment') { delete next.build_attachment_sources; delete injection?.attachments }
  if (layer === 'prompt') { delete injection?.system_prompt; delete injection?.tools }
  if (injection && !Object.keys(injection).length) delete next.build_injection
  return next
}
// Customize: every field of the layer written with the value it inherits,
// the level's defaults made explicit.
export function customizeLayer(overrides: FeatureOverrides, inherited: RequestPolicy, layer: FeatureLayer): FeatureOverrides {
  const next = followLayer(overrides, layer)
  const from = inherited.build_injection
  const choices = <T extends string>(part: 'attachments' | 'tools', names: readonly T[]) =>
    Object.fromEntries(names.map(name => [name, (from?.[part] as Record<string, boolean> | undefined)?.[name] ?? injectionDefault(part, name)])) as Record<T, boolean>
  if (layer === 'level') next.level = levelOf(inherited)
  if (layer === 'billing') {
    next.build_billing_entrypoint = inherited.build_billing_entrypoint ?? defaultBillingEntrypoint
    next.build_billing_sources = Object.fromEntries(billingFields.map(field => [field, inherited.build_billing_sources?.[field] ?? 'client']))
  }
  if (layer === 'environment') {
    next.build_attachment_sources = Object.fromEntries(buildAttachmentFields.map(field => [field, inherited.build_attachment_sources?.[field] ?? 'client']))
    next.build_injection = { ...next.build_injection, attachments: choices('attachments', injectionAttachments) }
  }
  if (layer === 'prompt') {
    next.build_injection = { ...next.build_injection, system_prompt: from?.system_prompt ?? injectionDefault('system_prompt'), tools: choices('tools', injectionTools) }
  }
  return next
}
