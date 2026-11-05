/**
 * cli/startup/wrapUpPrompt.ts
 *
 * 启动时决定是否开启 wrap-up 提示（云端来源 + 提示建议 + 开关）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (2)
 * attribution: placement 2
 */
import { setWrapUpOfferedAtLaunch } from "../../bootstrap/state.js";
import { isSpawnedByClaudeCodeSession } from "../../utils/claudeSubprocessEnv.js";
import { env } from "../../utils/env.js";
import { isPromptSuggestionSettingEnabled } from "../../services/PromptSuggestion/promptSuggestion.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:17312-17356 placement
var WRAP_UP_CLOUD_ORIGINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hjswk319.js:17312", () => {
  WRAP_UP_CLOUD_ORIGINS = new Set(["remote", "remote_desktop"]);
});
//@ chunk-hjswk319.js:17356-17497 placement
function decideWrapUpOfferedAtLaunch(initialize) {
  setWrapUpOfferedAtLaunch(
    !isSpawnedByClaudeCodeSession() &&
      (env.CLAUDE_CODE_ENABLE_WRAP_UP ??
        (initialize.promptSuggestions === true &&
          initialize.cloudOrigin !== undefined &&
          WRAP_UP_CLOUD_ORIGINS.has(initialize.cloudOrigin))) &&
      isPromptSuggestionSettingEnabled(),
  );
}
export { decideWrapUpOfferedAtLaunch };
