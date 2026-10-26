import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityLineFor } from '../../../request-policy.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.310');

// The line's text and its recognition are the CLI's own: request-build.js
// renders each contract name by passing $Vn its three inputs, and the patched
// body's placement checks it with NVn. The recovered source is not in Git, so
// this is skipped, visibly, where it is absent.
// 2.1.310 names (2.1.304 in parentheses): chunk-f7aya6cs.js (chunk-t61vswm2.js),
// $Vn (n1n), NVn (t1n), the lines ne/Ue/Pe (le/ke/De) in ct (vt), EFs (PAs),
// and the provider getter Ae (Pe; Pe is now the SDK line's constant).
const restoredChunk = new URL('chunk-f7aya6cs.js', restored);
test('the CLI renders one line per selector input and recognizes each as its own', { skip: nativeSkip('native NVn/$Vn were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var ne="You are Claude Code[^;]*;/) + piece(/function NVn\(e\)\{[^}]*\}/) +
    piece(/function \$Vn\(e\)\{.*?return ne\}/) + ';({NVn,$Vn,lines:ct})', { Ae: () => 'firstParty' });
  // The inputs request-build.js passes for each contract name.
  const rendered = {
    official_cli: native.$Vn({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // ct is [ne, Ue, Pe]: interactive, SDK with an appended prompt, SDK. The
  // three inputs select the three, and NVn recognizes exactly them.
  assert.deepEqual(Object.values(rendered), [...native.lines]);
  assert.deepEqual(Object.values(rendered).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.NVn) && !native.NVn(rendered.agent_sdk + ' '));
  // recordedCliPrefix is $Vn's replay: a recorded value is returned as it is,
  // and null means the system carries no line (EFs drops a falsy line).
  assert.equal(native.$Vn({ recorded: rendered.official_cli_sdk }), rendered.official_cli_sdk);
  assert.equal(native.$Vn({ recorded: null }), null);
});

