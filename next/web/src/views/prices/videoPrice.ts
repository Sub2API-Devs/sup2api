export interface VideoRate {
  price_per_million_tokens: number
  video_input_price_per_million_tokens: number
  video_price_per_second: number
}
export interface VideoPrice extends VideoRate {
  resolution_prices: (VideoRate & { sizes: string[] })[]
}
export const emptyVideoRate = (): VideoRate => ({ price_per_million_tokens: 0, video_input_price_per_million_tokens: 0, video_price_per_second: 0 })
export const emptyVideoPrice = (): VideoPrice => ({ ...emptyVideoRate(), resolution_prices: [] })

export function readVideoPrice(raw: any): VideoPrice {
  return { ...emptyVideoPrice(), ...raw, resolution_prices: (raw?.resolution_prices || []).map((r: any) => ({ ...emptyVideoRate(), ...r, sizes: [...(r.sizes || [])] })) }
}

// This preview follows the host generator. The host always regenerates video
// expressions from config and rejects invalid or contradictory definitions.
export function videoExpression(c: VideoPrice): string {
  const tier = (name: string, r: VideoRate) => {
    const rate = Number(r.price_per_million_tokens) || 0
    const input = Number(r.video_input_price_per_million_tokens) || rate
    const selected = `(u("video_input") == true ? ${input} : ${rate})`
    let body = `c * ${selected}`
    if (Number(r.video_price_per_second) > 0) {
      body = `u("video_estimated") == true ? (flat(${r.video_price_per_second}) * (u("video_seconds") ?? 0) * (u("video_pixels") ?? 0) / 921600 * ${selected} / ${rate}) : (${body})`
    }
    return `tier(${JSON.stringify(name)}, ${body})`
  }
  let body = tier('video', c)
  for (let i = c.resolution_prices.length - 1; i >= 0; i--) {
    const row = c.resolution_prices[i]
    const effective = { ...c }
    for (const key of ['price_per_million_tokens', 'video_input_price_per_million_tokens', 'video_price_per_second'] as const) {
      if (Number(row[key]) > 0) effective[key] = Number(row[key])
    }
    const conditions = row.sizes.map((s) => {
      const [w, h] = s.trim().toLowerCase().split('x').map(Number)
      return `((u("video_width") == ${w} && u("video_height") == ${h}) || (u("video_width") == ${h} && u("video_height") == ${w}))`
    })
    body = `(${conditions.join(' || ')}) ? ${tier(`video_size_${i + 1}`, effective)} : (${body})`
  }
  return body
}
