// Dev-only CCGateway fixture; never bundled or connected to a real gateway.
import { createHash, randomBytes } from 'node:crypto'
import { fail, noContent, on, type MockRequest } from './router'
import { mockAccount, registerCcgDrafts } from './accounts'
import { caller, hasPerm } from './core'
import { mockProxyStatus } from './resources'
if (process.env.SUB2API_MOCK_CCGATEWAY) {
  const base = '/system/ccgateway'
  // Per-account containers ("一账号一容器") over SSH, so the account editor flow works out of the box;
  // switch them off in the CCGateway settings to see the editor's "not set up" path.
  let config: Record<string, unknown> = {account_runtimes:true,mode:'ssh',host:'docker.example.test',port:22,user:'debian',auth_mode:'password',host_key_fingerprint:'SHA256:previewFingerprintOnly',has_password:true,has_private_key:false,has_passphrase:false,has_admin_key:true,has_api_key:true}
  let proxy = { mode:'inherit',configured:false,url_redacted:'',revision:1 }
  let logged = false
  on('GET',`${base}/remote-config`,()=>config)
  on('PUT',`${base}/remote-config`,({body})=>{
    const { password,private_key,passphrase,admin_key,api_key,...publicFields }=body
    config={...config,...publicFields,has_password:!!password||config.has_password,has_private_key:!!private_key||config.has_private_key,has_passphrase:!!passphrase||config.has_passphrase,has_admin_key:!!admin_key||config.has_admin_key,has_api_key:!!api_key||config.has_api_key}
    return config
  })
  on('POST',`${base}/remote-fingerprint`,()=>({fingerprint:'SHA256:previewFingerprintOnly',verified:false}))
  on('POST',`${base}/remote-test`,()=>({output:'[mock] Docker 28.0.1 / Compose v2.35.1'}))
  on('POST',`${base}/remote-action`,({body})=>({output:`[mock] ccgateway ${body.action}: completed; no real command executed`}))
  on('GET',`${base}/proxy`,()=>proxy)
  on('PUT',`${base}/proxy`,({body})=>{
    let endpoint=''
    if(body.mode==='proxy'){try{endpoint=body.url?new URL(body.url).origin:proxy.url_redacted}catch{return fail(400,'invalid','Invalid proxy URL')}}
    proxy={mode:body.mode,configured:body.mode==='proxy',url_redacted:endpoint,revision:proxy.revision+1};return proxy
  })
  on('GET',`${base}/status`,()=>({healthy:true,logged_in:logged,auth_method:logged?'oauth':'none'}))
  on('POST',`${base}/auth/start`,()=>({session_id:'fixture-session',url:'https://claude.ai/oauth/authorize?preview=true',expires_at:new Date(Date.now()+600000).toISOString()}))
  on('POST',`${base}/auth/complete`,()=>{logged=true;return {ok:true}})
  on('POST',`${base}/auth/cancel`,()=>({ok:true}))
  on('POST',`${base}/auth/logout`,()=>{logged=false;return {ok:true}})
  on('POST',`${base}/connect`,()=>({id:99001}))

  // Per-account containers and drafts (docs/CCGATEWAY-DRAFT-RUNTIMES.md). Runtimes are keyed like
  // the core: an account id, or a draft key (d + 16 hex) that a new account adopts on save.
  // CCGateway accounts of mock/accounts.ts: #25 authorized, #26 not yet, #27 has no proxy → blocked.
  // Like the core:
  // - errors carry an English message and the cause code in details.reason;
  // - a disabled account / a missing or disabled proxy is "blocked" with that reason (status and sync);
  // - a runtime is ready ~4 s after it was created, synced or switched to another proxy;
  // - start returns the pending session if there is one; GET session resumes it;
  // - a code without '#' is invalid_code (session kept), one starting with "reject" is auth_rejected
  //   (session ended), anything else signs the container in;
  // - drafts are only visible to their creator (or settings:manage); every draft call touches it and
  //   drafts untouched for 15 minutes or older than 2 hours are swept.
  const READY_MS = 4000
  const born = new Map<string, number>([['25', 0], ['26', 0]]), authed = new Set<string>(['25'])
  const sessions = new Map<string, { session_id: string; url: string; expires_at: string }>()
  interface Draft { proxy_id: number; created_by: number; created_at: number; last_seen: number; account_id: number | null }
  const drafts = new Map<string, Draft>()
  /** What a runtime that is not ready yet reports: a first build or a rebuild (proxy switched). */
  const converging = new Map<string, 'creating' | 'pending'>()
  /** Runtime key of an account that adopted a draft. */
  const adoptedBy = new Map<string, string>()
  const configured = () => !!config.account_runtimes && (config.mode === 'ssh' || config.mode === 'local') && !!config.has_admin_key
  const fault = (status: number, reason: string, message: string) => fail(status, status === 400 ? 'invalid_argument' : status === 404 ? 'not_found' : 'unavailable', message, { reason })
  const notConfigured = () => fault(503, 'not_configured', 'Per-account runtimes are disabled or no Docker connection is configured')
  const notSynchronized = () => fault(503, 'not_synchronized', 'The runtime is not ready yet')
  const ready = (key: string) => { if (!born.has(key)) born.set(key, Date.now()); return Date.now() - born.get(key)! >= READY_MS }
  const proxyBlock = (id: number | null | undefined): string => {
    if (id == null) return 'no_proxy'
    const s = mockProxyStatus(id)
    if (!s) return 'no_proxy'
    return s === 'disabled' ? 'proxy_disabled' : ''
  }
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

  /** A resolved runtime: its key and why it is blocked ('' when it may run), or an error response. */
  type Runtime = { key: string; blocked: string }
  type Resolve = (req: MockRequest) => Runtime | { __status: number; body: unknown }
  const accountRuntime: Resolve = ({ params }) => {
    if (!configured()) return notConfigured()
    const a = mockAccount(Number(params.id))
    if (!a) return fault(404, 'not_found', 'account not found')
    const blocked = a.status === 'disabled' ? 'account_disabled' : proxyBlock(a.proxy_id)
    return { key: adoptedBy.get(params.id) || params.id, blocked }
  }
  const draftRuntime: Resolve = (req) => {
    sweep()
    const d = drafts.get(req.params.key)
    const who = caller(req)
    if (!d || d.account_id != null || (d.created_by !== who.id && !hasPerm(who, 'settings:manage'))) return fault(404, 'draft_not_found', 'The draft runtime does not exist')
    if (!configured()) return notConfigured()
    d.last_seen = Date.now()
    return { key: req.params.key, blocked: proxyBlock(d.proxy_id) }
  }
  const isRuntime = (r: Runtime | { __status: number; body: unknown }): r is Runtime => !('__status' in r)

  /** status / health / session / sync / start / complete / cancel / logout of one runtime kind. */
  function runtimeRoutes(prefix: string, resolve: Resolve) {
    on('GET', `${prefix}/status`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      if (r.blocked) { born.delete(r.key); return { container: '', status: 'blocked', reason: r.blocked } }
      return { status: ready(r.key) ? 'ready' : converging.get(r.key) || 'creating', container: `ccg-${r.key}-app` }
    })
    on('GET', `${prefix}/health`, (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      return !r.blocked && ready(r.key) ? { healthy: true, logged_in: authed.has(r.key) } : notSynchronized()
    })
    on('GET', `${prefix}/session`, (req) => {
      const r = resolve(req)
      return isRuntime(r) ? pending(r.key) : r
    })
    on('POST', `${prefix}/sync`, async (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      await sleep(600)
      if (r.blocked) return { synced: true, status: 'blocked', reason: r.blocked }
      ready(r.key)
      return { synced: true }
    })
    on('POST', `${prefix}/start`, async (req) => {
      const r = resolve(req)
      if (!isRuntime(r)) return r
      if (r.blocked || !ready(r.key)) return notSynchronized()
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

  /** Proxy check of POST / PUT drafts, like the core: missing → no_proxy, unknown → proxy_not_found, disabled → proxy_disabled. */
  const draftProxyError = (id: unknown) => {
    if (id == null) return fault(400, 'no_proxy', 'A proxy is required')
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
    drafts.set(key, { proxy_id: id, created_by: caller(req).id, created_at: now, last_seen: now, account_id: null })
    born.set(key, now)
    converging.set(key, 'creating')
    console.log(`[mock ccgateway] created draft ${key} (proxy #${id})`)
    return { __status: 201, body: { data: { key } } }
  })
  on('PUT', `${base}/drafts/:key`, async (req) => {
    const r = draftRuntime(req)
    if (!isRuntime(r)) return r
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

  // Runtime images on GHCR, installed over SSH by the core. Starts with an older install (update
  // available); an SSH host containing "fail" makes the install fail with image_pull_failed.
  const digest = (seed: string) => createHash('sha256').update(seed).digest('hex')
  const expected = {
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
  const runtimeOut = () => ({
    expected,
    installed,
    up_to_date: !!installed && installed.controller_image === expected.controller && installed.app_image === expected.app && installed.egress_image === expected.egress
  })
  on('GET', `${base}/runtime`, () => (config.mode === 'ssh' ? runtimeOut() : { ...runtimeOut(), installed: null, reason: 'ssh_failed' }))
  on('POST', `${base}/runtime/install`, async () => {
    if (config.mode !== 'ssh') return fault(400, 'ssh_failed', 'No SSH connection is configured')
    await sleep(2500)
    if (String(config.host || '').includes('fail')) return fault(503, 'image_pull_failed', 'Pulling ghcr.io/sup2api/ccgateway-app failed: unauthorized')
    installed = { controller_image: expected.controller, app_image: expected.app, egress_image: expected.egress, version: '0.2.0' }
    console.log('[mock ccgateway] runtime installed 0.2.0')
    return runtimeOut()
  })

  registerCcgDrafts({
    check(key, who) {
      sweep()
      const d = drafts.get(key)
      if (!d || d.account_id != null || (d.created_by !== who.id && !hasPerm(who, 'settings:manage'))) return 'draft_not_found'
      return authed.has(key) && ready(key) && !proxyBlock(d.proxy_id) ? '' : 'draft_not_authorized'
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
