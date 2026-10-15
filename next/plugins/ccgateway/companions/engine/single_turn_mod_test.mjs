import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(new URL('../mod/hooks/register.js', import.meta.url), 'utf8');
const { register } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('single-turn execution denies tools and blocks a second model step', async () => {
  const hooks = {};
  register((name, fn) => { hooks[name] = fn; return { catch() {} }; });
  let modelCalls = 0;
  let toolCalls = 0;
  let aborts = 0;
  const callbacks = [];
  const config = {
    single_turn: true,
    scope_boundary: true,
    web_search: true,
    tools: { mcp__ccgateway__lookup: { client_name: 'lookup' } },
    passthrough: { first: '{"max_tokens":64}', rest: '{"max_tokens":128}' },
  };
  const $ = {
    env: { get: async () => '1', set: async () => {} },
    turn: { abort: async () => { aborts++; } },
    http: { fetch: async (_url, options) => {
      if (options?.method) callbacks.push(JSON.parse(options.body).event);
      return { ok: true, text: options?.method ? '{}' : JSON.stringify(config) };
    } },
  };
  await hooks['session.start']($, {}, async e => e);
  const next = async function* () { modelCalls++; yield { type: 'fixture' }; };
  for await (const _ of hooks['turn.step']($, { turnId: 'first', index: 0 }, next)) {}
  for (const name of ['ToolSearch', 'mcp__ccgateway__lookup', 'WebSearch', 'StructuredOutput']) {
    const result = await hooks['tool.call']($, { tool: name }, async () => { toolCalls++; return {}; });
    assert.match(result.deny, /API client/);
  }
  // Stale helper settings must not permit a recovery or format continuation.
  for await (const _ of hooks['turn.step']($, { turnId: 'retry', index: 1 }, next)) {}
  assert.equal(modelCalls, 1);
  assert.equal(toolCalls, 0);
  assert.equal(aborts, 1);
  assert.deepEqual(callbacks, ['ready']);
});
