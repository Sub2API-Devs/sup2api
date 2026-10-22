import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDirectBilling } from '../direct-billing.js';
import { vocabulary } from './vocabulary.mjs';

// Stand-ins for the CLI's own header line (kLo), identity lines (n1n), their
// recognizer (t1n) and header-block test (B1s); nothing copies CC wording.
const native = 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=sdk-cli; cch=00000;';
const lines = { official_cli: 'Interactive line.', official_cli_sdk: 'SDK appended line.', agent_sdk: 'SDK line.' };
const H = vocabulary.billingHeader;
const options = (policy = {}, oauth = true) => ({ policy, oauth, billingHeader: H, nativeBilling: () => native, lines,
  isPrefix: value => Object.values(lines).includes(value), isBilling: block => String(block.text).startsWith(H) });
const send = (raw, policy, oauth) => applyDirectBilling(raw, JSON.parse(raw), options(policy, oauth));
const system = raw => JSON.parse(raw).system;

// The body is the client's: a complete header that opens the system leaves it
// byte for byte, unusual spacing, key order and unsafe numbers included.
test('a complete leading header leaves the body byte for byte', () => {
  for (const raw of [
    `{"model":"m", "n":12345678901234567890,"system":[ {"cache_control":{"type":"ephemeral"},"text":"${H} cc_version=9.9.9.own; cc_entrypoint=cli;","type":"text"}, {"type":"text","text":"${lines.official_cli}"}],"messages":[]}`,
    `{"system":"${H} cc_version=1; cc_entrypoint=sdk-ts;\\nBe brief.","model":"m","messages":[]}`,
  ]) assert.equal(send(raw), raw);
  // Without OAuth no identity line is added either, as in build.
  const header = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=1; cc_entrypoint=cli;"}],"messages":[]}`;
  assert.equal(send(header, {}, false), header);
});

test('a missing header goes first; the rest of the body is untouched', () => {
  const raw = '{"model":"m",\n  "n":12345678901234567890,\n  "system":[{"type":"text","text":"Be brief.","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"user","content":"hi"}]}';
  const out = send(raw);
  assert.equal(out, raw.replace('"system":[', '"system":[' + JSON.stringify({ type: 'text', text: native }) + ',' + JSON.stringify({ type: 'text', text: lines.agent_sdk }) + ','));
  assert.equal(send(raw, {}, false), raw.replace('"system":[', '"system":[' + JSON.stringify({ type: 'text', text: native }) + ','));
  // The configured entrypoint is the one written, and it picks the line.
  assert.deepEqual(system(send(raw, { build_billing_entrypoint: 'claude-vscode' })).slice(0, 2).map(b => b.text), [native.replace('sdk-cli', 'claude-vscode'), lines.official_cli_sdk]);
  // No system at all, and an empty one.
  assert.equal(send('{"model":"m","messages":[]}'), `{"system":[${JSON.stringify({ type: 'text', text: native })},${JSON.stringify({ type: 'text', text: lines.agent_sdk })}],"model":"m","messages":[]}`);
  assert.deepEqual(system(send('{"model":"m","system":[],"messages":[]}')).map(b => b.text), [native, lines.agent_sdk]);
});

test('a header missing a field gets the native value in place', () => {
  const raw = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=9.9.9.own;","cache_control":{"type":"ephemeral"}},{"type":"text","text":"Be brief."}],"messages":[]}`;
  const out = send(raw, { build_billing_entrypoint: 'cli' });
  assert.deepEqual(system(out), [
    { type: 'text', text: `${H} cc_version=9.9.9.own; cc_entrypoint=cli;`, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: lines.official_cli }, { type: 'text', text: 'Be brief.' }]);
  // Only the header text and the inserted line differ from the client's bytes.
  assert.equal(out, raw.replace(`${H} cc_version=9.9.9.own;"`, `${H} cc_version=9.9.9.own; cc_entrypoint=cli;"`).replace(',{"type":"text","text":"Be brief."}', `,${JSON.stringify({ type: 'text', text: lines.official_cli })},{"type":"text","text":"Be brief."}`));
});

// Upstream reads only a header that opens the first block (429 otherwise): a
// header elsewhere stays as written and the native one goes in front.
test('a header that does not open the system gets the native one in front', () => {
  const later = { type: 'text', text: `${H} cc_version=9.9.9.own; cc_entrypoint=cli;` };
  const raw = JSON.stringify({ model: 'm', system: [{ type: 'text', text: 'Be brief.' }, later], messages: [] });
  assert.deepEqual(system(send(raw)), [{ type: 'text', text: native }, { type: 'text', text: lines.agent_sdk }, { type: 'text', text: 'Be brief.' }, later]);
  assert.deepEqual(system(send(raw, { build_identity_lines: { 'sdk-cli': 'none' } })), [{ type: 'text', text: native }, { type: 'text', text: 'Be brief.' }, later]);
});

test('the identity line follows the leading header entrypoint and is never replaced', () => {
  const body = (entry, ...rest) => JSON.stringify({ model: 'm', system: [{ type: 'text', text: `${H} cc_version=1; cc_entrypoint=${entry};` }, ...rest.map(text => ({ type: 'text', text }))], messages: [] });
  const second = (raw, policy) => system(send(raw, policy))[1]?.text;
  assert.equal(second(body('cli', 'p')), lines.official_cli);
  assert.equal(second(body('claude-desktop-3p', 'p')), lines.official_cli_sdk);
  assert.equal(second(body('sdk-py', 'p'), { build_identity_lines: { 'sdk-py': 'official_cli_sdk' } }), lines.official_cli_sdk);
  assert.equal(second(body('remote', 'p'), { build_billing_entrypoint: 'cli' }), lines.official_cli);
  for (const raw of [body('cli', 'p'), body('cli', lines.agent_sdk, 'p'), body('cli', 'p', lines.official_cli)]) {
    const policy = { build_identity_lines: { cli: 'none' } };
    if (raw === body('cli', 'p')) assert.equal(send(raw, policy), raw);
    else assert.equal(send(raw, {}), raw, 'a client line stays');
  }
});

// A string keeps its type: the header opens it and a newline separates it
// from the client's text (upstream accepts this, 2026-10-22). A string cannot
// carry a separate identity line.
test('a string system gets the header at its start', () => {
  const raw = '{"model":"m","system":"Be brief.","messages":[]}';
  assert.equal(send(raw), `{"model":"m","system":${JSON.stringify(native + '\nBe brief.')},"messages":[]}`);
  const partial = `{"model":"m","system":"${H} cc_version=1;\\nBe brief.","messages":[]}`;
  assert.equal(system(send(partial, { build_billing_entrypoint: 'sdk-ts' })), `${H} cc_version=1; cc_entrypoint=sdk-ts;\nBe brief.`);
  const later = `{"model":"m","system":"Be brief.\\n${H} cc_version=1; cc_entrypoint=cli;","messages":[]}`;
  assert.equal(system(send(later)), `${native}\nBe brief.\n${H} cc_version=1; cc_entrypoint=cli;`);
});

test('without a native header or with an unusable system the body is forwarded', () => {
  for (const raw of ['{"model":"m","system":null,"messages":[]}', '{"model":"m","system":7,"messages":[]}']) assert.equal(send(raw), raw);
  const raw = '{"model":"m","system":[{"type":"text","text":"Be brief."}],"messages":[]}';
  const out = applyDirectBilling(raw, JSON.parse(raw), { ...options({}, false), nativeBilling: () => '' });
  assert.equal(out, raw);
  // A leading header the client wrote unusably (a repeated field) stays.
  const repeated = `{"model":"m","system":[{"type":"text","text":"${H} cc_version=1; cc_version=2;"}],"messages":[]}`;
  assert.equal(send(repeated, {}, false), repeated);
});
