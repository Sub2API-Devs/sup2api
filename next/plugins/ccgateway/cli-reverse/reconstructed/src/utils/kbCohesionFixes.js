/**
 * utils/kbCohesionFixes.ts
 *
 * 2.1.316 新增：CLAUDE_CODE_KB_COHESION_FIXES 开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sankt7f7.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";

//@ chunk-sankt7f7.js:226-293 placement
/**
 * 判断 CLAUDE_CODE_KB_COHESION_FIXES 开关是否开启。
 */
function isKbCohesionFixesOn() {
  if (env.CLAUDE_CODE_KB_COHESION_FIXES) return true;
  return false;
}
export { isKbCohesionFixesOn };
