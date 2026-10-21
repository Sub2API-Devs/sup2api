import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { applyBuildCliPrefix } from '../request-identity.js';
import { vocabulary } from './vocabulary.mjs';

// The functions take the CLI's recognizer (t1n) and line (n1n) as arguments;
// these lines stand in for them, so nothing here depends on a copy of the
// CLI's wording. The last test runs the real t1n/n1n.
const lines = ['CLI line A.', 'CLI line B.', 'CLI line C.'];
const isPrefix = value => lines.includes(value);
// Stands in for CC's B1s: a block whose text starts with the native header.
const isBilling = block => typeof block.text === 'string' && block.text.startsWith(vocabulary.billingHeader);
const cliPrefix = lines[2];
const [interactive, sdk] = lines;
const prefix = { type: 'text', text: cliPrefix };
const t = text => ({ type: 'text', text });
const header = vocabulary.billingHeader + ' cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;';
const prompt = 'Answer the user concisely.';

test('only a line the CLI recognizes is inserted', () => {
  assert.throws(() => applyBuildCliPrefix({}, 'not a CLI line', isPrefix, isBilling), /native Claude Code system line/);
});

// Where upstream accepts the line (2026-10-21): first block, or anywhere after
// a leading attribution header. Everywhere else it is added where CC puts it.
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
  for (const [name, system, expected] of cases) {
    const built = system === undefined ? { model: 'fixture' } : { model: 'fixture', system: structuredClone(system) };
    assert.deepEqual(applyBuildCliPrefix(built, cliPrefix, isPrefix, isBilling).system, expected ?? system, name);
  }
});

// Direct is a pure passthrough (2026-10-21 decision): the body goes out byte
// for byte. Build adds the line for OAuth only.
test('claude request adds the line to OAuth build only; direct is unchanged', async () => {
  const { default: fsp } = await import('node:fs/promises');
  const { default: os } = await import('node:os');
  const { spawn } = await import('node:child_process');
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-cli-prefix-'));
  try {
    await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    for (const name of ['request-command', 'request-options', 'request-output', 'request-error', 'request-identity']) {
      await fsp.copyFile(new URL('../' + name + '.js', import.meta.url), path.join(dir, 'ccgateway-' + name + '.js'));
    }
    for (const [name, code] of Object.entries({
      'chunk-gr4a0fky.js': 'export class rbe {} export const eF=async()=>new rbe(); export const Zre=()=>{};',
      'chunk-0ycjphb5.js': 'export const El=()=>({});',
      'chunk-6dwnw6av.js': 'export const YEr=()=>true;',
      'ccgateway-request-build.js': 'export const buildRequest=async body=>({body:{model:body.model,system:[{type:"text",text:"built"}]},headers:{}});',
      // Records exactly what would be sent, then answers with an HTTP error.
      'ccgateway-model-request.js': `import fs from 'node:fs/promises';
        export const checkModelRequest=()=>null;
        export const openModelRequest=async o=>{const b=o.transformBody?o.transformBody(o.rawBody??o.body):o.rawBody??o.body;
          await fs.writeFile('sent.json',typeof b==='string'?b:JSON.stringify(b));return {id:'x',ok:false,status:400,headers:{}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async()=>({done:true,bytes:new Uint8Array()});`,
      'run.mjs': `import {runRequestCommand} from './ccgateway-request-command.js';
        import {applyBuildCliPrefix} from './ccgateway-request-identity.js';
        const line=${JSON.stringify(cliPrefix)},isPrefix=v=>${JSON.stringify(lines)}.includes(v),isBilling=b=>String(b.text).startsWith(${JSON.stringify(vocabulary.billingHeader)});
        process.exitCode=await runRequestCommand(process.argv.slice(2),{prefixBuild:b=>applyBuildCliPrefix(b,line,isPrefix,isBilling)});`,
    })) await fsp.writeFile(path.join(dir, name), code);
    const input = '{"model":"fixture","system":"Be brief.","metadata":{"user_id":"client"},"messages":[{"role":"user","content":"hi"}]}';
    const run = (mode, apiKey) => new Promise((resolve, reject) => {
      const env = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = 'fixture'; else delete env.ANTHROPIC_API_KEY;
      const child = spawn(process.execPath, ['run.mjs', mode], { cwd: dir, env });
      child.on('error', reject);
      child.on('close', async () => resolve(await fsp.readFile(path.join(dir, 'sent.json'), 'utf8')));
      child.stdin.end(input);
    });
    assert.equal(await run('--direct', false), input);
    assert.equal(await run('--direct', true), input);
    assert.deepEqual(JSON.parse(await run('--build', false)).system, [prefix, t('built')]);
    assert.deepEqual(JSON.parse(await run('--build', true)).system, [t('built')]);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

// The real recognizer and selector from the recovered CLI (2.1.304
// chunk-t61vswm2.js: the le/ke/De declaration, t1n and n1n). The recovered
// source is not in Git, so this is skipped, visibly, where it is absent.
const restored = new URL('../../../../../../artifacts/claude-2.1.304/linux-restored/chunk-t61vswm2.js', import.meta.url);
test('the CLI recognizes its own lines and gives the claude -p line', { skip: fs.existsSync(restored) ? false : 'Recovered CLI 2.1.304 source unavailable: native t1n/n1n were not executed.' }, () => {
  const chunk = fs.readFileSync(restored, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var le="You are Claude Code[^;]*;/) + piece(/function t1n\(e\)\{[^}]*\}/) +
    piece(/function n1n\(e\)\{.*?return le\}/) + ';({t1n,n1n,lines:vt})', { Pe: () => 'firstParty' });
  // The line the patched request command asks for: a non-interactive session
  // without an appended prompt, as `claude -p` with its sdk-cli entrypoint.
  const line = native.n1n({ isNonInteractive: true, hasAppendSystemPrompt: false });
  assert.equal(line, native.lines[2]);
  assert.equal(native.lines.length, 3);
  assert(native.lines.every(native.t1n) && native.t1n(line) && !native.t1n(line + ' '));
  // Upstream counts the first block only as the whole line (2026-10-21).
  const merged = { system: [t(native.lines[0] + '\n\nBe brief.')] };
  assert.deepEqual(applyBuildCliPrefix(merged, line, native.t1n, isBilling).system[0], t(line));
  for (const own of native.lines) {
    const built = { system: [t(own)] };
    assert.deepEqual(applyBuildCliPrefix(structuredClone(built), line, native.t1n, isBilling), built);
  }
});
