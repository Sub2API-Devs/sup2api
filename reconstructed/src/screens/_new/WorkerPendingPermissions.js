/**
 * screens/_new/WorkerPendingPermissions.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: sole-consumer-new 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { selectPendingWorkerRequest } from "../../components/messages/AssistantToolUseMessage.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerPendingPermission } from "../../components/permissions/WorkerPendingPermission.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433186-433235 sole-consumer-new
function BHt(Be) {
  return Be.pendingSandboxRequest;
}
/**
 * 显示等待 leader 批准的工作者权限请求与网络访问请求。
 */
//@ chunk-18hwfzwa.js:433235-433638 sole-consumer-new
function WorkerPendingPermissions() {
  let D = w(7),
    h = useAppState(selectPendingWorkerRequest),
    x = useAppState(BHt),
    L;
  if (D[0] !== h)
    ((L = h && e(WorkerPendingPermission, { toolName: h.toolName, description: h.description })),
      (D[0] = h),
      (D[1] = L));
  else L = D[1];
  let ee;
  if (D[2] !== x)
    ((ee =
      x &&
      e(WorkerPendingPermission, {
        toolName: "Network Access",
        description: `Waiting for leader to approve network access to ${x.host}`,
      })),
      (D[2] = x),
      (D[3] = ee));
  else ee = D[3];
  let ke;
  if (D[4] !== L || D[5] !== ee)
    ((ke = r(Fragment, { children: [L, ee] })), (D[4] = L), (D[5] = ee), (D[6] = ke));
  else ke = D[6];
  return ke;
}
//@ chunk-18hwfzwa.js:433638-433642 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:433642-433646 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:433646-433650 sole-consumer-new
j();

export { WorkerPendingPermissions };
