import { BRAND_MARKS } from './brandMarks'

// One colour and mark per model vendor, shared by everything the console
// colours by platform or model: platform and group badges, account types,
// model names. A platform maps to its vendor; a model name to the vendor
// whose family it belongs to; anything else gets a stable colour of its own
// and the first letter of its label as its mark.

export interface Brand {
  /** Vendor id (a BRAND_MARKS key when it has a mark). */
  id: string
  /** Brand colour on a light background. */
  color: string
  /** Brand colour on a dark background, when the light one is too dark. */
  dark?: string
  /** The vendor's mark, absent for an unknown vendor. */
  mark?: readonly string[]
}

const COLORS: Record<string, Pick<Brand, 'color' | 'dark'>> = {
  anthropic: { color: '#D97757' },
  openai: { color: '#10A37F' },
  gemini: { color: '#4285F4', dark: '#7BAAF7' },
  doubao: { color: '#0EA5E9' },
  deepseek: { color: '#4D6BFE', dark: '#8197FF' },
  qwen: { color: '#615EFF', dark: '#9593FF' },
  zhipu: { color: '#3859FF', dark: '#7D91FF' },
  moonshot: { color: '#16191E', dark: '#E5E7EB' },
  xai: { color: '#111111', dark: '#F3F4F6' },
  mistral: { color: '#FA520F' },
  meta: { color: '#0668E1', dark: '#5A9BEF' },
  minimax: { color: '#E73562' }
}

/** Platform ids (CONTRACTS §13) whose vendor differs from the id. */
const PLATFORM_VENDORS: Record<string, string> = { volcengine: 'doubao' }

/** Model families, first match wins (lower-cased name without its `vendor/` prefix). */
const MODEL_VENDORS: [RegExp, string][] = [
  [/claude/, 'anthropic'],
  [/^(ft:)?(gpt|o[134]\b|chatgpt|codex|dall-e|whisper|tts-|text-embedding-(3|ada)|omni-moderation|sora)/, 'openai'],
  [/gemini|gemma|imagen|veo-|learnlm/, 'gemini'],
  [/doubao|seed(ance|ream|-)|skylark/, 'doubao'],
  [/deepseek/, 'deepseek'],
  [/qwen|qwq|qvq/, 'qwen'],
  [/glm|cogview|cogvideo/, 'zhipu'],
  [/kimi|moonshot/, 'moonshot'],
  [/grok/, 'xai'],
  [/(mi|code|magi|dev|mini|math)stral|(mix|pix|vox)tral/, 'mistral'],
  [/llama/, 'meta'],
  [/minimax|abab/, 'minimax']
]

/** Stand-in colours of vendors this console does not know, picked by a hash of the id: light, then dark background. */
const FALLBACK: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#DB2777', '#F472B6'],
  ['#0F766E', '#2DD4BF'],
  ['#B45309', '#FBBF24'],
  ['#4F46E5', '#818CF8'],
  ['#4D7C0F', '#A3E635'],
  ['#0E7490', '#22D3EE'],
  ['#E11D48', '#FB7185']
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

/** A table entry by key; ids come from the server, so inherited keys such as "constructor" must not match. */
const own = <T>(table: Record<string, T>, key: string): T | undefined => (Object.hasOwn(table, key) ? table[key] : undefined)

/** The brand of a vendor id, or a stable stand-in for an unknown one. */
export function brand(id: string): Brand {
  const known = own(COLORS, id)
  if (known) return { id, ...known, mark: BRAND_MARKS[id] }
  const [color, dark] = FALLBACK[hash(id) % FALLBACK.length]
  return { id, color, dark }
}

export const platformBrand = (platform: string) => brand(own(PLATFORM_VENDORS, platform) ?? platform)

/** The vendor of a model name ('' when no family matches). */
export function modelVendor(model: string): string {
  const name = model.toLowerCase().replace(/^.*\//, '')
  return MODEL_VENDORS.find(([re]) => re.test(name))?.[1] ?? ''
}

/** The brand of a model name; a model of no known family takes a stand-in of its own name. */
export const modelBrand = (model: string) => brand(modelVendor(model) || model)

/** The CSS variables .brand-tint and .brand-fg read (brand.css). */
export const brandVars = (b: Brand) => ({ '--brand': b.color, '--brand-dark': b.dark ?? b.color })
