// Dev-only mock of the console API (vite --mode mock). Never bundled.
// Handlers are registered by the area modules below; each handler receives
// the parsed request and returns {status?, body} or a plain value (wrapped
// as {"data": value}).

import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { routes, type MockRequest } from './router'
import { pluginAsset } from './pluginui'
import './core'
import './accounts'
import './resources'
import './billing'
import './plugins'

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks)
  if (!raw.length) return undefined
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw.toString('utf8'))
    } catch {
      return undefined
    }
  }
  return { __raw: raw.length }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  if (body === undefined || status === 204) return res.end()
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function mockApi(): Plugin {
  return {
    name: 'sub2api:mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        if (url.pathname.startsWith('/plugin-ui/')) {
          const asset = pluginAsset(url.pathname)
          if (!asset) return send(res, 404, { error: { code: 'not_found', message: 'asset not found' } })
          res.statusCode = 200
          res.setHeader('Content-Type', asset.type)
          return res.end(asset.body)
        }
        if (!url.pathname.startsWith('/api/v1/')) return next()
        const path = url.pathname.slice('/api/v1'.length)
        const method = (req.method || 'GET').toUpperCase()
        for (const r of routes) {
          if (r.method !== method && r.method !== 'ANY') continue
          const m = r.re.exec(path)
          if (!m) continue
          const params: Record<string, string> = {}
          r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
          const mreq: MockRequest = {
            method,
            path,
            params,
            query: Object.fromEntries(url.searchParams.entries()),
            body: await readBody(req),
            headers: req.headers as Record<string, string>
          }
          try {
            const out = await r.handler(mreq)
            if (out && typeof out === 'object' && '__status' in out) return send(res, (out as any).__status, (out as any).body)
            return send(res, 200, out && typeof out === 'object' && ('data' in out || 'error' in out) ? out : { data: out })
          } catch (e) {
            return send(res, 500, { error: { code: 'internal', message: String(e) } })
          }
        }
        send(res, 404, { error: { code: 'not_found', message: `mock: no handler for ${method} ${path}` } })
      })
    }
  }
}
