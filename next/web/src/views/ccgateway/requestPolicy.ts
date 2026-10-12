export type BetaMapping = 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
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
  relay_mode: 'native'
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
    relay_mode: 'native',
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
export function normalizeRequestPolicy(policy?: Partial<Omit<RequestPolicy, 'relay_mode'>> & { relay_mode?: unknown }): RequestPolicy {
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
    relay_mode: 'native',
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
    p.relay_mode === 'native'
  )
}
