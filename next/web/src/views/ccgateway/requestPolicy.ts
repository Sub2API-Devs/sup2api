export type BetaMapping = 'native' | 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
export interface RequestPolicy {
  unknown_beta: 'reject' | 'ignore'
  unknown_field: 'reject' | 'ignore'
  allow_fast: boolean
  tool_search?: string
  allow_effort: boolean
  betas: Array<{ name: string; mapping: BetaMapping }>
}
export function defaultRequestPolicy(): RequestPolicy {
  return { unknown_beta: 'ignore', unknown_field: 'reject', allow_fast: false, allow_effort: true, tool_search: 'request', betas: [
    { name: 'claude-code-20250219', mapping: 'native' },
    { name: 'oauth-2025-04-20', mapping: 'native' },
    { name: 'interleaved-thinking-2025-05-14', mapping: 'forward' },
    { name: 'fine-grained-tool-streaming-2025-05-14', mapping: 'fine_grained_tools' },
    { name: 'context-1m-2025-08-07', mapping: 'forward' },
    { name: 'fast-mode-2026-02-01', mapping: 'fast' },
    { name: 'advanced-tool-use-2025-11-20', mapping: 'tool_search' },
    { name: 'prompt-caching-2024-07-31', mapping: 'native' },
    { name: 'extended-cache-ttl-2025-04-11', mapping: 'native' },
    { name: 'token-efficient-tools-2025-02-19', mapping: 'native' },
    { name: 'output-128k-2025-02-19', mapping: 'native' },
    { name: 'structured-outputs-2025-11-13', mapping: 'native' },
    { name: 'dev-full-thinking-2025-05-14', mapping: 'forward' },
    { name: 'model-context-window-exceeded-2025-08-26', mapping: 'forward' },
    { name: 'mid-conversation-output-config-2026-07-01', mapping: 'native' },

  ] }
}
export function validRequestPolicy(p: RequestPolicy): boolean {
  return (!p.tool_search || ['request', 'false', 'true', 'auto'].includes(p.tool_search) || /^auto:([1-9][0-9]?|100)$/.test(p.tool_search)) && ['reject', 'ignore'].includes(p.unknown_beta) && ['reject', 'ignore'].includes(p.unknown_field)
    && p.betas.length <= 64 && new Set(p.betas.map(b => b.name)).size === p.betas.length
    && p.betas.every(b => /^[a-z0-9][a-z0-9._-]{0,127}$/.test(b.name)
      && (b.mapping === 'native' || b.mapping === 'forward'
        || b.mapping === 'tool_search' && b.name === 'advanced-tool-use-2025-11-20'
        || b.mapping === 'fast' && b.name === 'fast-mode-2026-02-01'
        || b.mapping === 'fine_grained_tools' && b.name === 'fine-grained-tool-streaming-2025-05-14'))
}
