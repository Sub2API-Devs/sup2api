import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = new URL('../../../../../../', import.meta.url);
const restored = new URL('artifacts/claude-2.1.304/linux-restored/', root);
const available = fs.existsSync(new URL('chunk-2gh4h0fv.js', restored));
const options = { skip: available ? false : 'Pristine CLI 2.1.304 source unavailable: native fingerprint oracle was not executed.' };
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
test('native fingerprint: indexing is UTF-16 code units including a lone sampled surrogate', options, () => {
  // Indexes 4,7,20 select high-surrogate, f, s. Node crypto encodes that lone
  // surrogate as U+FFFD; code-point indexing would select different characters.
  assert.equal(native().fromExpectedWire([user('abcd😀efghijklmnopqrstu')]), '2.1.304.e84');
});
