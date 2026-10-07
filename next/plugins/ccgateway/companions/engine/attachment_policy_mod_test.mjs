import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = readFileSync(new URL('../mod/hooks/register.js', import.meta.url), 'utf8');
const { register, filterEnvironmentFields } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
async function setup(policy) {
 const hooks={};register((name,fn)=>{hooks[name]=fn});
 const $={env:{get:async key=>key==='CCGATEWAY_ATTACHMENT_SOURCE'?'client':'fixture'},http:{fetch:async(_url,options)=>({ok:true,text:options?.method?'{}':JSON.stringify({attachments:policy})})}};
 await hooks['session.start']($,{},async e=>e);
 return e=>hooks['prompt.attachment']($,e,async e=>e);
}
test('per-type sources and both unknown origins',async()=>{
 for(const kind of ['environment','model','date','session_context','total_tokens_reminder']) {
  for(const selected of ['client','gateway','both']) {
   const run=await setup({default_source:'client',sources:{[kind]:selected},unknown_client:'ignore',unknown_gateway:'ignore'});
   for(const origin of ['engine','plugin']) {
    const e={type:kind,origin:{kind:origin},text:'fixture'};
    const result=await run(e);
    assert.equal(result.text,selected==='both'||selected===(origin==='engine'?'gateway':'client')?'fixture':null);
   }
  }
 }
 for(const setting of ['pass','ignore']) {
  const run=await setup({unknown_client:setting,unknown_gateway:setting});
  for(const origin of ['engine','plugin']) {
   assert.equal((await run({type:'future_kind',origin:{kind:origin},text:'unknown'})).text,setting==='pass'?'unknown':null);
  }
  for(const type of ['deferred_tools_delta','hook_additional_context']) {
   assert.equal((await run({type,origin:{kind:'engine'},text:'required'})).text,'required');
  }
 }
});

test('environment fields override whole-block source and fall back when absent', () => {
 const text='# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /work\n - Platform: linux\n - Shell: bash\n';
 for(const keepDefault of [true,false]) for(const cwd of ['client','gateway']) for(const platform of ['client','gateway']) {
  const policy={environment_fields:{workingDirectory:cwd,platform},client_environment_fields:{workingDirectory:true,platform:true}};
  const out=filterEnvironmentFields(text,policy,keepDefault)||'';
  assert.equal(out.includes('Primary working directory:'),cwd==='gateway');
  assert.equal(out.includes(' - Platform:'),platform==='gateway');
  assert.equal(out.includes(' - Shell:'),keepDefault);
 }
 const fallback=filterEnvironmentFields(text,{environment_fields:{workingDirectory:'client',platform:'client'}},false);
 assert.ok(fallback.includes('/work'));assert.ok(fallback.includes('linux'));
});
