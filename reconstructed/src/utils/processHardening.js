/**
 * utils/processHardening.ts
 *
 * 2.1.316 新增：通过 prctl 关闭进程 dumpable。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0f5bp6p7.js (1)
 * attribution: placement 1
 */

/**
 * 通过 prctl 关闭进程 dumpable。
 */
//@ chunk-0f5bp6p7.js:191-361 placement
function disableCoreDumps(r) {
  try {
    if (!Bun.ant.setDumpable(!1)) r("prctl(PR_SET_DUMPABLE,0) returned nonzero");
  } catch (error) {
    r(`prctl unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { disableCoreDumps };
