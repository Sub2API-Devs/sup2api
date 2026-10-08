import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = readFileSync(new URL('../mod/hooks/register.js', import.meta.url), 'utf8');
const { register } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('failed scope cleanup does not replace original turn exception', async () => {
 const hooks = {}; register((name, fn) => hooks[name] = fn);
 const events = [];
 const $ = { env: { get: async () => 'fixture' }, http: { fetch: async (_, options) => {
  if (!options?.body) return {ok:true,text:JSON.stringify({main_request_scope:true})};
  const event = JSON.parse(options.body).event; events.push(event);
  return {ok:event !== 'main_request_end'};
 }}};
 await hooks['session.start']($,{},async e=>e);
 const cause = new Error('fixture original failure');
 const run = hooks['turn.step']($,{},async function* () { throw cause; });
 await assert.rejects(run.next(), e => e === cause);
 assert.deepEqual(events, ['ready','main_request_begin','main_request_end']);
});
