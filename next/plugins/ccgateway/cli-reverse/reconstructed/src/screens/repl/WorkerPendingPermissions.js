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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { selectPendingWorkerRequest } from "../../components/messages/AssistantToolUseMessage.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerPendingPermission } from "../../components/permissions/WorkerPendingPermission.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:433186-433235 placement
function selectPendingSandboxRequest(state) {
  return state.pendingSandboxRequest;
}
//@ chunk-18hwfzwa.js:433235-433638 placement
/**
 * 显示等待 leader 批准的工作者权限请求与网络访问请求。
 */
function WorkerPendingPermissions() {
  let $ = useMemoCache(7);
  let appState = useAppState(selectPendingWorkerRequest);
  let appState_2 = useAppState(selectPendingSandboxRequest);
  let node;
  if ($[0] !== appState) {
    node =
      appState &&
      jsxProd_default(WorkerPendingPermission, {
        toolName: appState.toolName,
        description: appState.description,
      });
    $[0] = appState;
    $[1] = node;
  } else node = $[1];
  let pendingCards;
  if ($[2] !== appState_2) {
    pendingCards =
      appState_2 &&
      jsxProd_default(WorkerPendingPermission, {
        toolName: "Network Access",
        description: `Waiting for leader to approve network access to ${appState_2.host}`,
      });
    $[2] = appState_2;
    $[3] = pendingCards;
  } else pendingCards = $[3];
  let fragment;
  if ($[4] !== node || $[5] !== pendingCards) {
    fragment = jsxProd_default_2(Fragment, {
      children: [node, pendingCards],
    });
    $[4] = node;
    $[5] = pendingCards;
    $[6] = fragment;
  } else fragment = $[6];
  return fragment;
}
//@ chunk-18hwfzwa.js:433638-433642 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:433638", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:433642-433646 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:433642", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:433646-433650 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:433646", () => {
  init_react_production();
});
export { WorkerPendingPermissions };
