import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyDirectBilling } from '../direct-billing.js';
import { vocabulary } from './vocabulary.mjs';

// A stand-in for the CLI's own header line (kLo, the main thread's: prompt ID
// and turn); nothing copies CC wording.
const native = 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=sdk-cli; cch=00000; cc_prompt_id=p; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;';
const H = vocabulary.billingHeader;
const identity = 'You are a Claude agent, built on Anthropic\'s Claude Agent SDK.';
const send = (raw, policy = {}) => applyDirectBilling(raw, JSON.parse(raw), { policy, billingHeader: H, nativeBilling: () => native });
const system = raw => JSON.parse(raw).system;

// The body is the client's: a complete header that opens the system leaves it
// byte for byte, unusual spacing, key order and unsafe numbers included.
test('a complete leading header leaves the body byte for byte', () => {
  for (const raw of [
    `{"model":"m", "n":12345678901234567890,"system":[ {"cache_control":{"type":"ephemeral"},"text":"${H} cc_version=9.9.9.own; cc_entrypoint=cli;","type":"text"}, {"type":"text","text":"${identity}"}],"messages":[]}`,
    `{"model":"m","system":[{"type":"text","text":"${H} cc_version=1; cc_entrypoint=cli;"}],"messages":[]}`,
  ]) assert.equal(send(raw), raw);
});

// Level none is the billing header alone (2026-10-23): no identity line, ever.
test('a missing header goes first; nothing else is added and the rest of the body is untouched', () => {
  const raw = '{"model":"m",\n  "n":12345678901234567890,\n  "system":[{"type":"text","text":"Be brief.","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"user","content":"hi"}]}';
  assert.equal(send(raw), raw.replace('"system":[', '"system":[' + JSON.stringify({ type: 'text', text: native }) + ','));
  // The configured entrypoint is the one written.
  assert.deepEqual(system(send(raw, { build_billing_entrypoint: 'claude-vscode' })).map(b => b.text), [native.replace('sdk-cli', 'claude-vscode'), 'Be brief.']);
  // No system at all, and an empty one.
  assert.equal(send('{"model":"m","messages":[]}'), `{"model":"m","messages":[],"system":[${JSON.stringify({ type: 'text', text: native })}]}`);
  assert.deepEqual(system(send('{"model":"m","system":[],"messages":[]}')).map(b => b.text), [native]);
});

// A system direct adds goes where Claude Code 2.1.304 sends it: model,
// messages, system, then the rest (official-request-2.1.304.json); the
// client's own keys keep their order and bytes.
test('a system direct adds follows messages, in the official key order', () => {
  const official = JSON.parse(fs.readFileSync(new URL('./fixtures/official-request-2.1.304.json', import.meta.url), 'utf8'));
  const { system: _, ...client } = official;
  const out = send(JSON.stringify(client));
  assert.deepEqual(Object.keys(JSON.parse(out)), Object.keys(official));
  assert.equal(out, JSON.stringify(client).replace(/(,"tools":)/, `,"system":${JSON.stringify([{ type: 'text', text: native }])}$1`));
  // The client's spacing stays; messages before model still has it follow messages.
  assert.equal(send('{ "messages" : [ ] , "model":"m" }'), `{ "messages" : [ ],"system":${JSON.stringify([{ type: 'text', text: native }])} , "model":"m" }`);
  assert.deepEqual(Object.keys(JSON.parse(send('{"model":"m","max_tokens":1}'))), ['model', 'system', 'max_tokens']);
});

test('a header missing a field gets the native value in place', () => {
  const raw = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=9.9.9.own;","cache_control":{"type":"ephemeral"}},{"type":"text","text":"Be brief."}],"messages":[]}`;
  const out = send(raw, { build_billing_entrypoint: 'cli' });
  assert.deepEqual(system(out), [
    { type: 'text', text: `${H} cc_version=9.9.9.own; cc_entrypoint=cli;`, cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'Be brief.' }]);
  // Only the header text differs from the client's bytes.
  assert.equal(out, raw.replace(`${H} cc_version=9.9.9.own;"`, `${H} cc_version=9.9.9.own; cc_entrypoint=cli;"`));
});

// The two fields the console may give to the server: the native value
// replaces the client's in place, the other values stay.
test('a field the Worker owns gets the native value', () => {
  const raw = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=9.9.9.own; cc_entrypoint=cli; cch=12345;"}],"messages":[]}`;
  assert.equal(system(send(raw, { build_billing_sources: { cc_version: 'worker' } }))[0].text, `${H} cc_version=2.1.304.abc; cc_entrypoint=cli; cch=12345;`);
  assert.equal(system(send(raw, { build_billing_sources: { cc_entrypoint: 'worker' }, build_billing_entrypoint: 'sdk-py' }))[0].text, `${H} cc_version=9.9.9.own; cc_entrypoint=sdk-py; cch=12345;`);
  assert.equal(send(raw, { build_billing_sources: { cc_version: 'client', cc_entrypoint: 'client' } }), raw);
});

// Upstream reads only a header that opens the first block (429 otherwise): a
// header elsewhere stays as written and the native one goes in front.
test('a header that does not open the system gets the native one in front', () => {
  const later = { type: 'text', text: `${H} cc_version=9.9.9.own; cc_entrypoint=cli;` };
  const raw = JSON.stringify({ model: 'm', system: [{ type: 'text', text: 'Be brief.' }, later], messages: [] });
  assert.deepEqual(system(send(raw)), [{ type: 'text', text: native }, { type: 'text', text: 'Be brief.' }, later]);
});

// A string becomes blocks, as Claude Code sends every system (2026-10-23): a
// leading header line is its own block, the rest one block; the rest of the
// body stays byte for byte.
test('a string system becomes blocks with the header first', () => {
  const t = text => ({ type: 'text', text });
  const raw = '{"model":"m","system":"Be brief.","messages":[]}';
  assert.equal(send(raw), `{"model":"m","system":${JSON.stringify([t(native), t('Be brief.')])},"messages":[]}`);
  const complete = `{"system":"${H} cc_version=1; cc_entrypoint=sdk-ts;\\nBe brief.","model":"m","messages":[]}`;
  assert.deepEqual(system(send(complete)), [t(`${H} cc_version=1; cc_entrypoint=sdk-ts;`), t('Be brief.')]);
  const partial = `{"model":"m","system":"${H} cc_version=1;\\r\\nBe brief.","messages":[]}`;
  assert.deepEqual(system(send(partial, { build_billing_entrypoint: 'sdk-ts' })), [t(`${H} cc_version=1; cc_entrypoint=sdk-ts;`), t('Be brief.')]);
  assert.deepEqual(system(send(`{"model":"m","system":"${H} cc_version=1; cc_entrypoint=cli;","messages":[]}`)), [t(`${H} cc_version=1; cc_entrypoint=cli;`)]);
  const later = `{"model":"m","system":"Be brief.\\n${H} cc_version=1; cc_entrypoint=cli;","messages":[]}`;
  assert.deepEqual(system(send(later)), [t(native), t(`Be brief.\n${H} cc_version=1; cc_entrypoint=cli;`)]);
  assert.deepEqual(system(send('{"model":"m","system":"","messages":[]}')), [t(native)]);
});

test('without a native header or with an unusable system the body is forwarded', () => {
  for (const raw of ['{"model":"m","system":null,"messages":[]}', '{"model":"m","system":7,"messages":[]}']) assert.equal(send(raw), raw);
  const raw = '{"model":"m","system":[{"type":"text","text":"Be brief."}],"messages":[]}';
  assert.equal(applyDirectBilling(raw, JSON.parse(raw), { policy: {}, billingHeader: H, nativeBilling: () => '' }), raw);
  // A leading header the client wrote unusably (a repeated field) stays.
  const repeated = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=1; cc_version=2;"}],"messages":[]}`;
  assert.equal(send(repeated), repeated);
});
