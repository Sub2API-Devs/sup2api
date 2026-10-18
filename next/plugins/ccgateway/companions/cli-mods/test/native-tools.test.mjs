import test from 'node:test';
import assert from 'node:assert/strict';
import { registerNative, mergeNative, findNative, nativeRevision, dispatchNative, isNative } from '../native-tools.js';

const spec = (name, description = 'mod definition') => ({ name, description, inputSchema: { type: 'object', properties: { script: { type: 'string' } } } });
test('upsert replaces the complete object, invalidates lookups and isolates sessions', () => {
  const a = {}, b = {};
  const old = { name: 'Bash', coerceInput() { throw Error('old coercion'); } };
  const base = [old, { name: 'Read' }];
  assert.equal(mergeNative(a, base), base);
  registerNative(a, 'plugin-a', spec('Bash'));
  registerNative(a, 'plugin-a', spec('MyTool'));
  const first = mergeNative(a, base);
  assert.deepEqual(first.map(t => t.name), ['Read', 'Bash', 'MyTool']);
  assert.equal(first.find(t => t.name === 'Bash').coerceInput, undefined);
  assert.equal(mergeNative(a, base), first);
  assert.equal(mergeNative(b, base), base);
  assert.equal(findNative(b, 'Bash'), undefined);
  registerNative(a, 'plugin-b', spec('Bash', 'replacement'));
  assert.notEqual(mergeNative(a, base), first);
  assert.equal(nativeRevision(a), 3);
  assert.equal(findNative(a, 'Bash').descriptionText, 'replacement');
  assert.ok(isNative(findNative(a, 'Bash')));
});

test('registration snapshots the caller schema', () => {
  const session = {}, definition = spec('MyTool');
  registerNative(session, 'plugin', definition);
  definition.inputSchema.properties.script.type = 'number';
  assert.equal(findNative(session, 'MyTool').inputJSONSchema.properties.script.type, 'string');
});

test('dispatch passes arbitrary parameters directly to mods without checking schema or permissions', async () => {
  const session = {};
  registerNative(session, 'plugin', spec('Bash'));
  const tool = findNative(session, 'Bash');
  for (const key of ['coerceInput', 'validateInput', 'checkPermissions', 'call']) tool[key] = () => { throw Error(`must not call ${key}`); };
  tool.inputSchema = { safeParse() { throw Error('must not parse'); } };
  const input = { script: 42, arbitrary: { unknown: true } };
  const result = await dispatchNative(tool, { id: 'call1', input }, {}, async event => {
    assert.deepEqual(event, { ...input, tool: 'Bash', tool_use_id: 'call1' });
    return { result: { received: event.script } };
  });
  assert.deepEqual(result, { type: 'tool_result', tool_use_id: 'call1', content: '{"received":42}' });
});

test('an unanswered native call does not fall back to the built-in executor', async () => {
  const session = {};
  registerNative(session, 'plugin', spec('Bash'));
  await assert.rejects(dispatchNative(findNative(session, 'Bash'), { id: 'call', input: {} }, {}, (_, core) => core.run()), /No tool.call mod handler answered Bash/);
});

test('a mod denial is returned as a tool error', async () => {
  const session = {};
  registerNative(session, 'plugin', spec('MyTool'));
  const result = await dispatchNative(findNative(session, 'MyTool'), { id: 'call', input: {} }, {}, async () => ({ deny: 'mod chose to refuse' }));
  assert.equal(result.is_error, true);
  assert.equal(result.content, 'mod chose to refuse');
});

test('configured hooks run before and after mods and can rewrite input/output', async () => {
  const order = [];
  const result = await dispatchNative({ name: 'Read' }, { id: 'call', input: { path: 'raw' } }, {
    async before(input) { order.push('pre'); assert.equal(input.path, 'raw'); return { input: { path: 'rewritten' } }; },
    async after(input, output) { order.push('post'); assert.equal(input.path, 'rewritten'); assert.equal(output, 'mod-result'); return 'post-result'; },
  }, async event => { order.push('mod'); assert.equal(event.path, 'rewritten'); return { result: 'mod-result' }; });
  assert.deepEqual(order, ['pre', 'mod', 'post']);
  assert.equal(result.content, 'post-result');
});

test('explicit hook denial is honored without calling mods', async () => {
  const result = await dispatchNative({ name: 'Bash' }, { id: 'call', input: {} }, {
    before: async () => ({ deny: 'user hook refused' }),
    after: () => assert.fail('no post hook for a call that never ran'),
  }, () => assert.fail('mod must not execute after explicit hook denial'));
  assert.equal(result.is_error, true);
  assert.equal(result.content, 'user hook refused');
});

test('mod failure triggers the failure lifecycle once', async () => {
  let failures = 0;
  await assert.rejects(dispatchNative({ name: 'Unknown' }, { id: 'call', input: { x: 1 } }, {
    failed: async (input, error) => { failures++; assert.deepEqual(input, { x: 1 }); assert.equal(error, 'mod error'); },
  }, async () => { throw Error('mod error'); }), /mod error/);
  assert.equal(failures, 1);
});
