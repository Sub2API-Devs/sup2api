/**
 * components/dialogs/dialogStatus.ts
 *
 * 2.1.316 新增。对话框状态枚举。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-czq1j3j2.js:1465032-1465036 placement
init_react_production();
//@ chunk-czq1j3j2.js:1465562-1465756 placement
function computeSessionPresence(state) {
  let waitingReason = waitingForReason(state);
  if (waitingReason !== undefined)
    return {
      status: "waiting",
      waitingFor: waitingReason,
      working: false,
    };
  return {
    status: state.isLoading || state.delegatedActive ? "busy" : "idle",
    waitingFor: undefined,
    working: state.isQueryActive,
  };
}
//@ chunk-czq1j3j2.js:1465756-1466080 placement
/**
 * 返回会话正在等待什么（需要输入、对话框、worker 请求、沙箱请求、对话框打开），无等待返回 undefined。
 */
function waitingForReason(status) {
  if (status.queuedElicitation) return "input needed";
  if (status.topDialogWaitingFor !== undefined) return status.topDialogWaitingFor;
  if (status.pendingWorkerRequest) return "worker request";
  if (status.pendingSandboxRequest) return "sandbox request";
  if (status.isShowingLocalJSXCommand && !status.isResponseStreaming && !status.delegatedActive)
    return "dialog open";
  return;
}
export { computeSessionPresence };
