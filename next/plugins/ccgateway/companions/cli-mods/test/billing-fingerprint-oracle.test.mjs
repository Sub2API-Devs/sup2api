import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fingerprintMessages } from '../request-input.js';
import { vocabulary } from './vocabulary.mjs';
import { restored, nativeSkip } from './artifacts.mjs';
const require = createRequire(import.meta.url);
const options = { skip: nativeSkip('native fingerprint oracle was') };
let oracle;
function native() {
  // Loading the oracle validates the full native source hash. Changed baselines
  // fail explicitly; missing optional artifacts are the only skip condition.
  return oracle ??= require('./analysis/billing-fingerprint-oracle.cjs').createOracle(fileURLToPath(restored));
}
const sample = '012345678901234567890123';
const user = content => ({ role: 'user', content });

test('native fingerprint: empty and missing text use three zero placeholders', options, () => {
  assert.equal(native().fromExpectedWire([]), '2.1.304.2b0');
  assert.equal(native().fromExpectedWire([user([]), user(sample)]), '2.1.304.2b0');
  assert.equal(native().fromExpectedWire([user('')]), '2.1.304.2b0');
});
test('native fingerprint: first non-meta user record wins', options, () => {
  assert.equal(native().fromNativeRecords([
    { type: 'assistant', message: { content: 'ignore assistant' } },
    { type: 'user', isMeta: true, message: { content: 'ignore native meta' } },
    { type: 'user', message: { content: sample } },
    { type: 'user', message: { content: 'ignore later user' } },
  ]), '2.1.304.f21');
});
test('native fingerprint: a block array contributes only its first text block', options, () => {
  assert.equal(native().fromExpectedWire([user([
    { type: 'image', source: { type: 'url', url: 'fixture' } },
    { type: 'text', text: sample },
    { type: 'text', text: 'another text is not concatenated' },
  ])]), '2.1.304.f21');
});
test('native fingerprint: wire isMeta is not lifted onto an internal record', options, () => {
  assert.equal(native().fromExpectedWire([{ ...user(sample), isMeta: true }, user('later')]), '2.1.304.f21');
});
test('native fingerprint: only sampled positions affect the digest', options, () => {
  assert.equal(native().fromExpectedWire([user(sample)]), '2.1.304.f21');
  assert.equal(native().fromExpectedWire([user('A' + sample.slice(1))]), '2.1.304.f21');
  assert.equal(native().fromExpectedWire([user(sample.slice(0, 4) + 'X' + sample.slice(5))]), '2.1.304.e81');
});
// CC fingerprints the first user text before its reminders become message
// blocks; on the wire that text sits after them. Build hashes the records the
// patch hands RIs (fingerprintMessages), so a real `claude -p` request must
// give back the cc_version in its own header (2026-10-21 fix).
test('build fingerprints the text CC fingerprinted, not the leading reminder', options, () => {
  const official = JSON.parse(fs.readFileSync(new URL('fixtures/official-request-2.1.304.json', import.meta.url), 'utf8'));
  const sent = official.system[0].text.match(/cc_version=([^;]+);/)[1];
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
  assert.equal(native().fromExpectedWire([user('abcd😀efghijklmnopqrstu')]), '2.1.304.e84');
});
