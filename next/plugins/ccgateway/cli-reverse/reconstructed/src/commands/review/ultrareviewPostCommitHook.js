/**
 * commands/review/ultrareviewPostCommitHook.ts
 *
 * 2.1.316 新增：ultrareview 提交后钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-216kqgfj.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession, registerHookCallbacks } from "../../bootstrap/state.js";
import { looksLikeGitCommit, looksLikeCommitOutput } from "../../utils/attributionFileClasses.js";
import { ultrareviewPostCommitTip } from "../../services/api/ultrareviewQuota.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

//@ chunk-216kqgfj.js:3992-4369 placement
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
//@ chunk-216kqgfj.js:4369-4493 placement (2.1.88 match: registerSessionFileAccessHooks, 1)
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
