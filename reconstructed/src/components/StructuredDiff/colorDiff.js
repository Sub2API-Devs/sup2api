/**
 * components/StructuredDiff/colorDiff.ts
 *
 * 原生 color-diff 模块是否可用及不可用原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StructuredDiff/colorDiff.ts
 * pieces: chunk-cwwxybjc.js (1)
 * attribution: fingerprint 1
 */
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

//@ chunk-cwwxybjc.js:15520-15597 fingerprint = getColorModuleUnavailableReason (1)
function getColorModuleUnavailableReason() {
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) return "env";
  return null;
}

export { getColorModuleUnavailableReason };
