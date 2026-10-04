// Dev-only CCGateway fixture; never bundled or connected to a real gateway.
import { fail, on } from './router'
import { mockAccount } from './accounts'
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

  // Per-account containers (CCGateway accounts of mock/accounts.ts: #25 authorized, #26 not yet,
  // #27 has no proxy → blocked). Like the core:
  // - a disabled account or one without a proxy is "blocked" with a reason (status and sync);
  // - other failures are 503; a wrong code is a 400 with the container's reason;
  // - a container is ready ~4 s after it was first synced or seen;
  // - start returns the pending session if there is one; GET session resumes it; cancel /
  //   complete work without a session_id.
  const READY_MS = 4000
  const born = new Map<string, number>([['25', 0], ['26', 0]]), authed = new Set<string>(['25'])
  const sessions = new Map<string, { session_id: string; url: string; expires_at: string }>()
  const configured = () => !!config.account_runtimes && (config.mode === 'ssh' || config.mode === 'local') && !!config.has_admin_key
  const unavailable = () => fail(503, 'unavailable', 'service unavailable')
  const ready = (id: string) => { if (!born.has(id)) born.set(id, Date.now()); return Date.now() - born.get(id)! >= READY_MS }
  const blockedBy = (id: string): string => {
    const a = mockAccount(Number(id))
    if (!a || a.status === 'disabled') return 'account_disabled'
    if (a.proxy_id == null) return 'no_proxy'
    return ''
  }
  const pending = (id: string) => {
    const s = sessions.get(id)
    if (s && Date.parse(s.expires_at) <= Date.now()) sessions.delete(id)
    return sessions.get(id) || null
  }
  const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
  on('GET',`${base}/accounts/:id/status`,({params})=>{
    if(!configured()) return unavailable()
    const reason=blockedBy(params.id)
    if(reason){born.delete(params.id);return {account_id:params.id,container:'',status:'blocked',revision:'',reason}}
    return {account_id:params.id,status:ready(params.id)?'ready':'creating',container:`ccg-account-${params.id}`}
  })
  on('GET',`${base}/accounts/:id/health`,({params})=>configured()&&!blockedBy(params.id)&&ready(params.id)?{healthy:true,logged_in:authed.has(params.id)}:unavailable())
  on('GET',`${base}/accounts/:id/session`,({params})=>configured()?pending(params.id):unavailable())
  on('POST',`${base}/accounts/:id/sync`,async({params})=>{
    if(!configured()) return unavailable()
    await sleep(600)
    const reason=blockedBy(params.id)
    if(reason) return {synced:true,status:'blocked',reason}
    ready(params.id)
    return {synced:true}
  })
  on('POST',`${base}/accounts/:id/start`,async({params})=>{
    if(!configured()||blockedBy(params.id)||!ready(params.id)) return unavailable()
    await sleep(500)
    const open=pending(params.id)
    if(open) return open
    const s={session_id:`fixture-session-${params.id}-${Date.now()}`,url:`https://claude.ai/oauth/authorize?preview=true&account=${params.id}`,expires_at:new Date(Date.now()+600000).toISOString()}
    sessions.set(params.id,s)
    return s
  })
  on('POST',`${base}/accounts/:id/complete`,async({params,body})=>{
    if(!configured()) return unavailable()
    await sleep(500)
    const open=pending(params.id)
    if(!open||(body?.session_id&&body.session_id!==open.session_id)) return fail(400,'invalid_argument','授权会话不存在或已过期，请重新获取授权链接')
    if(!/^[^#\s]+#[^#\s]+$/.test(String(body?.code||''))) return fail(400,'invalid_argument','授权码格式不正确：请粘贴页面显示的完整 code#state')
    sessions.delete(params.id)
    authed.add(params.id)
    return {ok:true}
  })
  on('POST',`${base}/accounts/:id/cancel`,({params})=>{sessions.delete(params.id);return {ok:true}})
  on('POST',`${base}/accounts/:id/logout`,({params})=>{authed.delete(params.id);return {ok:true}})
}
