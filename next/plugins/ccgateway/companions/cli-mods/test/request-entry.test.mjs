// The request command's entry is a support module the patched CLI entry loads
// (request-entry.inc.js is a stub). Its wiring is ordinary code here: CC's own
// fast-path policy first, then the command with the native bindings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installSupport } from './support.mjs';

// The modules the entry, the command and the native bindings import: native
// stubs that record what they were given, and a command stand-in that reports
// how the entry called it.
const chunks = {
  'chunk-3nrrbnwj.js': `import fs from 'node:fs';
    export const loadFastPathPolicy = async settings => { fs.writeFileSync(process.env.CCG_FIXTURE_DIR + '/policy.json', JSON.stringify(settings ?? null)); return process.env.CCG_FIXTURE_REFUSED === '1'; };`,
  'chunk-4qs43hr1.js': 'export const gTe = Object.freeze({ name: "oauth_auth", header: "oauth-fixture" }); export const mBr = betas => betas; export const _ke = class {}; export const sF = async () => new _ke(); export const mle = () => {};',
  'chunk-t61vswm2.js': 'export const yBe = () => ({ user_id: "native" }); export const t1n = () => true; export const n1n = options => JSON.stringify(options); export const PAs = () => ["native-header"];',
  'chunk-7y2kvacy.js': 'export const B1s = () => false; export const oJe = "x-anthropic-billing-header:";',
  'chunk-jkcb7qdd.js': 'export const KF = "<system-reminder>"; export const lKe = "</system-reminder>";',
  'chunk-2gh4h0fv.js': 'export const RIs = messages => "fingerprint";',
  'chunk-7p6jp6kj.js': 'export const Al = () => ({}); export const S8n = () => [];',
  'chunk-m5q1b1c4.js': 'export const Zoe = (type, builtIn) => builtIn ? "agent:builtin:" + type : "agent:custom";',
  'chunk-rncrmfyt.js': 'export const ccgatewayLayerVocabulary = () => ({ loopHeaders: {} }); export const ccgatewayPromptTurn = () => ({});',
  'chunk-38xgev2z.js': 'export class _ke {} export const sF = async () => new _ke(); export const mle = () => {};',
  'chunk-72vwyp9d.js': 'export const getRootSession = () => ({}); export const setEntrypointOnRequests = () => {};',
  'ccgateway-request-command.js': `import fs from 'node:fs';
    export const runRequestCommand = async (args, natives) => {
      fs.writeFileSync(process.env.CCG_FIXTURE_DIR + '/command.json', JSON.stringify({ args, natives: Object.keys(natives).sort(), oauthBeta: natives.oauthBeta,
        agentNative: Object.keys(natives.agentNative).sort(),
        identityBuild: typeof natives.identityBuild, prefixBuild: typeof natives.prefixBuild, directBuild: typeof natives.directBuild }));
      return 0;
    };`,
};

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-request-entry-'));
  await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  await installSupport(dir);
  for (const [name, code] of Object.entries(chunks)) await fs.writeFile(path.join(dir, name), code);
  process.env.CCG_FIXTURE_DIR = dir;
  const entry = await import(pathToFileURL(path.join(dir, 'ccgateway-request-entry.js')));
  const read = async name => JSON.parse(await fs.readFile(path.join(dir, name), 'utf8').catch(() => 'null'));
  return { dir, entry, read };
}

const settings = { fastPath: 'fixture' };
test('the entry asks CC\'s fast-path policy, then runs the command with its native bindings', async () => {
  const f = await fixture();
  try {
    const previous = process.env.CCG_FIXTURE_REFUSED;
    delete process.env.CCG_FIXTURE_REFUSED;
    try {
      assert.equal(await f.entry.runRequest(['--build', 'body.json'], settings), 0);
    } finally {
      if (previous !== undefined) process.env.CCG_FIXTURE_REFUSED = previous;
    }
    assert.deepEqual(await f.read('policy.json'), settings, 'the settings source CC gives the policy');
    const command = await f.read('command.json');
    assert.deepEqual(command.args, ['--build', 'body.json']);
    assert.deepEqual(command.natives, ['agentNative', 'directBuild', 'identityBuild', 'oauthBeta', 'prefixBuild']);
    assert.equal(command.oauthBeta, 'oauth-fixture', 'the login\'s beta is the native one');
    assert.deepEqual(command.agentNative, ['entrypoint', 'leadingBilling', 'loopHeaders', 'prompt', 'querySourceFor', 'requestBilling', 'turn']);
    assert.equal(command.identityBuild, 'function');
    assert.equal(command.prefixBuild, 'function');
    assert.equal(command.directBuild, 'function');
  } finally { delete process.env.CCG_FIXTURE_DIR; await fs.rm(f.dir, { recursive: true, force: true }); }
});

// A refused request is the shared 403 frame, sent without loading the command.
test('a policy refusal is a 403 error frame, and the command never runs', async () => {
  const f = await fixture();
  try {
    process.env.CCG_FIXTURE_REFUSED = '1';
    let returned;
    try { returned = await f.entry.runRequest(['--build'], settings); }
    finally { delete process.env.CCG_FIXTURE_REFUSED; }
    assert.equal(returned, 1);
    assert.equal(await f.read('command.json'), null);
  } finally { delete process.env.CCG_FIXTURE_DIR; await fs.rm(f.dir, { recursive: true, force: true }); }
});
