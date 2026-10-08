import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=readFileSync(new URL('../mod/hooks/register.js',import.meta.url),'utf8');
const {register}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function fixture(endThrows=false) {
 const hooks={}, events=[]; register((name,fn)=>hooks[name]=fn);
 const $={env:{get:async()=> 'fixture'},http:{fetch:async(_,options)=>{
  if(!options?.body)return {ok:true,text:JSON.stringify({main_request_scope:true})};
  const event=JSON.parse(options.body).event;events.push(event);
  if(event==='main_request_end'&&endThrows)throw new Error('cleanup transport failed');
  return {ok:event!=='main_request_end'};
 }}};
 await hooks['session.start']($,{},async e=>e);
 return {events,run:next=>hooks['turn.step']($,{},next)};
}
test('successful next still rejects failed end lease',async()=>{
 const f=await fixture();const run=f.run(async function*(){return 'complete';});
 await assert.rejects(run.next(),/scope rejected/);
 assert.deepEqual(f.events,['ready','main_request_begin','main_request_end']);
});
test('original thrown object survives end network failure',async()=>{
 const f=await fixture(true), original={fixture:'original'};
 await assert.rejects(f.run(async function*(){throw original;}).next(),e=>e===original);
 assert.deepEqual(f.events,['ready','main_request_begin','main_request_end']);
});
test('consumer return still runs and validates end lease',async()=>{
 const f=await fixture();let closed=false;
 const run=f.run(async function*(){try{yield 1;yield 2;}finally{closed=true;}});
 assert.equal((await run.next()).value,1);
 await assert.rejects(run.return(),/scope rejected/);
 assert.equal(closed,true);
 assert.deepEqual(f.events,['ready','main_request_begin','main_request_end']);
});
