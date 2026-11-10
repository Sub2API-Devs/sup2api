import { describe, expect, it } from 'vitest'
import { brand, brandVars, modelBrand, modelVendor, platformBrand } from './brands'

describe('brands', () => {
  it.each([
    ['anthropic', ['claude-sonnet-4-5', 'claude-3-5-haiku-20241022', 'us.anthropic.claude-opus-4-1-v1:0']],
    [
      'openai',
      [
        'gpt-5.1-codex',
        'gpt-4o-mini',
        'o1',
        'o3-mini',
        'o4-mini',
        'chatgpt-4o-latest',
        'codex-mini-latest',
        'dall-e-3',
        'whisper-1',
        'tts-1-hd',
        'text-embedding-3-small',
        'text-embedding-ada-002',
        'omni-moderation-latest',
        'sora-2',
        'ft:gpt-4o-mini:acme::9aBcD'
      ]
    ],
    ['gemini', ['gemini-2.5-pro', 'gemma-3-27b-it', 'imagen-4.0-generate-001', 'veo-3.0-generate-001', 'learnlm-2.0-flash']],
    ['doubao', ['doubao-seed-1.6', 'seedance-1-0-pro', 'seedream-4-0', 'skylark-pro']],
    ['deepseek', ['deepseek-v3', 'deepseek-reasoner', 'deepseek-r1-distill-qwen-32b']],
    ['qwen', ['qwen3-max', 'qwq-32b', 'qvq-max']],
    ['zhipu', ['glm-4.6', 'cogview-4', 'cogvideox-2']],
    ['moonshot', ['kimi-k2', 'moonshot-v1-128k']],
    ['xai', ['grok-4', 'grok-code-fast-1']],
    [
      'mistral',
      [
        'mistral-large-latest',
        'mixtral-8x7b',
        'codestral-2508',
        'pixtral-12b',
        'magistral-medium',
        'devstral-small',
        'ministral-8b-latest',
        'voxtral-mini-latest',
        'mathstral-7b'
      ]
    ],
    ['meta', ['llama-3.3-70b', 'meta-llama-4-maverick']],
    ['minimax', ['minimax-m2', 'abab6.5s-chat']]
  ])('maps the %s model families to their vendor', (vendor, models) => {
    expect(models.map(m => [m, modelVendor(m)])).toEqual(models.map(m => [m, vendor]))
  })

  it('reads a model name whatever its case or `vendor/` prefix', () => {
    expect(
      ['Claude-Sonnet-4-5', 'GPT-4o', 'anthropic/claude-x', 'openai/gpt-5', 'accounts/fireworks/models/llama-v3p1-70b', 'x-ai/Grok-4'].map(
        modelVendor
      )
    ).toEqual(['anthropic', 'openai', 'anthropic', 'openai', 'meta', 'xai'])
  })

  it('leaves a model of no known family without a vendor', () => {
    // An OpenAI family only at the start of the name: "o3" inside another name is not one.
    expect(['my-house-model', 'openai/my-house-model', 'solo3-mini', 'o30', '', 'text-embedding-004'].map(modelVendor)).toEqual([
      '',
      '',
      '',
      '',
      '',
      ''
    ])
  })

  it('gives a platform the brand of its vendor', () => {
    expect(platformBrand('anthropic')).toMatchObject({ id: 'anthropic', color: '#D97757' })
    expect(platformBrand('anthropic').mark?.length).toBeGreaterThan(0)
    expect(platformBrand('volcengine')).toEqual(brand('doubao'))
    expect(modelBrand('claude-sonnet-4-5')).toEqual(brand('anthropic'))
  })

  it('gives an unknown id a stable stand-in colour of its own and no mark', () => {
    const video = brand('myvideo')
    expect(video.mark).toBeUndefined()
    expect(video.color).toMatch(/^#[0-9A-F]{6}$/)
    expect(brand('myvideo')).toEqual(video)
    expect(platformBrand('myvideo')).toEqual(video)
    // A model of no family is its own stand-in, so two such models differ.
    expect(modelBrand('my-house-model')).toEqual(brand('my-house-model'))
    expect(
      new Set(['myvideo', 'foo', 'relay', 'demo', 'acme', 'my-house-model', 'x', 'zz'].map(id => brand(id).color)).size
    ).toBeGreaterThan(1)
  })

  it('does not take an inherited object key for a known vendor', () => {
    for (const id of ['constructor', 'toString', '__proto__']) {
      expect(brand(id)).toMatchObject({ id, color: expect.stringMatching(/^#/) })
      expect(platformBrand(id).id).toBe(id)
    }
  })

  it('hands a badge its colours for light and dark, the light one when there is no dark one', () => {
    expect(brandVars(brand('gemini'))).toEqual({ '--brand': '#4285F4', '--brand-dark': '#7BAAF7' })
    expect(brandVars(brand('anthropic'))).toEqual({ '--brand': '#D97757', '--brand-dark': '#D97757' })
    const standIn = brandVars(brand('myvideo'))
    expect(standIn['--brand-dark']).not.toBe(standIn['--brand'])
  })
})
