export type BetaMapping = 'native' | 'forward' | 'fine_grained_tools' | 'fast'
export interface RequestPolicy {
  unknown_beta: 'reject' | 'ignore'
  unknown_field: 'reject' | 'ignore'
  allow_fast: boolean
  allow_effort: boolean
  betas: Array<{ name: string; mapping: BetaMapping }>
}
export function defaultRequestPolicy(): RequestPolicy {
  return { unknown_beta: 'ignore', unknown_field: 'reject', allow_fast: false, allow_effort: true, betas: [
    { name: 'claude-code-20250219', mapping: 'native' },
    { name: 'oauth-2025-04-20', mapping: 'native' },
    { name: 'interleaved-thinking-2025-05-14', mapping: 'forward' },
    { name: 'fine-grained-tool-streaming-2025-05-14', mapping: 'fine_grained_tools' },
    { name: 'context-1m-2025-08-07', mapping: 'forward' },
    { name: 'fast-mode-2026-02-01', mapping: 'fast' },
  ] }
}
export function validRequestPolicy(p: RequestPolicy): boolean {
  return ['reject', 'ignore'].includes(p.unknown_beta) && ['reject', 'ignore'].includes(p.unknown_field)
    && p.betas.length <= 64 && new Set(p.betas.map(b => b.name)).size === p.betas.length
    && p.betas.every(b => /^[a-z0-9][a-z0-9._-]{0,127}$/.test(b.name)
      && (b.mapping === 'native' || b.mapping === 'forward'
        || b.mapping === 'fast' && b.name === 'fast-mode-2026-02-01'
        || b.mapping === 'fine_grained_tools' && b.name === 'fine-grained-tool-streaming-2025-05-14'))
}
