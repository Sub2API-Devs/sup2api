import { describe, expect, it } from 'vitest'
import { accountPlatform } from './usage'

describe('accountPlatform', () => {
  it.each([
    ['anthropic.messages', 'anthropic'],
    ['openai.responses_ws', 'openai'],
    ['gemini.stream_generate', 'gemini'],
    ['volcengine.video_submit', 'volcengine'],
    // a protocol name may itself contain dots; the platform is what precedes the first
    ['acme.v2.chat', 'acme']
  ])('reads the platform off the upstream protocol %s', (upstream_protocol, platform) => {
    expect(accountPlatform({ upstream_protocol })).toBe(platform)
  })
  it.each([undefined, '', 'local', '.messages', 'anthropic.'])(
    'names no platform for %o, which is not an endpoint protocol',
    upstream_protocol => {
      expect(accountPlatform({ upstream_protocol })).toBe('')
    }
  )
})
