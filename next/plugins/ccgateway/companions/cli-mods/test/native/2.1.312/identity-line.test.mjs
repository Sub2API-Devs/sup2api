import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityLineFor } from '../../../request-policy.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.312');

// The line's text and its recognition are the CLI's own: request-build.js
// renders each contract name by passing b6n its three inputs, and the patched
// body's placement checks it with _6n. The recovered source is not in Git, so
// this is skipped, visibly, where it is absent.
// 2.1.312 names (2.1.310 in parentheses): chunk-pd06as9s.js (chunk-f7aya6cs.js),
// b6n ($Vn), _6n (NVn), the lines ie/Ue/Pe (ne/Ue/Pe) in ft (ct), d2s (EFs),
// and the provider getter Te (Ae).
const restoredChunk = new URL('chunk-pd06as9s.js', restored);
test('the CLI renders one line per selector input and recognizes each as its own', { skip: nativeSkip('native _6n/b6n were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var ie="You are Claude Code[^;]*;/) + piece(/function _6n\(e\)\{[^}]*\}/) +
    piece(/function b6n\(e\)\{.*?return ie\}/) + ';({NVn:_6n,$Vn:b6n,lines:ft})', { Te: () => 'firstParty' });
  // The inputs request-build.js passes for each contract name.
  const rendered = {
    official_cli: native.$Vn({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // ft is [ie, Ue, Pe]: interactive, SDK with an appended prompt, SDK. The
  // three inputs select the three, and _6n recognizes exactly them.
  assert.deepEqual(Object.values(rendered), [...native.lines]);
  assert.deepEqual(Object.values(rendered).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.NVn) && !native.NVn(rendered.agent_sdk + ' '));
  // recordedCliPrefix is b6n's replay: a recorded value is returned as it is,
  // and null means the system carries no line (d2s drops a falsy line).
  assert.equal(native.$Vn({ recorded: rendered.official_cli_sdk }), rendered.official_cli_sdk);
  assert.equal(native.$Vn({ recorded: null }), null);
});

