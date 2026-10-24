import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareBuildInput as rawPrepare } from '../request-input.js';
import { writeOutput } from '../request-output.js';

// The native api_system record factory (core's ile), as the request build
// passes it in: the record shape is the CLI's, not this module's.
const systemRecord = content => ({ type: 'api_system', message: { role: 'system', content }, uuid: randomUUID(), timestamp: new Date().toISOString() });
const prepareBuildInput = (components, render, options = {}) => rawPrepare(components, render, { systemRecord, ...options });

test('explicit build components keep media, tool results and system in sequence', () => {
  const media = { type: 'image', source: { type: 'url', url: 'https://example.test/image' } };
  const doc = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'fixture' } };
  const reminder = '<system-reminder>\ncontext\n</system-reminder>';
  const body = { model: 'fixture', messages: [
    { role: 'user', content: [media, doc, { type: 'tool_result', tool_use_id: 't1', content: reminder }] },
    { role: 'system', content: 'explicit system', output_config: { effort: 'low' } },
  ], attachments: [{ afterMessage: 0, text: reminder, role: 'user' }], parameters: { max_tokens: 42 } };
  const copy = structuredClone(body), out = prepareBuildInput(body);
  assert.deepEqual(body, copy);
  assert.deepEqual(out.messages.map(m => m.type), ['user', 'attachment', 'api_system']);
  assert.equal(out.messages[1].renderedRole, 'user');
  assert.equal(out.messages[1].rendered[0].content, reminder);
  assert.deepEqual(out.messages[0].message.content, body.messages[0].content);
  assert.deepEqual(out.messages[2].outputConfig, { effort: 'low' });
  assert.equal(out.request.max_tokens, 42);
});

test('ordinary text is never guessed into attachment records', () => {
  const reminder = '<system-reminder>\nx\n</system-reminder>';
  for (const text of [reminder, `quoted ${reminder}`, reminder + '\n' + reminder, '<system-reminder>\n' + reminder + '\n</system-reminder>']) {
    const out = prepareBuildInput({ model: 'fixture', messages: [{ role: 'user', content: text }] });
    assert.equal(out.messages.length, 1); assert.equal(out.messages[0].type, 'user'); assert.equal(out.messages[0].message.content, text);
  }
});

test('system tool changes use native field names and keep definitions', () => {
  const definition = { name: 'NewTool', input_schema: { type: 'object' } };
  const out = prepareBuildInput({ model: 'fixture', messages: [{ role: 'user', content: 'x' }, { role: 'system', content: [
    { type: 'text', text: 'notice' }, { type: 'tool_removal', tool: { type: 'tool_reference', name: 'OldTool' } },
    { type: 'tool_addition', tool: { type: 'tool_definition', definition } },
  ] }] });
  const row = out.messages[1];
  assert.deepEqual(row.toolRemovals, ['OldTool']); assert.deepEqual(row.toolAdditions, ['NewTool']);
  assert.deepEqual(row.toolDefinitions.NewTool, definition);
});

test('scoped system retains wire lifecycle and malformed input fails before transport', () => {
  const scoped = { role: 'system', content: 'scope', clear_at: 'next_user_message' };
  assert.deepEqual(prepareBuildInput({ model: 'fixture', messages: [scoped] }).messages[0].ccgatewayWireSystem, scoped);
  assert.throws(() => prepareBuildInput({ model: 'fixture', messages: [{ role: 'developer', content: 'x' }] }), /invalid role/);
  assert.throws(() => prepareBuildInput({ model: 'fixture', messages: [{ role: 'user', content: 'x' }], parameters: { betas: 'not-an-array' } }), /betas/);
});

test('extracted references preserve system blocks and native rendered reminder positions', () => {
  const system = { role: 'system', clear_at: 'next_user_message', content: [{ type: 'text', text: 'scope', cache_control: { type: 'ephemeral' } }], output_config: { effort: 'low' } };
  const reminder = { type: 'text', text: '<system-reminder>KEEP</system-reminder>', cache_control: { type: 'ephemeral' } };
  let calls = 0;
  const out = prepareBuildInput({ model: 'fixture', systemPrompt: [{ type: 'text', text: 'global', cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [{ type: 'text', text: 'before' }, { type: 'ccgateway_attachment', id: 'r' }, { type: 'text', text: 'after' }] }, { attachment: 's' }],
    attachments: [{ id: 'r', kind: 'reminder', block: reminder }, { id: 's', kind: 'system', message: system }],
  }, row => { calls++; assert.equal(row.type, 'attachment'); return { isKnownType: true, messages: [{ message: { role: 'user', content: row.rendered[0].content } }] }; });
  assert.equal(calls, 1);
  assert.deepEqual(out.messages[0].message.content, [{ type: 'text', text: 'before' }, reminder, { type: 'text', text: 'after' }]);
  assert.deepEqual(out.messages[1].ccgatewayWireSystem, system);
  assert.deepEqual(out.systemBlocks[0].cache_control, { type: 'ephemeral' });
  assert.throws(() => prepareBuildInput({ model: 'fixture', messages: [{ attachment: 'missing' }] }), /reference/);
  assert.throws(() => prepareBuildInput({ model: 'fixture', messages: [{ role: 'user', content: 'x' }], attachments: [{ id: 's', kind: 'system', message: system }] }), /unreferenced/);
});

test('HTTP body fields and component overrides are rejected by build mode', () => {
  const base = { model: 'fixture', messages: [{ role: 'user', content: 'x' }] };
  assert.throws(() => prepareBuildInput({ ...base, max_tokens: 42 }), /unknown component/);
  assert.throws(() => prepareBuildInput({ ...base, attachments: [{ afterMessage: 3, text: 'x' }] }), /afterMessage/);
  const tool = { name: 'NativeName', description: 'test', inputSchema: { type: 'object' }, strict: true };
  assert.deepEqual(prepareBuildInput({ ...base, tools: [tool] }).customTools[0], { name: tool.name, description: tool.description, input_schema: tool.inputSchema, strict: true });
});

test('blocked output is interruptible without a write callback', async () => {
  const abort = new AbortController();
  const waiting = writeOutput({ write() { return false; } }, 'blocked', abort.signal);
  abort.abort(new Error('deadline'));
  await assert.rejects(waiting, /deadline/);
});
