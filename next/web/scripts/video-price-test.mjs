import assert from 'node:assert/strict'
import { emptyVideoPrice, readVideoPrice, videoExpression } from '../src/views/prices/videoPrice.ts'
import zh from '../src/i18n/locales/zh/prices.ts'
import en from '../src/i18n/locales/en/prices.ts'

const config = { ...emptyVideoPrice(), price_per_million_tokens: 7, video_input_price_per_million_tokens: 4.3, video_price_per_second: .2,
  resolution_prices: [{ sizes: ['1920x1080'], price_per_million_tokens: 10, video_price_per_second: 0, video_input_price_per_million_tokens: 0 }] }
const restored = readVideoPrice(JSON.parse(JSON.stringify(config)))
assert.deepEqual(restored, config)
const expression = videoExpression(restored)
assert.ok(expression.includes('(u("video_width") == 1080 && u("video_height") == 1920)'))
assert.ok(expression.includes('(u("video_input") == true ? 4.3 : 10)'))
assert.ok(expression.includes('flat(0.2)'))
assert.ok(expression.includes('u("video_estimated") == true'))
restored.resolution_prices[0].sizes.push('1600x900')
assert.equal(config.resolution_prices[0].sizes.length, 1)
assert.deepEqual(Object.keys(zh.video).sort(), Object.keys(en.video).sort())
console.log('Video config round-trip, independent rate fallback, orientation and locale checks passed')
