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
import { TVo, looksLikeCommitOutput } from "../../utils/attributionFileClasses.js";
import { ultrareviewPostCommitTip } from "../../services/api/ultrareviewQuota.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

/**
 * 提交后钩子：git commit 成功后提示 ultrareview。
 */
//@ chunk-e9cc3yq9.js:3651-4028 placement
async function ultrareviewPostCommitHook(o, a, l, u, s) {
  if (o.hook_event_name !== "PostToolUse") return {};
  if (getIsNonInteractiveSession() || o.agent_id !== void 0) return {};
  let e = o.tool_input?.command;
  if (typeof e !== "string" || !TVo(e)) return {};
  let tool_response = o.tool_response,
    r = typeof tool_response?.stdout === "string" ? tool_response.stdout : "",
    i = typeof tool_response?.stderr === "string" ? tool_response.stderr : "";
  if (!looksLikeCommitOutput(r, i, void 0)) return {};
  let n = ultrareviewPostCommitTip(s?.storageV5);
  return n !== null ? { systemMessage: n } : {};
}
//@ chunk-e9cc3yq9.js:4028-4152 placement = registerSessionFileAccessHooks (1)
function registerSessionFileAccessHooks() {
  let hook = { type: "callback", callback: ultrareviewPostCommitHook, timeout: 1, internal: !0 };
  registerHookCallbacks({
    PostToolUse: [{ matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}`, hooks: [hook] }],
  });
}
