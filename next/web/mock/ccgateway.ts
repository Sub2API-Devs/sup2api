// Dev-only CCGateway fixture; never bundled or connected to a real gateway.
import { fail, on } from './router'
if (process.env.SUB2API_MOCK_CCGATEWAY) {
  const base = '/system/ccgateway'
  let config: Record<string, unknown> = {mode:'disabled',host:'docker.example.test',port:22,user:'debian',auth_mode:'password',host_key_fingerprint:'',has_password:false,has_private_key:false,has_passphrase:false,has_admin_key:true,has_api_key:true}
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
  // Per-account containers: ready a few seconds after first seen, then the code flow.
  const born = new Map<string, number>(), authed = new Set<string>()
  const acc = (id: string) => { if (!born.has(id)) born.set(id, Date.now()); return Date.now() - born.get(id)! > 6000 }
  on('GET',`${base}/accounts/:id/status`,({params})=>({status:acc(params.id)?'ready':'creating',container:`ccg-account-${params.id}`}))
  on('GET',`${base}/accounts/:id/health`,({params})=>({healthy:true,logged_in:authed.has(params.id)}))
  on('POST',`${base}/accounts/:id/sync`,({params})=>{acc(params.id);return {ok:true}})
  on('POST',`${base}/accounts/:id/start`,()=>({session_id:'fixture-session',url:'https://claude.ai/oauth/authorize?preview=true',expires_at:new Date(Date.now()+600000).toISOString()}))
  on('POST',`${base}/accounts/:id/complete`,({params})=>{authed.add(params.id);return {ok:true}})
  on('POST',`${base}/accounts/:id/cancel`,()=>({ok:true}))
}
