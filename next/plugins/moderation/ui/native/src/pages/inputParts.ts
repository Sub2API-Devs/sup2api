// Text and image parts of the saved user messages (GET /events/:id/input),
// read like the plugin's extract.go: OpenAI chat / Anthropic messages and
// OpenAI responses items ({content: string | blocks}), Gemini contents
// ({parts}). Pure functions: no host, testable with node --test.

export type MessagePart = { type: 'text'; text: string } | { type: 'image'; src: string; kind: 'url' | 'data'; mime: string }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Only data:image/* and http(s) sources are rendered as <img>. */
const SAFE_SRC = /^(data:image\/[\w.+-]+;base64,|https?:\/\/)/i

function image(src: string, mime = ''): MessagePart | null {
  if (!src) return null
  if (src.startsWith('data:')) {
    const m = /^data:([^;,]*)/.exec(src)
    return { type: 'image', src: SAFE_SRC.test(src) ? src : '', kind: 'data', mime: mime || m?.[1] || '' }
  }
  return { type: 'image', src: SAFE_SRC.test(src) ? src : '', kind: 'url', mime }
}

function dataImage(mime: string, data: string): MessagePart | null {
  if (!data) return null
  return image(mime ? `data:${mime};base64,${data}` : '', mime) || { type: 'image', src: '', kind: 'data', mime }
}

function blockParts(b: unknown): Array<MessagePart | null> {
  if (!isObj(b)) return []
  switch (b.type) {
    case 'text':
    case 'input_text':
      return [{ type: 'text', text: str(b.text) }]
    case 'image': {
      const s = isObj(b.source) ? b.source : {}
      return [s.type === 'url' ? image(str(s.url)) : dataImage(str(s.media_type), str(s.data))]
    }
    case 'image_url':
    case 'input_image': {
      const u = typeof b.image_url === 'string' ? b.image_url : isObj(b.image_url) ? str(b.image_url.url) : ''
      return [image(u)]
    }
  }
  return []
}

function geminiParts(item: Obj): Array<MessagePart | null> {
  const parts = Array.isArray(item.parts) ? item.parts : []
  return parts.flatMap((p) => {
    if (!isObj(p)) return []
    const out: Array<MessagePart | null> = []
    if (p.text) out.push({ type: 'text', text: str(p.text) })
    const inline = isObj(p.inlineData) ? p.inlineData : isObj(p.inline_data) ? p.inline_data : null
    if (inline) {
      const mime = str(inline.mimeType) || str(inline.mime_type)
      if (mime.startsWith('image/')) out.push(dataImage(mime, str(inline.data)))
    }
    const file = isObj(p.fileData) ? p.fileData : isObj(p.file_data) ? p.file_data : null
    if (file) {
      const mime = str(file.mimeType) || str(file.mime_type)
      const uri = str(file.fileUri) || str(file.file_uri)
      if (mime.startsWith('image/') && uri) out.push(image(uri, mime))
    }
    return out
  })
}

function itemParts(item: unknown): Array<MessagePart | null> {
  if (typeof item === 'string') return [{ type: 'text', text: item }]
  if (!isObj(item)) return []
  if ('parts' in item && !('content' in item)) return geminiParts(item)
  const c = item.content
  if (typeof c === 'string') return [{ type: 'text', text: c }]
  return Array.isArray(c) ? c.flatMap(blockParts) : []
}

/** Parts in message order; blank texts dropped. */
export function messageParts(messages: unknown): MessagePart[] {
  const items = Array.isArray(messages) ? messages : messages === null || messages === undefined ? [] : [messages]
  return items.flatMap(itemParts).filter((p): p is MessagePart => !!p && (p.type === 'image' || p.text.trim() !== ''))
}
