// The request command's entry is a support module the patched CLI entry loads
// (request-entry.inc.js is a stub). Its wiring is ordinary code here: CC's own
// fast-path policy first, then the command with the native bindings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installSupport, linkNatives } from './support.mjs';

// The modules the entry, the command and the native bindings import: native
// stubs that record what they were given, and a command stand-in that reports
// how the entry called it.
const chunks = {
  'stub-policy.js': `import fs from 'node:fs';
    export const loadFastPathPolicy = async settings => { fs.writeFileSync(process.env.CCG_FIXTURE_DIR + '/policy.json', JSON.stringify(settings ?? null)); return process.env.CCG_FIXTURE_REFUSED === '1'; };`,
  'stub-betas.js': 'export const oauthBeta = Object.freeze({ name: "oauth_auth", header: "oauth-fixture" }); export const betasAllowed = betas => betas; export const _ke = class {}; export const sF = async () => new _ke(); export const mle = () => {};',
  'stub-identity.js': 'export const requestIdentity = () => ({ user_id: "native" }); export const attributionHeader = () => ["native-header"];',
  'stub-billing.js': 'export const billingHeaderPrefix = "x-anthropic-billing-header:";',
  'stub-reminder.js': 'export const reminderOpen = "<system-reminder>"; export const reminderClose = "</system-reminder>";',
  'stub-fingerprint.js': 'export const attributionFingerprint = messages => "fingerprint";',
  'stub-context.js': 'export const mainAgentContext = () => ({}); export const modelBetas = () => [];',
  'stub-query-source.js': 'export const querySourceFor = (type, builtIn) => builtIn ? "agent:builtin:" + type : "agent:custom";',
  'stub-core.js': 'export const ccgatewayLayerVocabulary = () => ({ loopHeaders: {} }); export const ccgatewayPromptTurn = () => ({});',
  'stub-transport.js': 'export class AnthropicClient {} export const createClient = async () => new AnthropicClient(); export const modelFetch = () => {};',
  'stub-session.js': 'export const getRootSession = () => ({}); export const setEntrypointOnRequests = () => {};',
  'ccgateway-request-command.js': `import fs from 'node:fs';
    export const runRequestCommand = async (args, natives) => {
      fs.writeFileSync(process.env.CCG_FIXTURE_DIR + '/command.json', JSON.stringify({ args, natives: Object.keys(natives).sort(), oauthBeta: natives.oauthBeta,
        agentNative: Object.keys(natives.agentNative).sort(),
        identityBuild: typeof natives.identityBuild, directBuild: typeof natives.directBuild }));
      return 0;
    };`,
};

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-request-entry-'));
  await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  await installSupport(dir);
  for (const [name, code] of Object.entries(chunks)) await fs.writeFile(path.join(dir, name), code);
  await linkNatives(dir);
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
    assert.deepEqual(command.natives, ['agentNative', 'directBuild', 'identityBuild', 'oauthBeta']);
    assert.equal(command.oauthBeta, 'oauth-fixture', 'the login\'s beta is the native one');
    assert.deepEqual(command.agentNative, ['entrypoint', 'leadingBilling', 'loopHeaders', 'prompt', 'querySourceFor', 'requestBilling', 'turn']);
    assert.equal(command.identityBuild, 'function');
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
