/**
 * screens/repl/WorkerPendingPermissions.tsx
 *
 * 2.1.316 新增：显示等待 leader 批准的工作者权限请求与网络访问请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { selectPendingWorkerRequest } from "../../components/messages/AssistantToolUseMessage.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerPendingPermission } from "../../components/permissions/WorkerPendingPermission.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:454789-454793 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:454789", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:458018-458067 placement
function selectPendingSandboxRequest(state) {
  return state.pendingSandboxRequest;
}
//@ chunk-czq1j3j2.js:458067-458471 placement
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
//@ chunk-czq1j3j2.js:458471-458475 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:458471", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:458475-458479 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:458475", () => {
  init_react_production();
});
export { WorkerPendingPermissions };
