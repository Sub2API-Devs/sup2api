import { describe, expect, it } from 'vitest'
import { emptyVideoPrice, readVideoPrice, videoExpression } from './videoPrice'

// Migrated from scripts/video-price-test.mjs (the locale part lives in
// src/i18n/locales.spec.ts, which checks every namespace).
describe('video price', () => {
  const config = {
    ...emptyVideoPrice(),
    price_per_million_tokens: 7,
    video_input_price_per_million_tokens: 4.3,
    video_price_per_second: 0.2,
    resolution_prices: [{ sizes: ['1920x1080'], price_per_million_tokens: 10, video_price_per_second: 0, video_input_price_per_million_tokens: 0 }]
  }

  it('round-trips the config', () => {
    expect(readVideoPrice(JSON.parse(JSON.stringify(config)))).toEqual(config)
  })

  it('generates orientation, input fallback, per-second and estimate terms', () => {
    const expr = videoExpression(readVideoPrice(config))
    expect(expr).toContain('(u("video_width") == 1080 && u("video_height") == 1920)')
    expect(expr).toContain('(u("video_input") == true ? 4.3 : 10)')
    expect(expr).toContain('flat(0.2)')
    expect(expr).toContain('u("video_estimated") == true')
  })

  it('copies resolution sizes instead of sharing them', () => {
    const restored = readVideoPrice(config)
    restored.resolution_prices[0].sizes.push('1600x900')
    expect(config.resolution_prices[0].sizes).toHaveLength(1)
  })
})
