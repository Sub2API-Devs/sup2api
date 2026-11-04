/**
 * tools/ContinueInProjectsTool/permissionRequest.ts
 *
 * 2.1.316 新增：Continue in Projects 权限请求
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dkjq625a.js (1)
 * attribution: placement 1
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { deepFreezeToolName } from "../../utils/deepFreezePlainData.js";

//@ chunk-dkjq625a.js:298-638 placement
/**
 * 发送到项目的权限对话框标题与对话框定义。
 */
var CONTINUE_IN_PROJECTS_PROMPT_TITLE = "Claude wants to send this session\u2019s work to a Claude Project";
var CONTINUE_IN_PROJECTS_PERMISSION_DIALOG = withHideWhile({
  kind: "permission_continue_in_projects",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (payload) =>
        typeof payload === "object" &&
        payload !== null &&
        "requestId" in payload &&
        "toolName" in payload &&
        "permissionResult" in payload,
    ),
  ),
  result: DoctorLazy(() =>
    deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
  ),
  default: {
    behavior: "cancelled",
  },
});
export { CONTINUE_IN_PROJECTS_PROMPT_TITLE, CONTINUE_IN_PROJECTS_PERMISSION_DIALOG };
