/**
 * utils/terminalShutdown.ts
 *
 * 2.1.316 新增：终端关闭锁存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-7kayq7nc.js:166231-166253 placement
class TerminalShutdownLatch {
  committed = false;
}
//@ chunk-7kayq7nc.js:166253-166267 placement
var terminalShutdownLatch = new TerminalShutdownLatch();
//@ chunk-7kayq7nc.js:166267-166301 placement
function isTerminalShutdown() {
  return terminalShutdownLatch.committed;
}
//@ chunk-7kayq7nc.js:166301-166332 placement
function latchTerminalShutdown() {
  terminalShutdownLatch.committed = true;
}
//@ chunk-7kayq7nc.js:166332-166359 placement
var NEVER_RESOLVING = new Promise(() => {});
//@ chunk-7kayq7nc.js:166359-166383 placement
function heldUntilExit() {
  return NEVER_RESOLVING;
}
export { isTerminalShutdown, latchTerminalShutdown, heldUntilExit };
