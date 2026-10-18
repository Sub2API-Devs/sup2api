export type BetaMapping = 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
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
    relay_mode: 'build',
    cli_version: '2.1.302',
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
    relay_mode: policy?.relay_mode === 'build' || policy?.relay_mode === 'direct' ? policy.relay_mode : 'build',
    cli_version: policy?.cli_version ?? defaults.cli_version,
    betas: policy?.betas ?? defaults.betas
  }
}
export function validRequestPolicy(p: RequestPolicy): boolean {
  return (
    (p.schema_version === undefined || p.schema_version === 1) &&
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
