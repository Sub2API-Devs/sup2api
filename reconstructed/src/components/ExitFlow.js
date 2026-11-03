/**
 * components/ExitFlow.tsx
 *
 * 退出流程组件：显示退出前的提示（prompt_input_exit），完成后真正退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ExitFlow.tsx
 * pieces: chunk-h52ct3be.js (1)
 * attribution: fingerprint 1
 */
import { relaunchForExit } from "../utils/processRelaunch.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-h52ct3be.js:2850-2991 fingerprint = ExitFlow (0.518)
async function ExitFlow(e, r = {}, i, n) {
  if ((await relaunchForExit(e, r, i), n))
    await gracefulShutdown(0, "prompt_input_exit", { removeWorktree: n });
  else await gracefulShutdown(0, "prompt_input_exit");
}

export { ExitFlow };
