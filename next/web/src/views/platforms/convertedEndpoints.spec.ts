import { describe, expect, it } from 'vitest'
import type { Platform } from '@/api/types'
import { BUILTIN_PLATFORMS } from '@/composables/platforms'
import { convertedEndpoints } from './convertedEndpoints'

const video: Platform = {
  id: 'myvideo',
  label: { en: 'MyVideo', zh: 'MyVideo' },
  builtin: false,
  endpoints: [{ method: 'POST', path: '/v1/video/generations', protocol: 'myvideo.generate', billing: 'usage' }]
}
const all = [...BUILTIN_PLATFORMS, video]
const own = (...ids: string[]) => all.filter(p => ids.includes(p.id))
const paths = (ids: string[]) => convertedEndpoints(all, own(...ids)).map(p => [p.id, p.endpoints.map(e => e.path)])

describe('converted endpoints', () => {
  it('reaches the text endpoints and token counts of every other platform from one text platform', () => {
    expect(paths(['anthropic'])).toEqual([
      ['openai', ['/v1/chat/completions', '/v1/responses']],
      [
        'gemini',
        ['/v1beta/models/:model:generateContent', '/v1beta/models/:model:streamGenerateContent', '/v1beta/models/:model:countTokens']
      ]
    ])
    expect(paths(['openai'])[0]).toEqual(['anthropic', ['/v1/messages', '/v1/messages/count_tokens']])
  })

  it('leaves out the platforms the group already has, and endpoints nothing converts to', () => {
    expect(paths(['anthropic', 'openai']).map(([id]) => id)).toEqual(['gemini'])
    expect(paths(['anthropic', 'openai', 'gemini', 'myvideo'])).toEqual([])
    // Embeddings and video are served natively only.
    expect(JSON.stringify(paths(['gemini']))).not.toMatch(/embeddings|video/)
  })

  it('reaches nothing more from platforms without a text endpoint', () => {
    expect(paths(['myvideo'])).toEqual([])
    expect(convertedEndpoints(all, [{ id: 'gone', endpoints: [] }])).toEqual([])
    expect(convertedEndpoints(all, [])).toEqual([])
  })
})
