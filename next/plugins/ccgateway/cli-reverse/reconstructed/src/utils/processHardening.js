/**
 * utils/processHardening.ts
 *
 * 2.1.316 新增：通过 prctl 关闭进程 dumpable。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-33dv8bes.js (1)
 * attribution: placement 1
 */

//@ chunk-33dv8bes.js:191-361 placement
/**
 * 通过 prctl 关闭进程 dumpable。
 */
function disableCoreDumps(warn) {
  try {
    if (!Bun.ant.setDumpable(false)) warn("prctl(PR_SET_DUMPABLE,0) returned nonzero");
  } catch (error) {
    warn(`prctl unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export { disableCoreDumps };
