import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { applyBuildCliPrefix } from '../request-identity.js';
import { identityLineFor } from '../request-policy.js';
import { vocabulary } from './vocabulary.mjs';
import { restored, nativeSkip } from './artifacts.mjs';
import { installSupport } from './support.mjs';

// The functions take the CLI's recognizer (t1n) and lines (n1n) as arguments;
// these lines stand in for them, so nothing here depends on a copy of the
// CLI's wording. The last test runs the real t1n/n1n.
const named = { official_cli: 'CLI line A.', official_cli_sdk: 'CLI line B.', agent_sdk: 'CLI line C.' };
const lines = Object.values(named);
const isPrefix = value => lines.includes(value);
// Stands in for CC's B1s: a block whose text starts with the native header.
const isBilling = block => typeof block.text === 'string' && block.text.startsWith(vocabulary.billingHeader);
const cliPrefix = named.agent_sdk;
const [interactive, sdk] = lines;
const prefix = { type: 'text', text: cliPrefix };
const t = text => ({ type: 'text', text });
const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;';
const prompt = 'Answer the user concisely.';
const apply = (system, choice) => {
  const built = system === undefined ? { model: 'fixture' } : { model: 'fixture', system: structuredClone(system) };
  return applyBuildCliPrefix(built, choice, named, isPrefix, isBilling).system;
};

test('only a line the CLI recognizes is inserted', () => {
  assert.throws(() => applyBuildCliPrefix({}, undefined, { agent_sdk: 'not a CLI line' }, isPrefix, isBilling), /native Claude Code system line/);
  assert.throws(() => applyBuildCliPrefix({}, { line: 'other', fallback: 'other' }, named, isPrefix, isBilling), /native Claude Code system line/);
});

// Where upstream accepts the line (2026-10-21): first block, or anywhere after
// a leading attribution header. Everywhere else it is added where CC puts it.
// Without a choice the line is the `claude -p` one.
const cases = [
  ['absent', undefined, [prefix]],
  ['empty', [], [prefix]],
  ['prompt only', [t(prompt)], [prefix, t(prompt)]],
  ['header first', [t(header), t(prompt)], [t(header), prefix, t(prompt)]],
  ['header only', [t(header)], [t(header), prefix]],
  ['line merged into a prompt block', [t(interactive + '\n\n' + prompt)], [prefix, t(interactive + '\n\n' + prompt)]],
  ['line after the prompt', [t(prompt), t(interactive)], [prefix, t(prompt), t(interactive)]],
  ['header after the prompt', [t(prompt), t(header)], [prefix, t(prompt), t(header)]],
  ['line first', [t(interactive), t(prompt)], null],
  ['cached line first', [{ ...t(interactive), cache_control: { type: 'ephemeral' } }, t(prompt)], null],
  ['SDK line first', [t(sdk), t(prompt)], null],
  ['agent line after header', [t(header), t(cliPrefix), t(prompt)], null],
  ['line anywhere after header', [t(header), t(prompt), t(interactive)], null],
];

test('build requests open with Claude Code line where CC puts it', () => {
  for (const [name, system, expected] of cases) assert.deepEqual(apply(system, undefined), expected ?? system, name);
});

// The line follows the entrypoint's choice; none is honoured only where the
// header opens the system, since anywhere else upstream needs a line (429).
test('the chosen line is inserted, and none only after a leading header', () => {
  const cli = { line: 'official_cli', fallback: 'official_cli' };
  assert.deepEqual(apply([t(header), t(prompt)], cli), [t(header), t(interactive), t(prompt)]);
  assert.deepEqual(apply([t(prompt)], { line: 'official_cli_sdk', fallback: 'official_cli_sdk' }), [t(sdk), t(prompt)]);
  const none = { line: 'none', fallback: 'official_cli_sdk' };
  assert.deepEqual(apply([t(header), t(prompt)], none), [t(header), t(prompt)]);
  assert.deepEqual(apply([t(header)], none), [t(header)]);
  assert.deepEqual(apply([t(prompt), t(header)], none), [t(sdk), t(prompt), t(header)]);
  assert.deepEqual(apply([t(prompt)], none), [t(sdk), t(prompt)]);
  assert.deepEqual(apply(undefined, none), [t(sdk)]);
  // A client line is never replaced, whatever the entrypoint asks for.
  for (const choice of [cli, none]) {
    assert.deepEqual(apply([t(header), t(cliPrefix), t(prompt)], choice), [t(header), t(cliPrefix), t(prompt)]);
    assert.deepEqual(apply([t(sdk), t(prompt)], choice), [t(sdk), t(prompt)]);
  }
});

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

// Direct is a pure passthrough (2026-10-21 decision): the body goes out byte
// for byte. Build adds the chosen line for OAuth only.
test('claude request adds the line to OAuth build; direct changes only with the Worker context', async () => {
  const { default: fsp } = await import('node:fs/promises');
  const { default: os } = await import('node:os');
  const { spawn } = await import('node:child_process');
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-cli-prefix-'));
  try {
    await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, ['request-command', 'request-options', 'request-output', 'request-error', 'request-identity', 'request-policy', 'request-agent']);
    for (const [name, code] of Object.entries({
      'chunk-38xgev2z.js': 'export class _ke {} export const sF=async()=>new _ke(); export const mle=()=>{};',
      'chunk-7p6jp6kj.js': 'export const Al=()=>({});export const S8n=()=>[];',
      'chunk-4qs43hr1.js': 'export const mBr=()=>true;',
      'chunk-72vwyp9d.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
      // The build names the line its entrypoint asks for.
      'ccgateway-request-build.js': 'export const buildRequest=async body=>({body:{model:body.model,system:[{type:"text",text:"built"}]},headers:{},identityLine:{line:"official_cli",fallback:"official_cli"},clientBetas:[],addedBetas:[]});',
      // Records exactly what would be sent, then answers with an HTTP error.
      'ccgateway-model-request.js': `import fs from 'node:fs/promises';
        export const checkModelRequest=()=>null;export const defaultTimeout=600000;
        export const openModelRequest=async o=>{const b=o.rawBody??o.body;
          await fs.writeFile('sent.json',typeof b==='string'?b:JSON.stringify(b));
          await fs.writeFile('keys.json',JSON.stringify(Object.keys(o)));return {id:'x',ok:false,status:400,headers:{}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async()=>({done:true,bytes:new Uint8Array()});`,
      'run.mjs': `import {runRequestCommand} from './ccgateway-request-command.js';
        import {applyBuildCliPrefix} from './ccgateway-request-identity.js';
        const lines=${JSON.stringify(named)},isPrefix=v=>Object.values(lines).includes(v),isBilling=b=>String(b.text).startsWith(${JSON.stringify(vocabulary.billingHeader)});
        // Direct's billing stand-in records what it was given.
        const directBuild=async(raw,body,o)=>raw.replace('"system":','"direct":'+JSON.stringify(o)+',"system":');
        // The entry gives direct its native bindings with it; these record nothing.
        const agentNative={entrypoint:(system,policy)=>policy.build_billing_entrypoint??'sdk-cli',turn:()=>({}),leadingBilling:()=>null};
        process.exitCode=await runRequestCommand(process.argv.slice(2),{prefixBuild:(b,c)=>applyBuildCliPrefix(b,c,lines,isPrefix,isBilling),directBuild,agentNative});`,
    })) await fsp.writeFile(path.join(dir, name), code);
    const input = '{"model":"fixture","system":"Be brief.","metadata":{"user_id":"client"},"messages":[{"role":"user","content":"hi"}]}';
    const run = (mode, apiKey, directPolicy) => new Promise((resolve, reject) => {
      const env = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = 'fixture'; else delete env.ANTHROPIC_API_KEY;
      if (directPolicy !== undefined) env.CCG_DIRECT_POLICY = directPolicy; else delete env.CCG_DIRECT_POLICY;
      const child = spawn(process.execPath, ['run.mjs', mode], { cwd: dir, env });
      child.on('error', reject);
      child.on('close', async () => resolve(await fsp.readFile(path.join(dir, 'sent.json'), 'utf8').catch(() => null)));
      child.stdin.end(input);
    });
    assert.equal(await run('--direct', false), input);
    assert.equal(await run('--direct', true), input);
    // With the Worker's direct context, direct fills the header as the main
    // thread's (2026-10-23): the billing policy reaches it, identity lines from
    // an older Worker do not, and the rest stays the client's.
    assert.equal(await run('--direct', false, '{"build_billing_entrypoint":"cli","build_identity_lines":{"cli":"none"}}'), input.replace('"system":', '"direct":{"policy":{"build_billing_entrypoint":"cli"}},"system":'));
    assert.equal(await run('--direct', true, '{"build_billing_sources":{"cc_version":"worker"}}'), input.replace('"system":', '"direct":{"policy":{"build_billing_sources":{"cc_version":"worker"}}},"system":'));
    await fsp.rm(path.join(dir, 'sent.json'));
    assert.equal(await run('--direct', false, '{"cch":1}'), null, 'an invalid context is refused before sending');
    assert.equal(await run('--direct', false, '{"build_billing_sources":{"cch":"worker"}}'), null);
    assert.deepEqual(JSON.parse(await run('--build', false)).system, [t(interactive), t('built')]);
    // The choice is the CLI's own; it never reaches the transport.
    assert(!JSON.parse(await fsp.readFile(path.join(dir, 'keys.json'), 'utf8')).includes('identityLine'));
    assert.deepEqual(JSON.parse(await run('--build', true)).system, [t('built')]);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

// The real recognizer and selector from the recovered CLI (2.1.304
// chunk-t61vswm2.js: the le/ke/De declaration, t1n and n1n). The recovered
// source is not in Git, so this is skipped, visibly, where it is absent.
const restoredChunk = new URL('chunk-t61vswm2.js', restored);
test('the CLI recognizes its own lines and gives one per identity line name', { skip: nativeSkip('native t1n/n1n were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var le="You are Claude Code[^;]*;/) + piece(/function t1n\(e\)\{[^}]*\}/) +
    piece(/function n1n\(e\)\{.*?return le\}/) + ';({t1n,n1n,lines:vt})', { Pe: () => 'firstParty' });
  // The arguments the patched request command passes for each name.
  const own = {
    official_cli: native.n1n({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.n1n({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.n1n({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // vt is [le, ke, De]: interactive, SDK with an appended prompt, SDK.
  assert.deepEqual(Object.values(own), [...native.lines]);
  assert.deepEqual(Object.values(own).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.t1n) && !native.t1n(own.agent_sdk + ' '));
  // Upstream counts the first block only as the whole line (2026-10-21).
  const merged = { system: [t(native.lines[0] + '\n\nBe brief.')] };
  assert.deepEqual(applyBuildCliPrefix(merged, undefined, own, native.t1n, isBilling).system[0], t(own.agent_sdk));
  for (const line of native.lines) {
    const built = { system: [t(line)] };
    assert.deepEqual(applyBuildCliPrefix(structuredClone(built), { line: 'official_cli', fallback: 'official_cli' }, own, native.t1n, isBilling), built);
  }
});
