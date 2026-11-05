import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { identityLineFor } from '../../../request-policy.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.318');

// The line's text and its recognition are the CLI's own: request-build.js
// renders each contract name by passing tcr its three inputs, and the patched
// body's placement checks it with ecr. The recovered source is not in Git, so
// this is skipped, visibly, where it is absent.
// 2.1.318 names (2.1.316 in parentheses): chunk-7pwjpdkw.js (chunk-w5ndchqs.js),
// tcr (p7n), ecr (f7n), the lines ae/Ie/ke (oe/Ue/Ie) in yt (mt) recognized
// through the set te, tyi (JXs), and the provider getter Ae (Te).
const restoredChunk = new URL('chunk-7pwjpdkw.js', restored);
test('the CLI renders one line per selector input and recognizes each as its own', { skip: nativeSkip('native ecr/tcr were') }, () => {
  const chunk = fs.readFileSync(restoredChunk, 'utf8');
  const piece = pattern => { const m = chunk.match(pattern); assert(m, String(pattern)); return m[0]; };
  const native = vm.runInNewContext(piece(/var ae="You are Claude Code[^;]*;/) + piece(/function ecr\(e\)\{[^}]*\}/) +
    piece(/function tcr\(e\)\{.*?return ae\}/) + ';({NVn:ecr,$Vn:tcr,lines:yt})', { Ae: () => 'firstParty' });
  // The inputs request-build.js passes for each contract name.
  const rendered = {
    official_cli: native.$Vn({ isNonInteractive: false, hasAppendSystemPrompt: false }),
    official_cli_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: true }),
    agent_sdk: native.$Vn({ isNonInteractive: true, hasAppendSystemPrompt: false }),
  };
  // yt is [ae, Ie, ke]: interactive, SDK with an appended prompt, SDK. The
  // three inputs select the three, and ecr recognizes exactly them.
  assert.deepEqual(Object.values(rendered), [...native.lines]);
  assert.deepEqual(Object.values(rendered).map(line => line.length), [57, 94, 62]);
  assert(native.lines.every(native.NVn) && !native.NVn(rendered.agent_sdk + ' '));
  // recordedCliPrefix is tcr's replay: a recorded value is returned as it is,
  // and null means the system carries no line (tyi drops a falsy line).
  assert.equal(native.$Vn({ recorded: rendered.official_cli_sdk }), rendered.official_cli_sdk);
  assert.equal(native.$Vn({ recorded: null }), null);
});

