import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBuildCliPrefix, directCliPrefix, cliPrefix } from '../request-identity.js';

const prefix = { type: 'text', text: cliPrefix };
const t = text => ({ type: 'text', text });
const header = 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=cli;';
const sdk = "You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.";
const agent = "You are a Claude agent, built on Anthropic's Claude Agent SDK.";
const prompt = 'Answer the user concisely.';

// Where upstream accepts the line (2026-10-21): first block, or anywhere after
// a leading attribution header. Everywhere else it is added where CC puts it.
const cases = [
  ['absent', undefined, [prefix]],
  ['empty', [], [prefix]],
  ['prompt only', [t(prompt)], [prefix, t(prompt)]],
  ['header first', [t(header), t(prompt)], [t(header), prefix, t(prompt)]],
  ['header only', [t(header)], [t(header), prefix]],
  ['line merged into a prompt block', [t(cliPrefix + '\n\n' + prompt)], [prefix, t(cliPrefix + '\n\n' + prompt)]],
  ['line after the prompt', [t(prompt), t(cliPrefix)], [prefix, t(prompt), t(cliPrefix)]],
  ['header after the prompt', [t(prompt), t(header)], [prefix, t(prompt), t(header)]],
  ['line first', [t(cliPrefix), t(prompt)], null],
  ['cached line first', [{ ...t(cliPrefix), cache_control: { type: 'ephemeral' } }, t(prompt)], null],
  ['SDK line first', [t(sdk), t(prompt)], null],
  ['agent line after header', [t(header), t(agent), t(prompt)], null],
  ['line anywhere after header', [t(header), t(prompt), t(cliPrefix)], null],
];

test('build requests open with Claude Code line where CC puts it', () => {
  for (const [name, system, expected] of cases) {
    const built = system === undefined ? { model: 'fixture' } : { model: 'fixture', system: structuredClone(system) };
    assert.deepEqual(applyBuildCliPrefix(built).system, expected ?? system, name);
  }
});

test('direct bodies get the line by insertion only', () => {
  for (const [name, system, expected] of cases) {
    const raw = system === undefined ? '{ "model":"fixture", "n":9007199254740993 }'
      : `{ "model":"fixture", "system" : ${JSON.stringify(system, null, 1)} , "n":9007199254740993 }`;
    const out = directCliPrefix(raw);
    assert.deepEqual(JSON.parse(out).system, expected ?? system, name);
    assert(out.includes('9007199254740993'), name);
    if (!expected) assert.equal(out, raw, name);
    else assert.equal(out.length, raw.length + JSON.stringify(prefix).length + (system?.length ? 1 : (system ? 0 : '"system":[],'.length)), name);
  }
});

test('direct string, empty and odd systems', () => {
  const raw = '{"system":"Be brief.\\n","messages":[]}';
  assert.equal(directCliPrefix(raw), `{"system":[${JSON.stringify(prefix)},{"type":"text","text":"Be brief.\\n"}],"messages":[]}`);
  assert.deepEqual(JSON.parse(directCliPrefix('{"system":"","messages":[]}')).system, [prefix]);
  assert.equal(directCliPrefix('{}'), `{"system":[${JSON.stringify(prefix)}]}`);
  for (const raw of ['{"system":null}', '{"system":7}', '{"system":{"type":"text"}}']) assert.equal(directCliPrefix(raw), raw);
});

test('claude request adds the line for OAuth only, in both modes', async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: os } = await import('node:os');
  const { default: path } = await import('node:path');
  const { spawn } = await import('node:child_process');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-cli-prefix-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    for (const name of ['request-command', 'request-options', 'request-output', 'request-error', 'request-identity']) {
      await fs.copyFile(new URL('../' + name + '.js', import.meta.url), path.join(dir, 'ccgateway-' + name + '.js'));
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
        import {directCliPrefix,applyBuildCliPrefix} from './ccgateway-request-identity.js';
        process.exitCode=await runRequestCommand(process.argv.slice(2),{prefixBody:directCliPrefix,prefixBuild:applyBuildCliPrefix});`,
    })) await fs.writeFile(path.join(dir, name), code);
    const input = '{"model":"fixture","system":"Be brief.","messages":[{"role":"user","content":"hi"}]}';
    const run = (mode, apiKey) => new Promise((resolve, reject) => {
      const env = { ...process.env };
      if (apiKey) env.ANTHROPIC_API_KEY = 'fixture'; else delete env.ANTHROPIC_API_KEY;
      const child = spawn(process.execPath, ['run.mjs', mode], { cwd: dir, env });
      child.on('error', reject);
      child.on('close', async () => resolve(await fs.readFile(path.join(dir, 'sent.json'), 'utf8')));
      child.stdin.end(input);
    });
    assert.deepEqual(JSON.parse(await run('--direct', false)).system, [prefix, t('Be brief.')]);
    assert.deepEqual(JSON.parse(await run('--build', false)).system, [prefix, t('built')]);
    assert.equal(await run('--direct', true), input);
    assert.deepEqual(JSON.parse(await run('--build', true)).system, [t('built')]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
