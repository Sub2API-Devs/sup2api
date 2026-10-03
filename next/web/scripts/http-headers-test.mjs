// Run: node scripts/http-headers-test.mjs
// Exercise the real client with deterministic HTTP responses; no live service.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const moduleURL = source => 'data:text/javascript;base64,'+Buffer.from(compile(source)).toString('base64')
const routes = moduleURL(await readFile(new URL('../packages/host/src/routes.ts', import.meta.url), 'utf8'))
const source = (await readFile(new URL('../packages/host/src/http.ts', import.meta.url), 'utf8')).replace("from './routes'", `from '${routes}'`)
const { requestWithHeaders, request, session, configureHttp, ApiError } = await import(moduleURL(source))
const response = (data, status=200, entry='') => new Response(JSON.stringify(status===200 ? {data} : {error:data}), {status,headers:entry ? {'X-Sub2api-Entry-Node':entry} : {}})
const originalFetch = globalThis.fetch
try {
  let calls=0
  globalThis.fetch=async()=>{calls++;return response({core_node_id:'core-b',core_boot_id:'boot-b'},200,'gateway-a')}
  const direct=await requestWithHeaders('GET','/system/version')
  assert.equal(calls,1)
  assert.equal(direct.headers.get('x-sub2api-entry-node'),'gateway-a')
  assert.equal(direct.data.core_node_id,'core-b')
  assert.deepEqual(await request('GET','/system/version'),{core_node_id:'core-b',core_boot_id:'boot-b'})

  session.set({access_token:'old',refresh_token:'refresh',expires_at:Date.now()+60000})
  calls=0
  globalThis.fetch=async(url,options)=>{
    calls++
    if(String(url).endsWith('/auth/refresh'))return response({access_token:'new',refresh_token:'next',expires_in:3600})
    if(options.headers.Authorization==='Bearer old')return response({code:'unauthenticated',message:'expired'},401,'untrusted-first-attempt')
    return response({core_node_id:'core-final'},200,'gateway-final')
  }
  const refreshed=await requestWithHeaders('GET','/system/version')
  assert.equal(calls,3)
  assert.equal(refreshed.headers.get('x-sub2api-entry-node'),'gateway-final')
  assert.equal(refreshed.data.core_node_id,'core-final')

  configureHttp({stepUp:async()=>({token:'step-token',expiresIn:60})})
  calls=0
  globalThis.fetch=async(_url,options)=>{calls++;return options.headers['X-Step-Up-Token'] ? response({core_node_id:'core-step'},200,'gateway-step') : response({code:'step_up_required',message:'step up'},403,'denied-header')}
  const stepped=await requestWithHeaders('GET','/system/version')
  assert.equal(calls,2)
  assert.equal(stepped.headers.get('x-sub2api-entry-node'),'gateway-step')

  let callbackCalled=false
  globalThis.fetch=async()=>response({code:'unavailable',message:'down'},503,'must-not-be-trusted')
  await assert.rejects(requestWithHeaders('GET','/system/version',{onSuccessHeaders:()=>{callbackCalled=true}}),ApiError)
  assert.equal(callbackCalled,false)
  globalThis.fetch=async()=>response({core_node_id:'core-legacy'})
  assert.equal((await requestWithHeaders('GET','/system/version')).headers.get('x-sub2api-entry-node'),null)
  console.log('PASS: same response, unchanged data unwrapping, final auth/step-up retry, failed headers ignored, legacy header absent')
} finally {globalThis.fetch=originalFetch;session.clear()}
