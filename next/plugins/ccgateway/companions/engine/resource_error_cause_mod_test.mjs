import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = readFileSync(new URL('../mod/hooks/register.js', import.meta.url), 'utf8');
const { register } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('native round preserves the original failure without relay lease callbacks', async () => {
  const hooks = {}, events = [], bodies = [];
  register((name, fn) => { hooks[name] = fn; return { catch() {} }; });
  const body = '{"output_config":{"format":{"schema":{"const":9007199254740993}}}}';
  const $ = {
    env: { get: async () => 'fixture', set: async (key, value) => { assert.equal(key, 'CLAUDE_CODE_EXTRA_BODY'); bodies.push(value); } },
    http: { fetch: async (_, options) => {
      if (!options?.body) return { ok: true, text: JSON.stringify({ passthrough: { first: body, rest: '{}' } }) };
      events.push(JSON.parse(options.body));
      return { ok: true };
    } }
  };
  await hooks['session.start']($, {}, async e => e);
  const cause = new Error('fixture original failure');
  let calls = 0;
  const run = hooks['turn.step']($, {}, async function* () { calls++; throw cause; });
  await assert.rejects(run.next(), e => e === cause);
  assert.equal(calls, 1);
  assert.deepEqual(bodies, [body]);
  assert.deepEqual(events, [{ event: 'ready', version: 'ccgateway-v3' }]);
});
