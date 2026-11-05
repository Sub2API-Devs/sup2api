/**
 * components/ExitFlow.tsx
 *
 * 退出流程组件：显示退出前的提示（prompt_input_exit），完成后真正退出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ExitFlow.tsx
 * pieces: chunk-jynns2s2.js (1)
 * attribution: fingerprint 1
 */
import { relaunchForExit } from "../utils/processRelaunch.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-jynns2s2.js:2857-2998 fingerprint (2.1.88 match: ExitFlow, 0.519)
async function ExitFlow(options, removeWorktree = {}, storageV5, removeWorktree_2) {
  await relaunchForExit(options, removeWorktree, storageV5);
  if (removeWorktree_2)
    await gracefulShutdown(0, "prompt_input_exit", {
      removeWorktree: removeWorktree_2,
    });
  else await gracefulShutdown(0, "prompt_input_exit");
}
export { ExitFlow };
