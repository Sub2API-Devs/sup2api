/**
 * utils/kbCohesionFixes.ts
 *
 * 2.1.316 新增：CLAUDE_CODE_KB_COHESION_FIXES 开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-khxw263p.js (1)
 * attribution: placement 1
 */
import { env } from "./env.js";

//@ chunk-khxw263p.js:226-293 placement
function CC() {
  if (env.CLAUDE_CODE_KB_COHESION_FIXES) return !0;
  return !1;
}

export { CC };
