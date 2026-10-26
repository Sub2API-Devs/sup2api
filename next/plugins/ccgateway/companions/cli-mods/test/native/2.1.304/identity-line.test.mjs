import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityLineFor } from '../../../request-policy.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.304');

// The line's text and its recognition are the CLI's own: request-build.js
// renders each contract name by passing n1n its three inputs, and the patched
// body's placement checks it with t1n. The recovered source is not in Git, so
// this is skipped, visibly, where it is absent.
const restoredChunk = new URL('chunk-t61vswm2.js', restored);
test('the CLI renders one line per selector input and recognizes each as its own', { skip: nativeSkip('native t1n/n1n were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var le="You are Claude Code[^;]*;/) + piece(/function t1n\(e\)\{[^}]*\}/) +
    piece(/function n1n\(e\)\{.*?return le\}/) + ';({t1n,n1n,lines:vt})', { Pe: () => 'firstParty' });
  // The inputs request-build.js passes for each contract name.
  const rendered = {
    official_cli: native.n1n({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.n1n({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.n1n({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // vt is [le, ke, De]: interactive, SDK with an appended prompt, SDK. The
  // three inputs select the three, and t1n recognizes exactly them.
  assert.deepEqual(Object.values(rendered), [...native.lines]);
  assert.deepEqual(Object.values(rendered).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.t1n) && !native.t1n(rendered.agent_sdk + ' '));
  // recordedCliPrefix is n1n's replay: a recorded value is returned as it is,
  // and null means the system carries no line (PAs drops a falsy line).
  assert.equal(native.n1n({ recorded: rendered.official_cli_sdk }), rendered.official_cli_sdk);
  assert.equal(native.n1n({ recorded: null }), null);
});

