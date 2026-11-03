/**
 * components/dialogs/dialogStatus.ts
 *
 * 2.1.316 新增。对话框状态枚举。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1425373-1425567 placement
function computeSessionPresence(h) {
  let x = waitingForReason(h);
  if (x !== undefined)
    return {
      status: "waiting",
      waitingFor: x,
      working: false,
    };
  return {
    status: h.isLoading || h.delegatedActive ? "busy" : "idle",
    waitingFor: undefined,
    working: h.isQueryActive,
  };
}
//@ chunk-18hwfzwa.js:1425567-1425891 placement
/**
 * 返回会话正在等待什么（需要输入、对话框、worker 请求、沙箱请求、对话框打开），无等待返回 undefined。
 */
function waitingForReason(h) {
  if (h.queuedElicitation) return "input needed";
  if (h.topDialogWaitingFor !== undefined) return h.topDialogWaitingFor;
  if (h.pendingWorkerRequest) return "worker request";
  if (h.pendingSandboxRequest) return "sandbox request";
  if (h.isShowingLocalJSXCommand && !h.isResponseStreaming && !h.delegatedActive) return "dialog open";
  return;
}
//@ chunk-18hwfzwa.js:1425891-1425895 placement
init_react_production();
export { computeSessionPresence };
