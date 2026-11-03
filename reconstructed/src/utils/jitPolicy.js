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

/**
 * 启动后设置 JIT 策略。
 */
//@ chunk-gwfxd7ar.js:226-345 placement
function setJitPolicyAfterStartup() {
  let e = env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP ?? 1;
  if (typeof Bun < "u") Bun.unsafe.setJITPolicy?.(e);
  return e;
}

export { setJitPolicyAfterStartup };
