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
import { Fh } from "../../utils/deepFreezePlainData.js";

/**
 * 权限工作流对话框的定义（载荷含请求、工具、权限结果与脚本，默认结果为取消）。
 */
//@ chunk-vhnfh0m3.js:298-572 placement
var permissionWorkflowDialog = withHideWhile({
  kind: "permission_workflow",
  payload: DoctorLazy(() =>
    Fh(
      (o) =>
        typeof o === "object" &&
        o !== null &&
        "requestId" in o &&
        "toolName" in o &&
        "permissionResult" in o &&
        "script" in o,
    ),
  ),
  result: DoctorLazy(() => Fh((o) => typeof o === "object" && o !== null && "behavior" in o)),
  default: { behavior: "cancelled" },
});
