/**
 * utils/gitSettings.ts
 *
 * 是否在系统提示中加入 git 使用说明（includeGitInstructions 设置）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/gitSettings.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { env } from "./env.js";
import { getInitialSettings_2 } from "./settings/settings.js";

//@ chunk-e6aww6q8.js:1355662-1355784 fingerprint = shouldIncludeGitInstructions (1)
function shouldIncludeGitInstructions() {
  let envVal = env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS;
  if (envVal !== void 0) return !envVal;
  return getInitialSettings_2().includeGitInstructions ?? !0;
}

export { shouldIncludeGitInstructions };
