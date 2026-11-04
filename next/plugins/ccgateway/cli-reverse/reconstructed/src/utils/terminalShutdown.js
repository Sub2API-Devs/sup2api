/**
 * utils/terminalShutdown.ts
 *
 * 2.1.316 新增：终端关闭锁存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (6)
 * attribution: placement 6
 */

//@ chunk-bwbq4xvm.js:166982-167004 placement
class TerminalShutdownLatch {
  committed = false;
}
//@ chunk-bwbq4xvm.js:167004-167018 placement
var terminalShutdownLatch = new TerminalShutdownLatch();
//@ chunk-bwbq4xvm.js:167018-167052 placement
function isTerminalShutdown() {
  return terminalShutdownLatch.committed;
}
//@ chunk-bwbq4xvm.js:167052-167083 placement
function latchTerminalShutdown() {
  terminalShutdownLatch.committed = true;
}
//@ chunk-bwbq4xvm.js:167083-167110 placement
var NEVER_RESOLVING = new Promise(() => {});
//@ chunk-bwbq4xvm.js:167110-167134 placement
function heldUntilExit() {
  return NEVER_RESOLVING;
}
export { isTerminalShutdown, heldUntilExit, latchTerminalShutdown };
