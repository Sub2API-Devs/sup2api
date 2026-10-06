export type BetaMapping = 'forward' | 'fine_grained_tools' | 'fast' | 'tool_search'
export interface RequestPolicy {
  unknown_beta: 'reject' | 'ignore'
  unknown_field: 'reject' | 'ignore'
  allow_fast: boolean
  tool_search?: string
  allow_effort: boolean
  betas: Array<{ name: string; mapping: BetaMapping }>
}
export function defaultRequestPolicy(): RequestPolicy {
  return {
    unknown_beta: 'ignore',
    unknown_field: 'reject',
    allow_fast: false,
    allow_effort: true,
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
    (!p.tool_search || ['request', 'false', 'true', 'auto'].includes(p.tool_search) || /^auto:([1-9][0-9]?|100)$/.test(p.tool_search)) &&
    ['reject', 'ignore'].includes(p.unknown_beta) &&
    ['reject', 'ignore'].includes(p.unknown_field)
  )
}
