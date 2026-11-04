/**
 * components/dialogs/permissionWorkflowDialog.ts
 *
 * 2.1.316 新增：permission_workflow 对话框请求定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vhnfh0m3.js (1)
 * attribution: placement 1
 */
import { withHideWhile } from "./dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { deepFreezeToolName } from "../../utils/deepFreezePlainData.js";

//@ chunk-vhnfh0m3.js:298-572 placement
/**
 * 权限工作流对话框的定义（载荷含请求、工具、权限结果与脚本，默认结果为取消）。
 */
var permissionWorkflowDialog = withHideWhile({
  kind: "permission_workflow",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (payload) =>
        typeof payload === "object" &&
        payload !== null &&
        "requestId" in payload &&
        "toolName" in payload &&
        "permissionResult" in payload &&
        "script" in payload,
    ),
  ),
  result: DoctorLazy(() =>
    deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
  ),
  default: {
    behavior: "cancelled",
  },
});
export { permissionWorkflowDialog };
