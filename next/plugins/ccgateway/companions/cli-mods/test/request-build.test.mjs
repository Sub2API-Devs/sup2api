import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('build passes generation options to CC and keeps its normalized result', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-native-build-'));
  try {
    for (const name of ['request-build', 'request-input', 'request-options']) {
      await fs.copyFile(new URL(`../${name}.js`, import.meta.url), path.join(dir, `ccgateway-${name}.js`));
    }
    for (const [name, code] of Object.entries({
      'package.json': '{"type":"module"}',
      'chunk-kasbfbhj.js': `
        export let captured;
        export const MDe=()=>{throw Error('unexpected attachment')};
        export async function* Kvt(input) {
          captured=input;
          // Stand in for native model rules: omit disabled thinking, demote
          // forced tool choice, clamp effort/tokens and select native metadata.
          yield {type:'ccgateway_request',body:{model:'fixture',messages:[],
            tool_choice:{type:'auto'},max_tokens:4096,output_config:{effort:'low'},
            metadata:{user_id:'native'},betas:['native-beta']}};
        }`,
      'chunk-0ycjphb5.js': 'export const El=()=>({});',
      'chunk-q61sszgr.js': 'export const getRootSession=()=>({});',
      'chunk-6dwnw6av.js': 'export const YEr=()=>true;',
      'ccgateway-native-tools.js': 'export const registerNative=()=>{}; export const findNative=()=>({});',
    })) await fs.writeFile(path.join(dir, name), code);
    const { buildRequest } = await import(pathToFileURL(path.join(dir, 'ccgateway-request-build.js')));
    const native = await import(pathToFileURL(path.join(dir, 'chunk-kasbfbhj.js')));
    const format = { type: 'json_schema', schema: { type: 'object', properties: {} } };
    for (const thinking of [{ type: 'disabled' }, { type: 'adaptive' }, { type: 'enabled', budget_tokens: 1024 }]) {
      const components = { model: 'fixture', messages: [{ role: 'user', content: 'fixture' }], stream: true,
        parameters: { thinking, max_tokens: 8192, temperature: 0.25,
          tool_choice: { type: 'tool', name: 'web_search' },
          output_config: { effort: 'medium', format }, metadata: { user_id: 'incoming' } } };
      const original = structuredClone(components);
      const result = await buildRequest(components, { 'anthropic-beta': 'client-beta' }, new AbortController().signal);
      assert.deepEqual(components, original);
      const options = native.captured.options;
      assert.equal(options.maxOutputTokensOverride, 8192);
      assert.equal(options.temperatureOverride, 0.25);
      assert.equal(options.effortValue, 'medium');
      assert.deepEqual(options.outputFormat, format);
      assert.deepEqual(options.toolChoice, components.parameters.tool_choice);
      assert.deepEqual(native.captured.thinkingConfig, thinking.type === 'enabled'
        ? { type: 'enabled', budgetTokens: 1024, display: undefined }
        : thinking.type === 'adaptive' ? { type: 'enabled', display: undefined }
          : { type: 'disabled', mechanical: true });
      assert.deepEqual(result.body, { model: 'fixture', messages: [], tool_choice: { type: 'auto' },
        max_tokens: 4096, output_config: { effort: 'low' }, metadata: { user_id: 'native' }, stream: true });
      assert.equal(result.headers['anthropic-beta'], 'client-beta,native-beta');
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
