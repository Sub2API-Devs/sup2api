import test from 'node:test';
import assert from 'node:assert/strict';
import { requestTool, isNative } from '../native-tools.js';

const spec = (name, description = 'client definition') => ({ name, description, inputSchema: { type: 'object', properties: { script: { type: 'string' } } } });

test('a client tool is a CC tool that CC recognizes and that never runs', () => {
  const tool = requestTool(spec('Bash'));
  assert.ok(isNative(tool));
  assert.ok(isNative({ ...tool, ccgatewayRequestDefinition: {} }), 'the marker survives the copy build makes');
  assert.ok(!isNative({ name: 'Bash' }));
  assert.equal(tool.plugin, 'ccgateway-request');
  for (const key of ['call', 'create', 'mapToolResultToToolResultBlock', 'renderToolUseMessage']) assert.equal(tool[key], undefined, key);
  // Input goes through as written; the client checks it.
  assert.deepEqual(tool.inputSchema.safeParse({ script: 42 }), { success: true, data: { script: 42 } });
});

test('a client tool snapshots its schema and gives CC its own tool description', async () => {
  const definition = spec('MyTool');
  const tool = requestTool({ ...definition, isDeferred: true });
  definition.inputSchema.properties.script.type = 'number';
  assert.equal(tool.inputJSONSchema.properties.script.type, 'string');
  assert.equal(tool.isDeferred, true);
  assert.equal(await tool.description(), 'client definition');
  // The wire definition is the client's own (request-build keeps it on the CC
  // tool as ccgatewayRequestDefinition); this module assembles none.
  assert.equal(Object.hasOwn(tool, 'ccgatewayRequestDefinition'), false);
  assert.deepEqual(requestTool({ name: 'Bare', description: '' }).inputJSONSchema, { type: 'object' });
});
