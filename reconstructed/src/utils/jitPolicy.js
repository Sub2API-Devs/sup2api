/**
 * utils/jitPolicy.ts
 *
 * 2.1.316 新增。启动后设置 JIT 策略。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gwfxd7ar.js (1)
 * attribution: placement 1
 */
import { env } from "./env.js";

//@ chunk-gwfxd7ar.js:226-345 placement
/**
 * 启动后设置 JIT 策略。
 */
function setJitPolicyAfterStartup() {
  let CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP = env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP ?? 1;
  if (typeof Bun !== "undefined") Bun.unsafe.setJITPolicy?.(CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP);
  return CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP;
}
export { setJitPolicyAfterStartup };
