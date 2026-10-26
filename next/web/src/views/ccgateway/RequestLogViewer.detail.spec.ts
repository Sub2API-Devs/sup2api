import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RequestLogViewer from './RequestLogViewer.vue'

// The detail of one request log in four parts (REQUEST-LOG-ASYNC-DESIGN.md §5).
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({
  api: { get: mocks.get },
  apiBase: () => '/api',
  session: { get: () => ({ access_token: 'token' }) },
  ApiError: class extends Error { constructor(public status: number, public error: unknown) { super('api error') } },
  isApiError: () => false,
}))

const LOG = 'log-1'
const RID = 'req_0123456789'
const assembled = { id: 'msg_1', type: 'message', role: 'assistant', content: [{ type: 'text', text: '<b>不渲染</b>' }], stop_reason: 'end_turn' }
const sse = 'event: message_start\ndata: {"type":"message_start"}\n\n'
const FILES: Record<string, string> = {
  'request.body': '{"model":"claude-sonnet-4-6","messages":[]}',
  'upstream-request.body': '{"model":"claude-sonnet-4-6","system":[]}',
  'response.json': JSON.stringify(assembled),
  'response.body': sse,
}
const item = (over: Record<string, unknown> = {}) => ({
  id: LOG, request_id: RID, time: '2026-10-27T00:00:00Z', duration_ms: 1200, status: 200, stage: 'finished', model: 'claude-sonnet-4-6', stream: true,
  log_level: 'full', log_status: 'complete', test: false, has_content: true, bytes: 4096, ...over,
})
const fileList = (names: string[]) => names.map(name => ({ name, bytes: FILES[name]!.length, kind: name.startsWith('upstream') ? 'upstream' : name.startsWith('response') ? 'response' : 'request' }))
const detail = (over: Record<string, unknown> = {}) => ({
  metadata: { stage: 'finished', status: 200, response_assembled: true, response_events: 9 },
  events: [], events_truncated: false,
  request_headers: { 'Content-Type': ['application/json'], 'X-Api-Key': ['[REDACTED]'] },
  response_headers: { 'Content-Type': ['text/event-stream'] },
  files: fileList(['request.body', 'upstream-request.body', 'response.json']),
  content: true,
  upstream_request: { method: 'POST', url: 'https://api.anthropic.com/v1/messages', headers: { 'anthropic-version': '2023-06-01', authorization: '[REDACTED]' }, body_bytes: 40, body_sha256: 'a'.repeat(64) },
  ...over,
})

let fetchMock: ReturnType<typeof vi.fn>
function serve(listItem: Record<string, unknown>, d: Record<string, unknown>) {
  mocks.get.mockImplementation(async (url: string) => (url.endsWith('/requests') ? { items: [listItem], next: null, active: [] } : d))
}

async function open() {
  const w = mount(RequestLogViewer, { attachTo: document.body, props: { open: true, accountId: 25, requestId: RID, search: false }, global: { plugins: [i18n] } })
  await flushPromises()
  return w
}
const panel = () => document.body.querySelector('[data-testid="request-log-detail"]') as HTMLElement
const tabLabels = () => Array.from(document.body.querySelectorAll('[role="tab"]'), b => b.textContent!.replace(/\d+$/, '').trim())
async function choose(key: string) {
  ;(document.body.querySelector(`[id$="-tab-${key}"]`) as HTMLElement).click()
  await flushPromises()
}
const fetched = () => fetchMock.mock.calls.map(c => decodeURIComponent(String(c[0]).split('/files/')[1]?.split('?')[0] ?? ''))

beforeEach(() => {
  vi.clearAllMocks()
  i18n.global.locale.value = 'zh'
  fetchMock = vi.fn(async (url: string) => {
    const name = decodeURIComponent(url.split('/files/')[1]!.split('?')[0]!)
    const bytes = new TextEncoder().encode(FILES[name] ?? '')
    return new Response(bytes, { status: 200, headers: { 'X-Log-File-Size': String(bytes.length) } })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('request log detail in four parts', () => {
  it('orders the tabs: overview, the parts, events and every file', async () => {
    serve(item(), detail())
    const w = await open()
    expect(tabLabels()).toEqual(['概览', '请求头', '请求体', '上游请求', '响应头', '响应体', '事件', '文件'])
    expect(fetchMock).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows the assembled response.json formatted, as text', async () => {
    serve(item(), detail({ files: fileList(['request.body', 'upstream-request.body', 'response.json', 'response.body']) }))
    const w = await open()
    await choose('response_body')
    expect(fetched()).toEqual(['response.json'])
    const text = panel().querySelector('[data-testid="request-log-text"]')!.textContent!
    expect(text).toBe(JSON.stringify(assembled, null, 2))
    expect(panel().querySelector('b')).toBeNull()
    expect(panel().querySelector('[data-testid="request-log-body-raw"]')).toBeNull()
    expect(panel().querySelector('[data-testid="request-log-content-notice"]')).not.toBeNull()
    w.unmount()
  })

  it('falls back to response.body shown raw when the response was not assembled', async () => {
    serve(item(), detail({ metadata: { response_assembled: false }, files: fileList(['request.body', 'response.body']) }))
    const w = await open()
    await choose('response_body')
    expect(fetched()).toEqual(['response.body'])
    expect(panel().querySelector('[data-testid="request-log-body-raw"]')!.textContent).toContain('显示原始字节')
    expect(panel().querySelector('[data-testid="request-log-text"]')!.textContent).toBe(sse)
    expect(panel().querySelector('[data-testid="request-log-blocks"]')).toBeNull()
    w.unmount()
  })

  it('reads the request body and the upstream request with its body', async () => {
    serve(item(), detail())
    const w = await open()
    await choose('request_body')
    expect(fetched()).toEqual(['request.body'])
    expect(panel().querySelector('[data-testid="request-log-text"]')!.textContent).toBe(JSON.stringify(JSON.parse(FILES['request.body']!), null, 2))
    await choose('upstream')
    expect(panel().querySelector('[data-testid="request-log-upstream"]')!.textContent).toContain('https://api.anthropic.com/v1/messages')
    expect(panel().querySelector('[data-testid="request-log-upstream-headers"]')!.textContent).toContain('anthropic-version')
    expect(fetched()).toEqual(['request.body', 'upstream-request.body'])
    expect(panel().querySelector('[data-testid="request-log-file-view-upstream-request.body"]')).not.toBeNull()
    await choose('request_headers')
    expect(panel().querySelector('[data-testid="request-log-request_headers"]')!.textContent).toContain('[REDACTED]')
    await choose('response_headers')
    expect(panel().querySelector('[data-testid="request-log-response_headers"]')!.textContent).toContain('text/event-stream')
    w.unmount()
  })

  it('says the upstream request or a part was not kept', async () => {
    serve(item(), detail({ upstream_request: undefined, files: fileList(['request.body']) }))
    const w = await open()
    await choose('upstream')
    expect(panel().querySelector('[data-testid="request-log-upstream-none"]')!.textContent).toContain('没有记录发给上游的请求')
    expect(panel().querySelector('[data-testid="request-log-body-reason-upstream"]')!.textContent).toContain('没有保存上游请求体')
    await choose('response_body')
    expect(panel().querySelector('[data-testid="request-log-body-reason-response"]')!.textContent).toContain('没有保存响应体')
    expect(fetchMock).not.toHaveBeenCalled()
    w.unmount()
  })

  it('needs the management permission for bodies and offers no file list without it', async () => {
    serve(item(), detail({ content: false }))
    const w = await open()
    expect(tabLabels()).not.toContain('文件')
    for (const [tab, part] of [['request_body', 'request'], ['upstream', 'upstream'], ['response_body', 'response']]) {
      await choose(tab!)
      expect(panel().querySelector(`[data-testid="request-log-body-reason-${part}"]`)!.textContent!.trim()).toBe('需要管理权限查看正文（settings:manage）。')
      expect(panel().querySelector('[data-testid="request-log-content-notice"]')).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
    w.unmount()
  })

  it('keeps no bodies at the summary level', async () => {
    serve(item({ log_level: 'summary', has_content: false }), detail({ files: [], metadata: {} }))
    const w = await open()
    for (const [tab, part] of [['request_body', 'request'], ['response_body', 'response']]) {
      await choose(tab!)
      expect(panel().querySelector(`[data-testid="request-log-body-reason-${part}"]`)!.textContent!.trim()).toBe('摘要级别不保存正文。')
    }
    expect(fetchMock).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows the response capture fields in the overview only when recorded', async () => {
    serve(item({ log_status: 'partial' }), detail({ metadata: { response_assembled: false, response_capture: 'dropped', log_dropped_bytes: 81920 } }))
    let w = await open()
    expect(panel().querySelector('[data-testid="request-log-response-assembled"]')!.textContent).toContain('未组装')
    expect(panel().querySelector('[data-testid="request-log-response-capture"]')!.textContent).toContain('已丢弃')
    expect(panel().querySelector('[data-testid="request-log-dropped-bytes"]')!.textContent).toContain('80.0 KiB')
    expect(panel().textContent).toContain('部分丢失')
    await choose('response_body')
    expect(panel().querySelector('[data-testid="request-log-response-dropped"]')!.textContent).toContain('日志队列已满')
    w.unmount()

    serve(item(), detail())
    w = await open()
    expect(panel().querySelector('[data-testid="request-log-response-assembled"]')!.textContent).toContain('已组装为完整响应 · 9 个事件')
    expect(panel().querySelector('[data-testid="request-log-response-capture"]')).toBeNull()
    expect(panel().querySelector('[data-testid="request-log-dropped-bytes"]')).toBeNull()
    w.unmount()

    serve(item(), detail({ metadata: { stage: 'finished' } }))
    w = await open()
    expect(panel().querySelector('[data-testid="request-log-response-assembled"]')).toBeNull()
    w.unmount()
  })

  it('lists every file under the files tab', async () => {
    serve(item(), detail())
    const w = await open()
    await choose('files')
    expect(panel().querySelector('[data-testid="request-log-content"]')).not.toBeNull()
    expect(panel().querySelector('[data-testid="request-log-file-response.json"]')).not.toBeNull()
    expect(fetched()).toEqual(['request.body'])
    w.unmount()
  })
})
