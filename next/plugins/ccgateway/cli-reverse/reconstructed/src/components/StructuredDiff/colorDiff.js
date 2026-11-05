/**
 * components/StructuredDiff/colorDiff.ts
 *
 * 原生 color-diff 模块是否可用及不可用原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiff/colorDiff.ts
 * pieces: chunk-td0w5pj1.js (1)
 * attribution: fingerprint 1
 */
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

//@ chunk-td0w5pj1.js:15521-15598 fingerprint (2.1.88 match: getColorModuleUnavailableReason, 1)
function getColorModuleUnavailableReason() {
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) return "env";
  return null;
}
export { getColorModuleUnavailableReason };
