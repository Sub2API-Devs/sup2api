// Price sync source defaults (kept in step with the server).
import type { PriceSourceKind } from '@/api/types'

export const SOURCE_KINDS: readonly PriceSourceKind[] = ['litellm', 'models_dev', 'sup2api']

export const DEFAULT_URLS: Record<PriceSourceKind, string> = {
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  models_dev: 'https://models.dev/api.json',
  sup2api: ''
}

/** Default vendor filter: LiteLLM litellm_provider values / models.dev vendor ids. */
export const DEFAULT_PROVIDERS: Record<'litellm' | 'models_dev', string[]> = {
  litellm: ['anthropic', 'openai', 'gemini'],
  models_dev: ['anthropic', 'openai', 'google']
}

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.host
  } catch {
    return false
  }
}
