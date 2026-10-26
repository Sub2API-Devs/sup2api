// Dev-only CCGateway fixture; never bundled or connected to a real gateway.
import { createHash, randomBytes } from 'node:crypto'
import { fail, noContent, on, type MockRequest } from './router'
import { mockAccount, mockCcgReauthAccount, mockClearAccountHistory, registerCcgDrafts } from './accounts'
import { caller, hasPerm } from './core'
import { mockProxyStatus } from './resources'
if (process.env.SUB2API_MOCK_CCGATEWAY) {
  const base = '/system/ccgateway'
  // Per-account containers ("一账号一容器") behind a controller endpoint (CONTRACTS §53.9).
  let config: Record<string, unknown> = {account_runtimes:true,mode:'controller',scheme:'https',host:'15.204.107.38',port:18443,base_path:'',has_admin_key:true,has_api_key:false,has_controller_ca:true,controller_ca_fingerprint:'76349628e4eaf86a5a217cf48429af2e5e16f5231f983105cd0d89f2fa08c92a',has_password:false,has_private_key:false,has_passphrase:false,user:'',auth_mode:'',host_key_fingerprint:'',request_policy:{schema_version:1,unknown_field:'reject',allow_fast:true,allow_effort:true,custom_tool_prefix:'ccgateway',tool_search:'request',thinking_disabled_compat:'pass',level:'low',relay_mode:'build',build_attachment_sources:{platform_name:'worker',os_version:'worker'},betas:[]},request_logs:{level:'summary'}}
  // SUB2API_MOCK_CCG_LOG_DEFAULT=full|off starts with that default request log rule (REQUEST-LOG-ASYNC-DESIGN.md §6:
  // a full default has no end; the Worker's full retention and budget still apply).
  if (['off','summary','full'].includes(process.env.SUB2API_MOCK_CCG_LOG_DEFAULT||'')) config.request_logs={level:process.env.SUB2API_MOCK_CCG_LOG_DEFAULT}
  on('GET',`${base}/remote-config`,()=>config)
  // Request catalog of the core (features.RequestCatalog("request_build")): the
  // two entries the request path declares. Keep it in step with
  // next/plugins/ccgateway/companions/contracts/features/request_modes.go.
  on('GET',`${base}/features`,()=>({catalog_version:'2026-10-20.request-attachments-v1',policy_schema_version:1,runtime_verified:false,features:[
    {id:'F-REQUEST-MODES',title:'单次请求 direct/build',category:'CC 执行上下文',scope:'cc',status:'partial',body_paths:['system','messages','tools'],beta_headers:[],mechanisms:['request_build','CLI 原生单次发送','API Key 认证','调用方执行工具'],reason:'direct 保留 Messages 原文，只补缺失的计费头；build 由 CLI 用原生函数按客户端原块组装，Worker 不改写内容。均不执行工具循环，工具由调用方执行。count_tokens 未实现。版本、补丁和哈希在启动前校验；具体上游模型能力需实际验证。'},
    {id:'F-BUILD-ATTACHMENTS',title:'build 环境附件来源',category:'CC 执行上下文',scope:'cc',status:'supported',body_paths:['system','messages[].content'],beta_headers:[],mechanisms:['build_attachment_sources_v2','build_attachment_sources','CLI 原生环境段'],reason:'环境段各字段按来源由 CLI 的内容适配器生成：默认保留客户端，也可用 Worker 本机事实或擦除。仅识别完整 CC 环境段落，其余内容原样保留；不调用额外模型。direct 不执行转换。'},
  ]}))
  on('PUT',`${base}/remote-config`,({body})=>{
    const { password,private_key,passphrase,admin_key,api_key,controller_ca,...publicFields }=body
    // The default request log rule (REQUEST-LOG-ASYNC-DESIGN.md §6): off, summary or full; omitted keeps it.
    if (publicFields.request_logs!==undefined && !['off','summary','full'].includes(publicFields.request_logs?.level)) return fail(400,'invalid_argument','request_logs.level must be off, summary or full.')
    config={...config,...publicFields,account_runtimes:true,has_admin_key:!!admin_key||config.has_admin_key,has_controller_ca:publicFields.scheme==='http'?false:(!!controller_ca||config.has_controller_ca)}
    return config
  })
  on('POST',`${base}/remote-fingerprint`,()=>({fingerprint:'SHA256:previewFingerprintOnly',verified:false}))
  on('POST',`${base}/remote-test`,()=>config.mode==='controller'?({output:'controller mock\nfeatures tunnel, uploads, runtime-images, self-upgrade, worker-update'}):fail(400,'invalid_argument','Connect a controller first.',{reason:'controller_not_configured'}))
  on('POST',`${base}/controller/install`,({body})=>{
    const scheme=body.scheme||'https', port=body.port||(scheme==='https'?18443:18080)
    const host=body.host||(body.method==='local'?'127.0.0.1':body.ssh?.host||'docker.example.test')
    const domain=!/^[0-9.:]+$/.test(host)
    config={...config,mode:'controller',scheme,host,port,base_path:'',has_admin_key:true,has_controller_ca:scheme==='https'&&!domain,
      controller_ca_fingerprint:scheme==='https'&&!domain?'0f'.repeat(32):'',user:'',auth_mode:'',host_key_fingerprint:'',has_password:false,has_private_key:false,has_passphrase:false}
    return domain?{...config,warnings:['dns_mismatch']}:config
  })
  on('POST',`${base}/connect`,()=>({id:99001}))

  // Per-account containers and drafts (docs/CCGATEWAY-DRAFT-RUNTIMES.md). Runtimes are keyed like
  // the core: an account id, or a draft key (d + 16 hex) that a new account adopts on save.
  // CCGateway accounts of mock/accounts.ts: #25 authorized, #26 not yet, #27 has no proxy (direct egress).
  // Like the core:
  // - errors carry an English message and the cause code in details.reason;
  // - account and proxy status never stop a runtime (only a deleted account's, which the mock has none of);
  // - a runtime is ready ~4 s after it was created, synced or switched to another proxy;
  // - start returns the pending session if there is one; GET session resumes it;
  // - a code without '#' is invalid_code (session kept), one starting with "reject" is auth_rejected
  //   (session ended), anything else signs the container in;
  // - drafts are only visible to their creator (or settings:manage); every draft call touches it and
  //   drafts untouched for 15 minutes or older than 2 hours are swept.
  // Re-authorization (docs/CCGATEWAY-REAUTH.md): POST accounts/:id/reauthorize opens a draft for the
  // account (with its saved proxy; an open one is returned again with 200), driven through the draft
  // routes; commit swaps the account to it and clears the account's state (last test, cooldown, …).
  // The retired runtime is removed at once here (the core waits 10 minutes).
  const READY_MS = 4000
  /** Claude Code version the mock Workers report (GET accounts/:id/health cli_version). */
  const CLI_VERSION = '2.1.292'
  const born = new Map<string, number>([['25', 0], ['26', 0]]), authed = new Set<string>(['25'])
  const sessions = new Map<string, { session_id: string; url: string; expires_at: string }>()
  interface Draft { proxy_id: number; created_by: number; created_at: number; last_seen: number; account_id: number | null; for_account: number | null }
  const drafts = new Map<string, Draft>()
  /** What a runtime that is not ready yet reports: a first build or a rebuild (proxy switched). */
  const converging = new Map<string, 'creating' | 'pending'>()
  /** Runtime key of an account that adopted a draft. */
  const adoptedBy = new Map<string, string>()
  const configured = () => !!config.account_runtimes && config.mode === 'controller' && !!config.has_admin_key
  const fault = (status: number, reason: string, message: string) => fail(status, status === 400 ? 'invalid_argument' : status === 404 ? 'not_found' : 'unavailable', message, { reason })
  const notConfigured = () => fault(503, 'not_configured', 'Per-account runtimes are disabled or no Docker connection is configured')
  const notSynchronized = () => fault(503, 'not_synchronized', 'The runtime is not ready yet')
  const ready = (key: string) => { if (!born.has(key)) born.set(key, Date.now()); return Date.now() - born.get(key)! >= READY_MS }
  const pending = (key: string) => {
    const s = sessions.get(key)
    if (s && Date.parse(s.expires_at) <= Date.now()) sessions.delete(key)
    return sessions.get(key) || null
  }
  const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
  const removeRuntime = (key: string) => { born.delete(key); authed.delete(key); sessions.delete(key); converging.delete(key) }
  function sweep() {
    const now = Date.now()
    for (const [key, d] of drafts) {
      if (d.account_id == null && (now - d.last_seen > 15 * 60_000 || now - d.created_at > 2 * 3600_000)) {
        console.log(`[mock ccgateway] sweep removed draft ${key}`)
        drafts.delete(key)
        removeRuntime(key)
      }
    }
  }

  /** A resolved runtime (its key), or an error response. */
  type Runtime = { key: string }
  type Resolve = (req: MockRequest) => Runtime | { __status: number; body: unknown }
  const accountRuntime: Resolve = ({ params }) => {
    if (!configured()) return notConfigured()
    const a = mockAccount(Number(params.id))
    if (!a) return fault(404, 'not_found', 'account not found')
    return { key: adoptedBy.get(params.id) || params.id }
  }
  const draftRuntime: Resolve = (req) => {
    sweep()
    const d = drafts.get(req.params.key)
    const who = caller(req)
    if (!d || d.account_id != null || (d.created_by !== who.id && !hasPerm(who, 'settings:manage'))) return fault(404, 'draft_not_found', 'The draft runtime does not exist')
    if (!configured()) return notConfigured()
    d.last_seen = Date.now()
    return { key: req.params.key }
  }
  const isRuntime = (r: Runtime | { __status: number; body: unknown }): r is Runtime => !('__status' in r)

  /** status / health / session / sync / start / complete / cancel / logout of one runtime kind. */
  function runtimeRoutes(prefix: string, resolve: Resolve) {
    on('GET', `${prefix}/status`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      return { status: ready(r.key) ? 'ready' : converging.get(r.key) || 'creating', container: `ccg-${r.key}-app` }
    })
    on('GET', `${prefix}/health`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      if (!ready(r.key)) return notSynchronized()
      // Accounts also name the Claude Code version their Worker observed (drafts do not, like the core).
      return { healthy: true, logged_in: authed.has(r.key), ...(prefix.endsWith(':id') ? { cli_version: CLI_VERSION } : {}) }
    })
    on('GET', `${prefix}/session`, (req) => {
      const r = resolve(req)
      return isRuntime(r) ? pending(r.key) : r
    })
    on('POST', `${prefix}/sync`, async (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      await sleep(600)
      ready(r.key)
      return { synced: true }
    })
    on('POST', `${prefix}/start`, async (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      if (!ready(r.key)) return notSynchronized()
      await sleep(500)
      const open = pending(r.key)
      if (open) return open
      const s = { session_id: `fixture-session-${r.key}-${Date.now()}`, url: `https://claude.ai/oauth/authorize?preview=true&runtime=${r.key}`, expires_at: new Date(Date.now() + 600000).toISOString() }
      sessions.set(r.key, s)
      return s
    })
    on('POST', `${prefix}/complete`, async (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      await sleep(500)
      const open = pending(r.key)
      const body = req.body || {}
      if (!open || (body.session_id && body.session_id !== open.session_id)) return fault(400, 'session_not_found', 'No pending login, it expired, or it belongs to another session')
      const code = String(body.code || '')
      if (!/^[^#\s]+#[^#\s]+$/.test(code)) return fault(400, 'invalid_code', 'The code is not code#state or its state does not belong to this login')
      sessions.delete(r.key)
      if (code.startsWith('reject')) return fault(400, 'auth_rejected', 'Claude Code rejected the authorization code')
      authed.add(r.key)
      return { success: true }
    })
    on('POST', `${prefix}/cancel`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      sessions.delete(r.key)
      return { success: true }
    })
    on('POST', `${prefix}/logout`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      authed.delete(r.key)
      return { success: true }
    })
  }
  runtimeRoutes(`${base}/accounts/:id`, accountRuntime)
  runtimeRoutes(`${base}/drafts/:key`, draftRuntime)

  // Request debug logs of an account's Worker with levels (REQUEST-LOG-LEVELS-DESIGN §4).
  type LogLevel = 'off' | 'summary' | 'full'
  interface LogState { level: LogLevel; fullUntil: number | null; summaryBytes: number; fullBytes: number; requests: number }
  const requestLogs = new Map<string, LogState>()
  const logsOf = (key: string): LogState => {
    let s = requestLogs.get(key)
    if (!s) requestLogs.set(key, (s = { level: 'summary', fullUntil: null, summaryBytes: 3 << 20, fullBytes: 0, requests: 412 }))
    // Expiry returns to summary; the full content stays until its retention ends.
    if (s.level === 'full' && s.fullUntil !== null && s.fullUntil <= Date.now()) Object.assign(s, { level: 'summary', fullUntil: null })
    return s
  }
  const requestLogState = (key: string) => {
    const s = logsOf(key)
    return {
      enabled: s.level !== 'off', level: s.level, full_until: s.fullUntil === null ? null : new Date(s.fullUntil).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      levels: ['off', 'summary', 'full'],
      limits: {
        summary: { retention_hours: 168, storage_budget_bytes: 128 << 20, per_request_limit_bytes: 256 << 10 },
        full: { retention_hours: 24, storage_budget_bytes: 512 << 20, per_request_limit_bytes: 64 << 20 },
      },
      usage: { summary_bytes: s.summaryBytes, full_bytes: s.fullBytes, requests: s.requests },
      // Legacy top-level fields (full tier values) for older consoles.
      retention_hours: 24, per_request_limit_bytes: 64 << 20, storage_budget_bytes: 512 << 20, overflow_behavior: 'retain_partial_with_metadata',
      viewer: true,
      viewer_search: true,
      // Takes {"clear_all":true} (REQUEST-LOG-POLICY-DESIGN.md §3).
      clear_all: true,
    }
  }
  // The core's account setting and default rule (REQUEST-LOG-POLICY-DESIGN.md §4): stored in the core,
  // never forwarded to the Worker; the Worker state is attached (null until the container is ready).
  // Fixtures: #26 is full for two hours, #27 is off on its own, the rest follow the default.
  // SUB2API_MOCK_CCG_LEGACY_LOGS=1 answers like an older core (the Worker state itself, levels forwarded).
  const legacyLogs = !!process.env.SUB2API_MOCK_CCG_LEGACY_LOGS
  const logSettings = new Map<string, { level: LogLevel; fullUntil: number | null }>([
    ['26', { level: 'full', fullUntil: Date.now() + 2 * 3600000 }],
    ['27', { level: 'off', fullUntil: null }],
  ])
  const defaultLog = (): LogLevel => {
    const level = (config.request_logs as { level?: string } | undefined)?.level
    return level === 'off' || level === 'full' ? level : 'summary'
  }
  const policyState = (id: string, key: string) => {
    let s = logSettings.get(id)
    if (s?.level === 'full' && s.fullUntil !== null && s.fullUntil <= Date.now()) { logSettings.delete(id); s = undefined }
    const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'))
    return {
      setting: { level: s ? s.level : 'follow', full_until: iso(s?.fullUntil ?? null) },
      default: defaultLog(),
      effective: s ? s.level : defaultLog(),
      worker: ready(key) ? requestLogState(key) : null,
    }
  }
  on('GET', `${base}/accounts/:id/request-logs`, (req) => {
    const r = accountRuntime(req)
    if (!isRuntime(r)) return r
    if (!legacyLogs) return policyState(req.params.id, r.key)
    return !ready(r.key) ? notSynchronized() : requestLogState(r.key)
  })
  on('PUT', `${base}/accounts/:id/request-logs`, (req) => {
    const r = accountRuntime(req)
    if (!isRuntime(r)) return r
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}) as Record<string, unknown>
    const keys = Object.keys(body).sort().join(',')
    if (!legacyLogs) {
      const id = req.params.id
      if (keys === 'level' && body.level === 'follow') logSettings.delete(id)
      else if (keys === 'level' && (body.level === 'off' || body.level === 'summary')) logSettings.set(id, { level: body.level, fullUntil: null })
      else if (keys === 'full_for_hours,level' && body.level === 'full' && [1, 4, 24].includes(body.full_for_hours as number)) {
        logSettings.set(id, { level: 'full', fullUntil: Date.now() + (body.full_for_hours as number) * 3600000 })
      } else if ((keys === 'clear_full' && body.clear_full === true) || (keys === 'clear_all' && body.clear_all === true)) {
        // Forwarded to the Worker: unavailable until it runs.
        if (!ready(r.key)) return notSynchronized()
        const s = logsOf(r.key)
        if (body.clear_all) { Object.assign(s, { summaryBytes: 0, fullBytes: 0, requests: 0 }); mockLogs.set(r.key, []) } else s.fullBytes = 0
      } else return fail(400, 'invalid_argument', 'Send exactly one of {"level":"follow"|"off"|"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"clear_all":true}.')
      return policyState(id, r.key)
    }
    if (!ready(r.key)) return notSynchronized()
    const s = logsOf(r.key)
    const set = (level: LogLevel) => {
      if (level === 'off') Object.assign(s, { summaryBytes: 0, fullBytes: 0, requests: 0 })
      Object.assign(s, { level, fullUntil: null })
    }
    if (keys === 'enabled' && typeof body.enabled === 'boolean') set(body.enabled ? 'summary' : 'off')
    else if (keys === 'level' && (body.level === 'off' || body.level === 'summary')) set(body.level)
    else if (keys === 'full_for_hours,level' && body.level === 'full' && [1, 4, 24].includes(body.full_for_hours as number)) {
      Object.assign(s, { level: 'full', fullUntil: Date.now() + (body.full_for_hours as number) * 3600000, fullBytes: Math.max(s.fullBytes, 6 << 20) })
    } else if (keys === 'clear_full' && body.clear_full === true) s.fullBytes = 0
    else return fail(400, 'invalid_argument', 'Send exactly one of {"level":"off"}, {"level":"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"enabled":true|false}.')
    return requestLogState(r.key)
  })

  // Reading the logs (REQUEST-LOG-VIEWER-DESIGN.md §6): a fixed set per account.
  interface MockLog {
    id: string; request_id: string; time: string; duration_ms: number; status: number; stage: string; model: string; stream: boolean
    log_level: 'summary' | 'full'; error_type?: string; error?: string; log_status: string; test: boolean; attempt?: number; files: Record<string, Uint8Array>
    // Upstream capture (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3); absent on older logs.
    mode?: 'direct' | 'build'; client_session_id?: string; upstream_session_id?: string; body_sha256?: string; upstream_body_sha256?: string
    body_changed?: boolean; upstream_captured?: boolean; upstream_bytes?: number
    // Response capture metadata of a full log (REQUEST-LOG-ASYNC-DESIGN.md §4); only in its detail.
    response?: Record<string, unknown>
  }
  const mockLogs = new Map<string, MockLog[]>()
  const uuidOf = (seed: string) => {
    const h = createHash('sha256').update(seed).digest('hex')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
  }
  const enc = (v: string) => new TextEncoder().encode(v)
  const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
  const requestBody = () => enc(JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 32000, stream: true, system: [{ type: 'text', text: 'You are Claude Code…' }], messages: [{ role: 'user', content: '帮我看看这个报错 <script>alert(1)</script>' }] }))
  // What the CLI sent after the build rewrote it (or the same bytes in direct mode).
  const rewrittenBody = (session: string) => enc(JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 32000, stream: true, metadata: { user_id: JSON.stringify({ session_id: session }) }, system: [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=2.1.304; cch=00000;' }, { type: 'text', text: 'You are Claude Code, Anthropic\'s official CLI for Claude.' }, { type: 'text', text: 'You are Claude Code…' }], messages: [{ role: 'user', content: [{ type: 'text', text: '<system-reminder>…</system-reminder>' }, { type: 'text', text: '帮我看看这个报错 <script>alert(1)</script>' }] }] }))
  // The response as the Worker assembles it from the stream (REQUEST-LOG-ASYNC-DESIGN.md §4).
  const assembledResponse = (n: number) => enc(JSON.stringify({
    id: `msg_${n}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
    content: [
      { type: 'thinking', thinking: '先读一下报错堆栈……', signature: 'EqQBCkYIBxgCKkB' + 'a'.repeat(40) },
      { type: 'text', text: '好的，我先看一下这个报错 <b>不应渲染为 HTML</b>……' },
      { type: 'tool_use', id: `toolu_${n}`, name: 'Read', input: { file_path: '/workspace/src/main.ts' } },
    ],
    stop_reason: 'tool_use', stop_sequence: null,
    usage: { input_tokens: 18231, cache_read_input_tokens: 17984, output_tokens: 96 },
  }))
  // Logs 0–5 keep the assembled response.json; 6 could not be assembled (response.body, raw);
  // 7 dropped its response capture (queue full).
  const responseFile = (n: number, sse: string): Record<string, Uint8Array> => n === 6 ? { 'response.body': enc(sse) } : n === 7 ? {} : { 'response.json': assembledResponse(n) }
  const responseMeta = (n: number): Record<string, unknown> => n === 6
    ? { response_assembled: false }
    : n === 7 ? { response_assembled: false, response_capture: 'dropped', log_dropped_bytes: 81920 } : { response_assembled: true, response_events: 9 }
  const logFiles = (rid: string, n: number, upstream: Uint8Array | null): Record<string, Uint8Array> => {
    const sse = ['event: message_start', `data: {"type":"message_start","message":{"id":"msg_${n}","model":"claude-sonnet-4-6","usage":{"input_tokens":18231,"cache_read_input_tokens":17984}}}`, '',
      'event: content_block_delta', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"好的，我先看一下这个报错……"}}', '',
      'event: message_stop', 'data: {"type":"message_stop"}', '', ''].join('\n')
    // The first log's CLI output is over 1 MiB, to page through it.
    const cli = Array.from({ length: n === 0 ? 30000 : 3 }, (_, i) => JSON.stringify(i === 0
      ? { type: 'system', subtype: 'init', model: 'claude-sonnet-4-6', session_id: rid }
      : { type: 'assistant', message: { content: [{ type: 'text', text: `第 ${i} 段输出 <b>不应渲染为 HTML</b>` }] } })).join('\n') + '\n'
    return {
      'request.body': requestBody(),
      'build-components.json': enc(JSON.stringify({ level: 'low', system_blocks: 3, tools: ['Bash', 'Read', 'Edit', 'Write'], attachments: ['date', 'environment'] })),
      'effective-config.json': enc(JSON.stringify({ args: ['--print', '--output-format', 'stream-json'], model: 'claude-sonnet-4-6' })),
      'cli-stdout.jsonl': enc(cli),
      ...responseFile(n, sse),
      'upstream-1-request.body': new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0x02, 0xff, ...enc('binary payload')]),
      ...(upstream ? { 'upstream-request.body': upstream } : {}),
    }
  }
  const logsFor = (key: string): MockLog[] => {
    let list = mockLogs.get(key)
    if (list) return list
    list = []
    const now = Date.now()
    for (let n = 0; n < 120; n++) {
      const rid = n === 2 || n === 3 ? 'c0ffee00c0ffee00c0ffee00' : createHash('md5').update(key + n).digest('hex').slice(0, 24)
      const failed = n % 9 === 3
      const rejected = n % 17 === 5
      const full = n < 8
      // Logs 100+ predate the capture; n % 10 === 4 and rejected requests have no upstream record.
      const legacy = n >= 100
      const mode = n % 3 === 2 ? 'direct' as const : 'build' as const
      const captured = !legacy && !rejected && n % 10 !== 4
      // A build request is assembled again: its sent body always differs.
      const changed = mode === 'build' || n % 7 === 0
      const session = uuidOf(key + ':session:' + Math.floor(n / 6))
      const input = full ? requestBody() : enc(`${key}:${n}:incoming`)
      const sent = !captured ? null : changed ? (full ? rewrittenBody(session) : enc(`${key}:${n}:sent`)) : input
      const capture = legacy ? {} : {
        mode, client_session_id: session, body_sha256: sha256(input), upstream_captured: captured,
        ...(sent ? {
          upstream_session_id: mode === 'direct' ? session : uuidOf(key + ':cli:' + Math.floor(n / 6)),
          upstream_body_sha256: sha256(sent), body_changed: changed, upstream_bytes: sent.length,
        } : {}),
      }
      list.push({
        id: uuidOf(key + ':' + n), request_id: rid, time: new Date(now - n * 7 * 60000 - 4000).toISOString(), duration_ms: failed ? 900 : rejected ? 12 : 1200 + (n * 317) % 9000,
        status: failed ? 529 : rejected ? 400 : 200, stage: failed ? 'upstream' : rejected ? 'parse_request' : 'finished',
        model: n % 4 === 1 ? 'claude-opus-4-1' : 'claude-sonnet-4-6', stream: n % 5 !== 0, log_level: full ? 'full' : 'summary',
        error_type: failed ? 'overloaded_error' : rejected ? 'invalid_request_error' : undefined,
        error: failed ? 'Overloaded' : rejected ? 'messages: roles must alternate between "user" and "assistant"' : undefined,
        log_status: n === 0 ? 'truncated' : n === 7 ? 'partial' : 'complete', test: n === 11, attempt: n === 2 ? 2 : n === 3 ? 1 : undefined,
        files: full ? logFiles(rid, n, sent) : {},
        response: full ? responseMeta(n) : undefined,
        ...capture,
      })
    }
    mockLogs.set(key, list)
    return list
  }
  const logBytes = (files: Record<string, Uint8Array>) => 3072 + Object.values(files).reduce((a, f) => a + f.length, 0)
  const logAccount = (req: MockRequest) => {
    const r = accountRuntime(req)
    if (!isRuntime(r)) return r
    if (!ready(r.key)) return notSynchronized()
    // Only an older Worker refuses reads at its local off level (REQUEST-LOG-POLICY-DESIGN.md §3).
    if (legacyLogs && logsOf(r.key).level === 'off') return fail(409, 'conflict', 'Request logs are off for this account.', { reason: 'request_logs_off' })
    return r
  }
  on('GET', `${base}/accounts/:id/request-logs/requests`, (req) => {
    if (!hasPerm(caller(req), ['settings:read', 'account:read'])) return fail(403, 'permission_denied', 'settings:read or account:read is required')
    const r = logAccount(req)
    if (!isRuntime(r)) return r
    const q = req.query
    const limit = Number(q.limit || 50)
    // A usage record's own request ID: its log, made once.
    const logs = logsFor(r.key)
    if (q.request_id?.startsWith('req_') && !logs.some(l => l.request_id === q.request_id)) {
      logs.splice(1, 0, { ...logs[1], id: uuidOf(r.key + ':' + q.request_id), request_id: q.request_id })
    }
    // The search filters, checked like the core (design §3/§4).
    if (q.mode && q.mode !== 'direct' && q.mode !== 'build') return fail(400, 'invalid_argument', 'Invalid mode.')
    if (q.session_id && !/^[A-Za-z0-9_-]{1,128}$/.test(q.session_id)) return fail(400, 'invalid_argument', 'Invalid session_id.')
    if (q.sha256 && !/^[0-9a-fA-F]{64}$/.test(q.sha256)) return fail(400, 'invalid_argument', 'Invalid sha256.')
    if (q.changed && q.changed !== 'true' && q.changed !== 'false') return fail(400, 'invalid_argument', 'Invalid changed.')
    const sha = q.sha256?.toLowerCase()
    let list = logsFor(r.key).filter(l => (!q.request_id || l.request_id === q.request_id) && (!q.model || l.model === q.model) && (!q.level || l.log_level === q.level)
      && (!q.status || (q.status === 'error') === (l.status >= 400)) && (!q.since || l.time >= q.since)
      && (!q.mode || l.mode === q.mode) && (!q.session_id || l.client_session_id === q.session_id || l.upstream_session_id === q.session_id)
      && (!sha || l.body_sha256 === sha || l.upstream_body_sha256 === sha) && (!q.changed || (l.body_changed !== undefined && String(l.body_changed) === q.changed)))
    if (q.before) list = list.slice(list.findIndex(l => l.id === q.before.split('_')[1]) + 1)
    const page = list.slice(0, limit)
    const last = page[page.length - 1]
    return {
      items: page.map(({ files, upstream_bytes: _bytes, response: _response, ...l }) => ({ ...l, has_content: Object.keys(files).length > 0, bytes: logBytes(files) })),
      next: list.length > limit ? `${Date.parse(last.time)}000000_${last.id}` : null,
      active: q.before ? [] : [{ request_id: 'e11c0de0e11c0de0e11c0de0', started: new Date(Date.now() - 18000).toISOString(), stage: 'upstream' }],
    }
  })
  const findLog = (req: MockRequest, key: string) => logsFor(key).find(l => l.id === req.params.log)
  const logMissing = () => fail(404, 'not_found', 'The request log was not found; it may have expired.', { reason: 'request_log_not_found' })
  const fileKind = (name: string) => name === 'request.body' ? 'request' : name === 'response.body' || name === 'response.json' ? 'response' : name.startsWith('upstream') ? 'upstream' : name.startsWith('cli-') ? 'cli' : 'build'
  on('GET', `${base}/accounts/:id/request-logs/requests/:log`, (req) => {
    const who = caller(req)
    if (!hasPerm(who, ['settings:read', 'account:read', 'settings:manage'])) return fail(403, 'permission_denied', 'settings:read or account:read is required')
    const r = logAccount(req)
    if (!isRuntime(r)) return r
    const l = findLog(req, r.key)
    if (!l) return logMissing()
    const content = hasPerm(who, 'settings:manage')
    const t0 = Date.parse(l.time)
    const at = (ms: number) => new Date(t0 + ms).toISOString()
    const long = 'x'.repeat(300)
    const betas = ['claude-code-20250219', 'oauth-2025-04-20', 'interleaved-thinking-2025-05-14']
    const requestClass = l.mode === 'build' && l.request_id.endsWith('0') ? 'subagent' : 'main'
    const sent = l.upstream_body_sha256 !== undefined
    const upstreamMeta = l.mode === undefined ? {} : {
      mode: l.mode, client_session_id: l.client_session_id, body_sha256: l.body_sha256, upstream_captured: l.upstream_captured,
      ...(sent ? {
        upstream_attempts: l.attempt ?? 1, upstream_model: l.model, upstream_stream: l.stream, upstream_body_bytes: l.upstream_bytes, upstream_body_sha256: l.upstream_body_sha256,
        upstream_session_id: l.upstream_session_id, upstream_request_class: requestClass, upstream_betas: betas, body_changed: l.body_changed,
      } : {}),
    }
    // upstream-request.json as the CLI writes it; the core masks the secret headers again.
    const upstreamRequest = sent ? {
      schema: 1, mode: l.mode, attempts: l.attempt ?? 1, sent_at: at(812), method: 'POST', url: 'https://api.anthropic.com/v1/messages?beta=true',
      headers: {
        'accept': 'application/json', 'anthropic-beta': betas.join(','), 'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-version': '2023-06-01',
        'authorization': '[REDACTED]', 'content-type': 'application/json', 'user-agent': 'claude-cli/2.1.304 (external, cli)', 'x-app': 'cli',
        'x-claude-code-request-class': requestClass, 'x-claude-code-session-id': l.upstream_session_id, 'x-stainless-retry-count': '0',
      },
      body_encoding: 'identity', body_bytes: l.upstream_bytes, body_sha256: l.upstream_body_sha256, model: l.model, stream: l.stream,
    } : undefined
    return {
      metadata: {
        request_id: l.request_id, event: 'request_finished', stage: l.stage, status: l.status, http_status: l.status, model: l.model, stream: l.stream, log_level: l.log_level,
        message_count: 12, history_mode: 'prefix-hit', execution_mode: 'build', anthropic_beta: 'claude-code-20250219,oauth-2025-04-20', duration_ms: l.duration_ms, log_status: l.log_status,
        error_type: l.error_type, error: l.error, messages: [{ index: 0, role: 'user', content_type: 'string', text_bytes: 42 }],
        ...upstreamMeta,
        ...l.response,
      },
      events: [
        { time: at(0), event: 'request_received', detail: { request_id: l.request_id } },
        { time: at(3), event: 'request_level', detail: { level: 'low', relay_mode: 'build' } },
        { time: at(41), event: 'build_components', detail: { system_blocks: 3, tools: 4 } },
        { time: at(44), event: 'cli_started', detail: { version: '2.1.304' } },
        { time: at(812), event: 'upstream_request', detail: { attempt: 1 } },
        ...(l.status >= 400 ? [{ time: at(Math.max(l.duration_ms - 5, 0)), event: 'upstream_error', detail: { status: l.status, message: content ? long : long.slice(0, 256) } }] : []),
        { time: at(l.duration_ms), event: 'request_finished', detail: { stage: l.stage, status: l.status } },
      ],
      events_truncated: false,
      request_headers: { 'Content-Type': ['application/json'], 'Anthropic-Version': ['2023-06-01'], 'X-Api-Key': ['[REDACTED]'], 'X-Request-Id': [l.request_id] },
      response_headers: { 'Content-Type': [l.stream ? 'text/event-stream' : 'application/json'], 'Request-Id': [l.request_id] },
      files: Object.entries(l.files).map(([name, b]) => ({ name, bytes: b.length, kind: fileKind(name) })),
      content,
      ...(upstreamRequest ? { upstream_request: upstreamRequest } : {}),
    }
  })
  on('GET', `${base}/accounts/:id/request-logs/requests/:log/files/:name`, (req) => {
    if (!hasPerm(caller(req), 'settings:manage')) return fail(403, 'permission_denied', 'settings:manage is required')
    const r = logAccount(req)
    if (!isRuntime(r)) return r
    const l = findLog(req, r.key)
    const file = l?.files[req.params.name]
    if (!l || !file) return logMissing()
    const download = req.query.download === '1'
    const offset = download ? 0 : Number(req.query.offset || 0)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > file.length) return fail(400, 'invalid_argument', 'Invalid offset.')
    const part = download ? file : file.subarray(offset, offset + (1 << 20))
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
      'X-Log-File-Size': String(file.length), 'X-Log-Offset': String(offset), 'X-Log-Length': String(part.length),
    }
    if (download) headers['Content-Disposition'] = `attachment; filename="account-${req.params.id}-${l.id}-${req.params.name}"`
    return { __status: 200, __headers: headers, __bytes: part, body: undefined }
  })

  /** Proxy check of POST / PUT drafts, like the core: none → direct egress, unknown → proxy_not_found, disabled → proxy_disabled. */
  const draftProxyError = (id: unknown) => {
    if (id == null) return null
    const s = typeof id === 'number' ? mockProxyStatus(id) : undefined
    if (!s) return fault(400, 'proxy_not_found', 'The proxy does not exist')
    return s === 'disabled' ? fault(400, 'proxy_disabled', 'The proxy is disabled') : null
  }
  const canDraft = (req: MockRequest) => hasPerm(caller(req), ['settings:manage', 'account:create', 'account:own:create'])
  on('POST', `${base}/drafts`, async (req) => {
    if (!canDraft(req)) return fail(403, 'permission_denied', 'settings:manage or account:create is required')
    if (!configured()) return notConfigured()
    const id = req.body?.proxy_id
    const bad = draftProxyError(id)
    if (bad) return bad
    await sleep(400)
    sweep()
    const key = 'd' + randomBytes(8).toString('hex')
    const now = Date.now()
    drafts.set(key, { proxy_id: id, created_by: caller(req).id, created_at: now, last_seen: now, account_id: null, for_account: null })
    born.set(key, now)
    converging.set(key, 'creating')
    console.log(`[mock ccgateway] created draft ${key} (proxy #${id})`)
    return { __status: 201, body: { data: { key } } }
  })
  on('PUT', `${base}/drafts/:key`, async (req) => {
    const r = draftRuntime(req)
    if (!isRuntime(r)) return r
    // A re-authorization draft always runs with the account's proxy.
    if (drafts.get(r.key)!.for_account != null) return fault(404, 'draft_not_found', 'The draft runtime does not exist')
    const id = req.body?.proxy_id
    const bad = draftProxyError(id)
    if (bad) return bad
    await sleep(300)
    drafts.get(r.key)!.proxy_id = id
    // The container is rebuilt with the new egress; the login (data volume) is kept.
    born.set(r.key, Date.now())
    converging.set(r.key, 'pending')
    console.log(`[mock ccgateway] draft ${r.key} switched to proxy #${id}`)
    return { key: r.key }
  })
  on('DELETE', `${base}/drafts/:key`, (req) => {
    const r = draftRuntime(req)
    if (!isRuntime(r)) return r
    drafts.delete(r.key)
    removeRuntime(r.key)
    console.log(`[mock ccgateway] deleted draft ${r.key}`)
    return noContent()
  })

  /** Open (not adopted) re-authorization draft of an account. */
  const openReauth = (id: number) => [...drafts].find(([, d]) => d.for_account === id && d.account_id == null)?.[0] || null
  const isManagedCcg = (a: any) => a.plugin_key === 'ccgateway' && a.type === 'managed'
  on('POST', `${base}/accounts/:id/reauthorize`, async (req) => {
    const r = mockCcgReauthAccount(req)
    if (!('a' in r)) return r
    const a = r.a
    if (!isManagedCcg(a)) return fault(400, 'api_key_account', 'Only Claude Code OAuth (managed) accounts are re-authorized')
    if (!configured()) return notConfigured()
    sweep()
    const open = openReauth(a.id)
    if (open) {
      const d = drafts.get(open)!
      const who = caller(req)
      // Like the core (CONTRACTS §49.17): a caller who cannot see the open draft takes it over;
      // the draft follows the account's current proxy.
      if (d.created_by !== who.id && !hasPerm(who, 'settings:manage')) d.created_by = who.id
      if (d.proxy_id !== a.proxy_id && a.proxy_id != null) { d.proxy_id = a.proxy_id; born.set(open, Date.now()); converging.set(open, 'pending') }
      d.last_seen = Date.now()
      console.log(`[mock ccgateway] account #${a.id} re-authorization resumed (${open})`)
      return { key: open }
    }
    const bad = draftProxyError(a.proxy_id)
    if (bad) return bad
    await sleep(400)
    const key = 'd' + randomBytes(8).toString('hex')
    const now = Date.now()
    drafts.set(key, { proxy_id: a.proxy_id, created_by: caller(req).id, created_at: now, last_seen: now, account_id: null, for_account: a.id })
    born.set(key, now)
    converging.set(key, 'creating')
    console.log(`[mock ccgateway] account #${a.id} re-authorization draft ${key}`)
    return { __status: 201, body: { data: { key } } }
  })
  on('POST', `${base}/accounts/:id/reauthorize/:key/commit`, async (req) => {
    const r = mockCcgReauthAccount(req)
    if (!('a' in r)) return r
    const a = r.a
    sweep()
    const key = req.params.key
    const d = drafts.get(key)
    if (!d || d.for_account !== a.id || d.account_id != null) return fault(400, 'draft_not_found', 'The re-authorization draft does not exist')
    if (!authed.has(key) || !ready(key)) return fault(400, 'draft_not_authorized', 'The re-authorization draft is not signed in to Claude')
    await sleep(500)
    const id = String(a.id)
    const old = adoptedBy.get(id) || id
    removeRuntime(old)
    if (old !== id) drafts.delete(old)
    d.account_id = a.id
    adoptedBy.set(id, key)
    console.log(`[mock ccgateway] account #${a.id} re-authorized: ${old} retired, now on ${key}`)
    return mockClearAccountHistory(a)
  })

  // Runtime images on GHCR, installed over SSH by the core. Starts with an older install (update
  // available); an SSH host containing "fail" makes the install fail with image_pull_failed.
  const digest = (seed: string) => createHash('sha256').update(seed).digest('hex')
  let expected = {
    controller: `ghcr.io/sup2api/ccgateway-controller:0.2.0@sha256:${digest('controller-0.2.0')}`,
    app: `ghcr.io/sup2api/ccgateway-app:0.2.0@sha256:${digest('app-0.2.0')}`,
    egress: `ghcr.io/sup2api/ccgateway-egress:0.2.0@sha256:${digest('egress-0.2.0')}`
  }
  let installed: { controller_image: string; app_image: string; egress_image: string; version: string } | null = {
    controller_image: `ghcr.io/sup2api/ccgateway-controller:0.1.9@sha256:${digest('controller-0.1.9')}`,
    app_image: expected.app,
    egress_image: `ghcr.io/sup2api/ccgateway-egress:0.1.9@sha256:${digest('egress-0.1.9')}`,
    version: '0.1.9'
  }
  // Images bundled in the ccgateway plugin package (§53.10). A controller host containing "nobundle"
  // stands for a package built without images (bundled: null).
  const bundled = {
    version: '0.1.16',
    images: { app: 'ccgateway-app:0.1.16', egress: 'ccgateway-egress:0.1.16', controller: 'ccgateway-controller:0.1.16', gateway: 'caddy:2.11.7-alpine' }
  }
  const runtimeOut = () => ({
    expected,
    installed,
    up_to_date: !!installed && installed.controller_image === expected.controller && installed.app_image === expected.app && installed.egress_image === expected.egress,
    bundled: String(config.host || '').includes('nobundle') ? null : bundled
  })
  on('GET', `${base}/runtime`, () => (config.mode === 'controller' ? runtimeOut() : { ...runtimeOut(), installed: null, reason: 'controller_not_configured' }))
  on('POST', `${base}/runtime/install`, async () => {
    if (config.mode !== 'controller') return fault(400, 'controller_not_configured', 'No controller is connected')
    await sleep(2500)
    if (String(config.host || '').includes('fail')) return fault(503, 'image_pull_failed', 'Pulling ghcr.io/sup2api/ccgateway-app failed: unauthorized')
    installed = { controller_image: expected.controller, app_image: expected.app, egress_image: expected.egress, version: '0.2.0' }
    console.log('[mock ccgateway] runtime installed 0.2.0')
    return runtimeOut()
  })
  // Pushes the bundled images the controller lacks, applies them (the app image updates the existing
  // workers in place) and reports per role. A controller host containing "pushfail" fails the egress image.
  on('POST', `${base}/runtime/bundled`, async () => {
    if (config.mode !== 'controller') return fault(400, 'controller_not_configured', 'No controller is connected')
    if (String(config.host || '').includes('nobundle')) return fault(400, 'no_bundled_images', 'The active ccgateway plugin package carries no runtime images.')
    if (!installed) return fault(503, 'controller_unhealthy', 'The controller is not healthy')
    await sleep(3000)
    const current = { app: installed.app_image, egress: installed.egress_image, controller: installed.controller_image } as Record<string, string>
    const results = (['app', 'egress', 'controller'] as const).map(role => {
      const ref = bundled.images[role]
      if (current[role] === ref) return { role, ref, status: 'present' }
      if (role === 'egress' && String(config.host || '').includes('pushfail')) return { role, ref, status: 'failed', reason: 'load_failed' }
      current[role] = ref
      expected = { ...expected, [role]: ref }
      return { role, ref, status: 'loaded' }
    })
    installed = { controller_image: current.controller, app_image: current.app, egress_image: current.egress, version: '0.1.16' }
    const appLoaded = results.some(r => r.role === 'app' && r.status === 'loaded')
    const workers = appLoaded
      ? { image: bundled.images.app, results: [...adoptedBy.entries()].map(([id, key]) => ({ key, account_id: Number(id), status: 'updated', previous_sha256: digest(`worker-old-${id}`), sha256: digest('worker-0.1.16') })) }
      : undefined
    console.log('[mock ccgateway] bundled images pushed', results.map(r => `${r.role}:${r.status}`).join(' '))
    return { results, ...(workers ? { workers } : {}), runtime: runtimeOut() }
  })

  registerCcgDrafts({
    check(key, who) {
      sweep()
      const d = drafts.get(key)
      if (!d || d.account_id != null || d.for_account != null || (d.created_by !== who.id && !hasPerm(who, 'settings:manage'))) return 'draft_not_found'
      return authed.has(key) && ready(key) ? '' : 'draft_not_authorized'
    },
    adopt(key, accountId) {
      const d = drafts.get(key)
      if (!d) return
      d.account_id = accountId
      adoptedBy.set(String(accountId), key)
      console.log(`[mock ccgateway] account #${accountId} adopted draft ${key}`)
    }
  })
}
