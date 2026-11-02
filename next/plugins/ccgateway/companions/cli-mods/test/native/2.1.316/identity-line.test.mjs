import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityLineFor } from '../../../request-policy.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.316');

// The line's text and its recognition are the CLI's own: request-build.js
// renders each contract name by passing p7n its three inputs, and the patched
// body's placement checks it with f7n. The recovered source is not in Git, so
// this is skipped, visibly, where it is absent.
// 2.1.316 names (2.1.312 in parentheses): chunk-w5ndchqs.js (chunk-pd06as9s.js),
// p7n (b6n), f7n (_6n), the lines oe/Ue/Ie (ie/Ue/Pe) in mt (ft) recognized
// through the set J, JXs (d2s), and the provider getter Te (Te).
const restoredChunk = new URL('chunk-w5ndchqs.js', restored);
test('the CLI renders one line per selector input and recognizes each as its own', { skip: nativeSkip('native f7n/p7n were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var oe="You are Claude Code[^;]*;/) + piece(/function f7n\(e\)\{[^}]*\}/) +
    piece(/function p7n\(e\)\{.*?return oe\}/) + ';({NVn:f7n,$Vn:p7n,lines:mt})', { Te: () => 'firstParty' });
  // The inputs request-build.js passes for each contract name.
  const rendered = {
    official_cli: native.$Vn({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // mt is [oe, Ue, Ie]: interactive, SDK with an appended prompt, SDK. The
  // three inputs select the three, and f7n recognizes exactly them.
  assert.deepEqual(Object.values(rendered), [...native.lines]);
  assert.deepEqual(Object.values(rendered).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.NVn) && !native.NVn(rendered.agent_sdk + ' '));
  // recordedCliPrefix is p7n's replay: a recorded value is returned as it is,
  // and null means the system carries no line (JXs drops a falsy line).
  assert.equal(native.$Vn({ recorded: rendered.official_cli_sdk }), rendered.official_cli_sdk);
  assert.equal(native.$Vn({ recorded: null }), null);
});

