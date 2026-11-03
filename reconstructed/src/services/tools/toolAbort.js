/**
 * services/tools/toolAbort.ts
 *
 * 2.1.316 新增：工具执行中止处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { unwrapAbortReason, classifyAbortReasonForTelemetry } from "../../utils/abortController.js";
import { isTurnLevelAbort } from "../../utils/abortReasons.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isCcsTenant, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-e6aww6q8.js:3782731-3782797 placement
var END_CONVERSATION_TOOL_NAME = require("./chunk-jbpmz76b.js").END_CONVERSATION_TOOL_NAME;
//@ chunk-e6aww6q8.js:3782797-3783079 placement
/**
 * 判断已中止的工具调用该记为对话结束、用户中断或不算中断（interrupt、权限停止、shell 已运行且属后台化时）。
 */
function getAbortKind(signal, n, r) {
  if (!signal.aborted) return null;
  let s = unwrapAbortReason(signal.reason);
  if (s === "interrupt" || s === "permission-stop") return null;
  if (
    n.ran &&
    isTurnLevelAbort(signal.reason, r) &&
    (n.name === BASH_TOOL_NAME || n.name === POWERSHELL_TOOL_NAME)
  )
    return null;
  if (s === "end_conversation") return n.name === END_CONVERSATION_TOOL_NAME ? null : "conversation_ended";
  return "user_interrupted";
}
//@ chunk-e6aww6q8.js:3783079-3783194 placement
/**
 * 非交互且（特定环境或 CCS 租户）时取序列化花瓣特性开关的数值，否则为 0。
 */
function getSerializedPetalLimit() {
  if (!(isRemoteManagedEnvironment() || isCcsTenant()) || !getIsNonInteractiveSession()) return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_serialized_petal", 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" ? featureValue_CACHED_MAY_BE_STALE : 0;
}
//@ chunk-e6aww6q8.js:3783194-3783284 placement
/**
 * 判断中止原因是否属于用户取消、远程取消或 AbortError。
 */
function isCancelAbort(signal) {
  let n = classifyAbortReasonForTelemetry(signal.reason);
  return n === "user_cancel" || n === "remote_cancel" || AbortError(signal);
}
//@ chunk-e6aww6q8.js:3783284-3783493 placement = AbortError (1)
function AbortError(e) {
  let reason = e.reason;
  if (!(reason instanceof DOMException) || reason.name !== "AbortError") return false;
  let abortController = new AbortController();
  abortController.abort();
  let reason_2 = abortController.signal.reason;
  return reason_2 instanceof DOMException && reason.message === reason_2.message;
}
export { getAbortKind, getSerializedPetalLimit, isCancelAbort };
