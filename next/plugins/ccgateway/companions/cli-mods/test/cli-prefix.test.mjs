import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { identityLineFor } from '../request-policy.js';

// The entrypoint decides the line, as Claude Code picks it (2026-10-23,
// adaptive): an SDK entrypoint takes the appended line only when build gave
// the request CC's prompt with the client's system appended.
test('the line is chosen by the request entrypoint', () => {
  const pick = (policy, entrypoint) => { const { line, fallback } = identityLineFor(policy, entrypoint); return [line, fallback]; };
  assert.deepEqual(pick({}, 'cli'), ['official_cli', 'official_cli']);
  assert.deepEqual(pick({}, 'sdk-cli'), ['agent_sdk', 'agent_sdk']);
  assert.deepEqual(pick({}, 'sdk-ts'), ['agent_sdk', 'agent_sdk']);
  assert.deepEqual(pick({}, 'sdk-py'), ['agent_sdk', 'agent_sdk']);
  assert.deepEqual(pick({}, 'claude-desktop'), ['official_cli_sdk', 'official_cli_sdk']);
  assert.deepEqual(pick({}, 'claude-vscode'), ['official_cli_sdk', 'official_cli_sdk']);
  // The desktop app's third-party build answers to claude-desktop; anything
  // else (or no header) uses the configured entrypoint's row.
  assert.deepEqual(pick({}, 'claude-desktop-3p'), ['official_cli_sdk', 'official_cli_sdk']);
  assert.deepEqual(pick({}, 'unknown'), ['agent_sdk', 'agent_sdk']);
  assert.deepEqual(pick({ build_billing_entrypoint: 'cli' }, 'remote'), ['official_cli', 'official_cli']);
  assert.deepEqual(pick({ build_billing_entrypoint: 'claude-vscode' }, undefined), ['official_cli_sdk', 'official_cli_sdk']);
  const appended = entrypoint => identityLineFor({}, entrypoint, { appended: true }).line;
  assert.deepEqual(['cli', 'sdk-cli', 'sdk-ts', 'sdk-py', 'claude-desktop', 'claude-vscode'].map(appended), ['official_cli', 'official_cli_sdk', 'official_cli_sdk', 'official_cli_sdk', 'official_cli_sdk', 'official_cli_sdk']);
  // Lines an older core still sends are not used.
  const policy = { build_identity_lines: { 'sdk-cli': 'official_cli_sdk', 'claude-desktop': 'none', cli: 'none' } };
  assert.deepEqual(pick(policy, 'sdk-cli'), ['agent_sdk', 'agent_sdk']);
  assert.deepEqual(pick(policy, 'cli'), ['official_cli', 'official_cli']);
});

// The request command sends the body build returned as it is (build put the
// line in it) and tells build whether this is an API-key request, whose build
// records no line. Direct forwards its body unchanged.
test('the command sends build as it returned it, and direct unchanged', async () => {
  const { default: fsp } = await import('node:fs/promises');
  const { default: os } = await import('node:os');
  const { default: path } = await import('node:path');
  const { spawn } = await import('node:child_process');
  const { installSupport, linkNatives } = await import('./support.mjs');
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-cli-prefix-'));
  try {
    await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, ['request-command', 'request-options', 'request-output', 'request-error', 'request-identity', 'request-policy', 'request-agent']);
    for (const [name, code] of Object.entries({
      'stub-transport.js': 'export class AnthropicClient {} export const createClient=async()=>new AnthropicClient(); export const modelFetch=()=>{};',
      'stub-context.js': 'export const mainAgentContext=()=>({});export const modelBetas=()=>[];',
      'stub-betas.js': 'export const betasAllowed=()=>true;',
      'stub-session.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
      // Build reports what it assembled, and the apiKey flag it was given.
      'ccgateway-request-build.js': 'export const buildRequest=async(body,headers,signal,resolveAgent,options)=>({body:{model:body.model,system:[{type:"text",text:"LINE"},{type:"text",text:"built"}],apiKey:options?.apiKey===true},headers:{},identityLine:{line:"agent_sdk",fallback:"agent_sdk"},clientBetas:[],addedBetas:[]});',
      // Records exactly what would be sent, then answers with an HTTP error.
      'ccgateway-model-request.js': `import fs from 'node:fs/promises';
        export const checkModelRequest=()=>null;export const defaultTimeout=600000;export const requestCapture=()=>{throw Error('no capture was asked for')};
        export const openModelRequest=async o=>{const b=o.rawBody??o.body;
          await fs.writeFile('sent.json',typeof b==='string'?b:JSON.stringify(b));
          await fs.writeFile('keys.json',JSON.stringify(Object.keys(o)));return {id:'x',ok:false,status:400,headers:{}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async()=>({done:true,bytes:new Uint8Array()});`,
      'run.mjs': `import {runRequestCommand} from './ccgateway-request-command.js';
        const agentNative={entrypoint:(system,policy)=>policy.build_billing_entrypoint??'sdk-cli',turn:()=>({}),leadingBilling:()=>null};
        process.exitCode=await runRequestCommand(process.argv.slice(2),{directBuild:async(raw)=>raw,agentNative});`,
    })) await fsp.writeFile(path.join(dir, name), code);
    await linkNatives(dir);
    const input = '{"model":"fixture","system":"Be brief.","messages":[{"role":"user","content":"hi"}]}';
    const run = (mode, apiKey) => new Promise((resolve, reject) => {
      const env = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = 'fixture'; else delete env.ANTHROPIC_API_KEY;
      delete env.CCG_REQUEST_IDENTITY; delete env.CCG_DIRECT_POLICY;
      const child = spawn(process.execPath, ['run.mjs', mode], { cwd: dir, env });
      child.on('error', reject);
      child.on('close', async () => resolve(await fsp.readFile(path.join(dir, 'sent.json'), 'utf8').catch(() => null)));
      child.stdin.end(input);
    });
    assert.equal(await run('--direct', false), input);
    // OAuth build: build's own system goes out, and the command adds nothing.
    assert.deepEqual(JSON.parse(await run('--build', false)).system, [{ type: 'text', text: 'LINE' }, { type: 'text', text: 'built' }]);
    assert.equal(JSON.parse(await run('--build', false)).apiKey, false);
    // API key: the command tells build, which records no line of its own.
    assert.equal(JSON.parse(await run('--build', true)).apiKey, true);
    // The identity choice never reaches the transport.
    assert(!JSON.parse(await fsp.readFile(path.join(dir, 'keys.json'), 'utf8')).includes('identityLine'));
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
