/**
 * commands/review/ultrareviewPostCommitHook.ts
 *
 * 2.1.316 新增：ultrareview 提交后钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e9cc3yq9.js (2)
 * attribution: placement 2
 */
import { getIsNonInteractiveSession, registerHookCallbacks } from "../../bootstrap/state.js";
import { looksLikeGitCommit, looksLikeCommitOutput } from "../../utils/attributionFileClasses.js";
import { ultrareviewPostCommitTip } from "../../services/api/ultrareviewQuota.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

//@ chunk-e9cc3yq9.js:3651-4028 placement
/**
 * 提交后钩子：git commit 成功后提示 ultrareview。
 */
async function ultrareviewPostCommitHook(hookInput, toolUseId, hookOptions, hookRuntime, context) {
  if (hookInput.hook_event_name !== "PostToolUse") return {};
  if (getIsNonInteractiveSession() || hookInput.agent_id !== undefined) return {};
  let command = hookInput.tool_input?.command;
  if (typeof command !== "string" || !looksLikeGitCommit(command)) return {};
  let toolResponse = hookInput.tool_response;
  let stdout = typeof toolResponse?.stdout === "string" ? toolResponse.stdout : "";
  let stderr = typeof toolResponse?.stderr === "string" ? toolResponse.stderr : "";
  if (!looksLikeCommitOutput(stdout, stderr, undefined)) return {};
  let tip = ultrareviewPostCommitTip(context?.storageV5);
  return tip !== null
    ? {
        systemMessage: tip,
      }
    : {};
}
//@ chunk-e9cc3yq9.js:4028-4152 placement (2.1.88 match: registerSessionFileAccessHooks, 1)
function registerSessionFileAccessHooks() {
  let hook = {
    type: "callback",
    callback: ultrareviewPostCommitHook,
    timeout: 1,
    internal: true,
  };
  registerHookCallbacks({
    PostToolUse: [
      {
        matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}`,
        hooks: [hook],
      },
    ],
  });
}
export { registerSessionFileAccessHooks };
