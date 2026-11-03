/**
 * screens/repl/WorkerPendingPermissions.tsx
 *
 * 2.1.316 新增：显示等待 leader 批准的工作者权限请求与网络访问请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { selectPendingWorkerRequest } from "../../components/messages/AssistantToolUseMessage.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerPendingPermission } from "../../components/permissions/WorkerPendingPermission.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433186-433235 placement
function selectPendingSandboxRequest(Be) {
  return Be.pendingSandboxRequest;
}
//@ chunk-18hwfzwa.js:433235-433638 placement
/**
 * 显示等待 leader 批准的工作者权限请求与网络访问请求。
 */
function WorkerPendingPermissions() {
  let D = w(7);
  let appState = useAppState(selectPendingWorkerRequest);
  let appState_2 = useAppState(selectPendingSandboxRequest);
  let L;
  if (D[0] !== appState) {
    L =
      appState &&
      jsxProd_default(WorkerPendingPermission, {
        toolName: appState.toolName,
        description: appState.description,
      });
    D[0] = appState;
    D[1] = L;
  } else L = D[1];
  let ee;
  if (D[2] !== appState_2) {
    ee =
      appState_2 &&
      jsxProd_default(WorkerPendingPermission, {
        toolName: "Network Access",
        description: `Waiting for leader to approve network access to ${appState_2.host}`,
      });
    D[2] = appState_2;
    D[3] = ee;
  } else ee = D[3];
  let ke;
  if (D[4] !== L || D[5] !== ee) {
    ke = jsxProd_default_2(Fragment, {
      children: [L, ee],
    });
    D[4] = L;
    D[5] = ee;
    D[6] = ke;
  } else ke = D[6];
  return ke;
}
//@ chunk-18hwfzwa.js:433638-433642 placement
init_react_production();
//@ chunk-18hwfzwa.js:433642-433646 placement
init_react_production();
//@ chunk-18hwfzwa.js:433646-433650 placement
init_react_production();
export { WorkerPendingPermissions };
