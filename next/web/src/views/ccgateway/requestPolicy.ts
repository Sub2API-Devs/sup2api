export const attachmentTypes = ['environment', 'model', 'total_tokens_reminder', 'session_context', 'date'] as const
export type AttachmentType = typeof attachmentTypes[number]
export type AttachmentSource = 'client' | 'gateway' | 'both'
export type BetaMapping = 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
export interface RequestPolicy {
  unknown_beta: 'reject' | 'ignore'
  unknown_field: 'reject' | 'ignore'
  allow_fast: boolean
  tool_search?: string
  allow_effort: boolean
  pass_upstream_errors: boolean
  attachment_source: 'client' | 'gateway' | 'both'
  environment_fields: Partial<Record<'workingDirectory' | 'platform', 'client' | 'gateway'>>
  attachment_sources: Partial<Record<AttachmentType, AttachmentSource>>
  unknown_client_attachment: 'pass' | 'ignore'
  unknown_gateway_attachment: 'pass' | 'ignore'
  custom_tool_prefix: string
  betas: Array<{ name: string; mapping: BetaMapping }>
}
export function defaultRequestPolicy(): RequestPolicy {
  return {
    unknown_beta: 'ignore',
    unknown_field: 'reject',
    allow_fast: false,
    allow_effort: true,
    pass_upstream_errors: false,
    attachment_source: 'client',
    environment_fields: {},
    attachment_sources: {},
    unknown_client_attachment: 'pass',
    unknown_gateway_attachment: 'pass',
    custom_tool_prefix: 'ccgateway',
    tool_search: 'request',
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
export function validRequestPolicy(p: RequestPolicy): boolean {
  return (
    (!p.custom_tool_prefix || (/^[A-Za-z0-9_-]{1,32}$/.test(p.custom_tool_prefix) && !p.custom_tool_prefix.includes('__'))) &&
    (!p.tool_search || ['request', 'false', 'true', 'auto'].includes(p.tool_search) || /^auto:([1-9][0-9]?|100)$/.test(p.tool_search)) &&
    ['reject', 'ignore'].includes(p.unknown_beta) &&
    ['reject', 'ignore'].includes(p.unknown_field) &&
    ['client', 'gateway', 'both'].includes(p.attachment_source) &&
    ['pass', 'ignore'].includes(p.unknown_client_attachment) &&
    ['pass', 'ignore'].includes(p.unknown_gateway_attachment) &&
    Object.entries(p.environment_fields).every(([k, v]) => ['workingDirectory', 'platform'].includes(k) && ['client', 'gateway'].includes(v)) &&
    Object.entries(p.attachment_sources).every(([k, v]) => attachmentTypes.includes(k as AttachmentType) && ['client', 'gateway', 'both'].includes(v))
  )
}
