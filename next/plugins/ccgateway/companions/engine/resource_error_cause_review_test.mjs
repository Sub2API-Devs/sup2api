import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = readFileSync(new URL('../mod/hooks/register.js', import.meta.url), 'utf8');
const { register } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

async function fixture(configuration = {}, rejectPause = false) {
  const hooks = {}, catches = {}, events = [], bodies = [], aborted = [];
  register((name, fn) => { hooks[name] = fn; return { catch(handler) { catches[name] = handler; } }; });
  const $ = {
    env: {
      get: async key => key === 'CCGATEWAY_TOOL_SEARCH' ? '1' : 'fixture',
      set: async (key, body) => { assert.equal(key, 'CLAUDE_CODE_EXTRA_BODY'); bodies.push(body); }
    },
    turn: { abort: async e => aborted.push(e.turnId) },
    http: { fetch: async (_, options) => {
      if (!options?.body) return { ok: true, text: JSON.stringify({ passthrough: { first: '{"tool_choice":{"type":"auto"}}', rest: '{"temperature":0.2500}' }, ...configuration }) };
      const event = JSON.parse(options.body);
      events.push(event);
      return { ok: !(rejectPause && event.event === 'scope_pause') };
    } }
  };
  await hooks['session.start']($, {}, async e => e);
  return { $, hooks, catches, events, bodies, aborted, run: next => hooks['turn.step']($, { turnId: 'fixture-turn', index: 1 }, next) };
}

test('rejected scope pause cannot invoke the next model request', async () => {
  const f = await fixture({ scope_boundary: true, systems: ['persistent', 'scoped'] }, true);
  await f.hooks['prompt.submit'](f.$, {}, async e => e);
  await f.hooks['session.append'](f.$, { uuid: 'own-attachment', message: { type: 'attachment', name: 'hook_additional_context' }, origin: { kind: 'plugin', event: 'prompt.submit' } }, async e => e);
  let calls = 0;
  const next = async function* () { calls++; return 'first-complete'; };
  await f.run(next).next();
  await f.hooks['tool.call'](f.$, { tool: 'ToolSearch' }, async () => ({ result: 'discovered' }));
  await assert.rejects(f.run(next).next(), /scoped continuation rejected/);
  assert.equal(calls, 1);
  assert.deepEqual(f.aborted, ['fixture-turn']);
  assert.deepEqual(f.events.map(e => e.event), ['ready', 'system', 'scope_attachment', 'scope_pause']);
});

test('consumer return closes the native iterator without a lease', async () => {
  const f = await fixture();
  let closed = false;
  const run = f.run(async function* () { try { yield 1; yield 2; } finally { closed = true; } });
  assert.equal((await run.next()).value, 1);
  await run.return();
  assert.equal(closed, true);
  assert.deepEqual(f.events.map(e => e.event), ['ready']);
});

test('resumed scope uses rest bytes and retains the discovery budget', async () => {
  const f = await fixture({ scope_resumed: true, search_calls: 3 });
  await f.run(async function* () { return 'complete'; }).next();
  assert.deepEqual(f.bodies, ['{"temperature":0.2500}']);
  const result = await f.hooks['tool.call'](f.$, { tool: 'ToolSearch' }, async () => assert.fail('discovery budget reset'));
  assert.match(result.deny, /execution belongs to the API client/);
});

test('a pre-dispatch hook failure aborts instead of falling open', async () => {
  const f = await fixture();
  const next = async function* () { assert.fail('model request after hook failure'); };
  next.called = false;
  const run = f.catches['turn.step'](f.$, { turnId: 'fixture-turn', index: 1 }, next);
  const result = await run.next();
  assert.equal(result.done, true);
  assert.equal(result.value.usage, null);
  assert.deepEqual(f.aborted, ['fixture-turn']);
});
