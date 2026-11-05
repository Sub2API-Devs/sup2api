/**
 * utils/gitSettings.ts
 *
 * 是否在系统提示中加入 git 使用说明（includeGitInstructions 设置）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/gitSettings.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
import { env } from "./env.js";
import { getInitialSettings } from "./settings/settings.js";

//@ chunk-5xgkngpb.js:1354869-1354991 fingerprint (2.1.88 match: shouldIncludeGitInstructions, 1)
function shouldIncludeGitInstructions() {
  let envVal = env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS;
  if (envVal !== undefined) return !envVal;
  return getInitialSettings().includeGitInstructions ?? true;
}
export { shouldIncludeGitInstructions };
