import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fingerprintMessages } from '../../../request-input.js';
import { vocabulary } from '../../vocabulary.mjs';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource, fixture } = pinned('2.1.310');
const require = createRequire(import.meta.url);
const options = { skip: nativeSkip('native fingerprint oracle was') };
let oracle;
function native() {
  // Loading the oracle validates the full native source hash. Changed baselines
  // fail explicitly; missing optional artifacts are the only skip condition.
  return oracle ??= require('./billing-fingerprint-oracle.cjs').createOracle(fileURLToPath(restored));
}
const sample = '012345678901234567890123';
const user = content => ({ role: 'user', content });
// Expected values differ from 2.1.304 only because the VERSION literal that
// Tf (2.1.304 Eg) hashes after the salt is now "2.1.310": the salt
// (59cf53e54c78), the sampled indexes [4,7,20] and the "0" placeholder are
// unchanged in fWs/Tf/GL. Each value was computed both by this oracle (native
// code in a vm) and by hand as sha256(salt + sampled + "2.1.310")[0:3]; the
// same hand formula with "2.1.304" reproduces the 2.1.304 values
// (2b0 -> 077, f21 -> 32c, e81 -> 76e, e84 -> 4e9).

test('native fingerprint: empty and missing text use three zero placeholders', options, () => {
  assert.equal(native().fromExpectedWire([]), '2.1.310.077');
  assert.equal(native().fromExpectedWire([user([]), user(sample)]), '2.1.310.077');
  assert.equal(native().fromExpectedWire([user('')]), '2.1.310.077');
});
test('native fingerprint: first non-meta user record wins', options, () => {
  assert.equal(native().fromNativeRecords([
    { type: 'assistant', message: { content: 'ignore assistant' } },
    { type: 'user', isMeta: true, message: { content: 'ignore native meta' } },
    { type: 'user', message: { content: sample } },
    { type: 'user', message: { content: 'ignore later user' } },
  ]), '2.1.310.32c');
});
test('native fingerprint: a block array contributes only its first text block', options, () => {
  assert.equal(native().fromExpectedWire([user([
    { type: 'image', source: { type: 'url', url: 'fixture' } },
    { type: 'text', text: sample },
    { type: 'text', text: 'another text is not concatenated' },
  ])]), '2.1.310.32c');
});
test('native fingerprint: wire isMeta is not lifted onto an internal record', options, () => {
  assert.equal(native().fromExpectedWire([{ ...user(sample), isMeta: true }, user('later')]), '2.1.310.32c');
});
test('native fingerprint: only sampled positions affect the digest', options, () => {
  assert.equal(native().fromExpectedWire([user(sample)]), '2.1.310.32c');
  assert.equal(native().fromExpectedWire([user('A' + sample.slice(1))]), '2.1.310.32c');
  assert.equal(native().fromExpectedWire([user(sample.slice(0, 4) + 'X' + sample.slice(5))]), '2.1.310.76e');
});
// CC fingerprints the first user text before its reminders become message
// blocks; on the wire that text sits after them. Build hashes the records the
// patch hands fWs (fingerprintMessages), so a real `claude -p` request must
// give back the cc_version in its own header (2026-10-21 fix).
// The capture must be the unmodified official 2.1.310 client's own request
// (fixtures/official-request-2.1.310.json); a 2.1.304 capture carries a
// 2.1.304 cc_version and cannot stand in for it, so a missing capture fails
// here instead of being substituted.
test('build fingerprints the text CC fingerprinted, not the leading reminder', options, () => {
  const capture = fixture('official-request');
  assert(fs.existsSync(capture), `official 2.1.310 capture missing: ${fileURLToPath(capture)} (capture the unmodified 2.1.310 client; do not copy the 2.1.304 one)`);
  const official = JSON.parse(fs.readFileSync(capture, 'utf8'));
  const sent = official.system[0].text.match(/cc_version=([^;]+);/)[1];
  assert.match(sent, /^2\.1\.310\./, 'the capture is from the 2.1.310 client');
  assert.equal(native().fromNativeRecords(fingerprintMessages(official.messages, vocabulary.reminder[0])), sent);
  assert.notEqual(native().fromExpectedWire(official.messages), sent);
});
test('fingerprintMessages picks the first user text that is not a reminder', () => {
  const reminder = vocabulary.reminder[0];
  const text = records => records[0].message.content;
  assert.equal(text(fingerprintMessages([user('plain')], reminder)), 'plain');
  assert.equal(text(fingerprintMessages([{ role: 'assistant', content: 'no' }, user([{ type: 'image' }, { type: 'text', text: reminder + 'x' }, { type: 'text', text: 'second' }])], reminder)), 'second');
  assert.equal(text(fingerprintMessages([user([{ type: 'text', text: '  ' + reminder }])], reminder)), '');
  assert.equal(text(fingerprintMessages([], reminder)), '');
});
test('native fingerprint: indexing is UTF-16 code units including a lone sampled surrogate', options, () => {
  // Indexes 4,7,20 select high-surrogate, f, s. Node crypto encodes that lone
  // surrogate as U+FFFD; code-point indexing would select different characters.
  assert.equal(native().fromExpectedWire([user('abcd😀efghijklmnopqrstu')]), '2.1.310.4e9');
});
