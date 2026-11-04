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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3782731-3782797 placement
var END_CONVERSATION_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-e6aww6q8.js:3782731", () => {
  END_CONVERSATION_TOOL_NAME =
    require("../../tools/EndConversationTool/constants.js").END_CONVERSATION_TOOL_NAME;
});
//@ chunk-e6aww6q8.js:3782797-3783079 placement
/**
 * 判断已中止的工具调用该记为对话结束、用户中断或不算中断（interrupt、权限停止、shell 已运行且属后台化时）。
 */
function getAbortKind(signal, tracked, abortScope) {
  if (!signal.aborted) return null;
  let reasonKind = unwrapAbortReason(signal.reason);
  if (reasonKind === "interrupt" || reasonKind === "permission-stop") return null;
  if (
    tracked.ran &&
    isTurnLevelAbort(signal.reason, abortScope) &&
    (tracked.name === BASH_TOOL_NAME || tracked.name === POWERSHELL_TOOL_NAME)
  )
    return null;
  if (reasonKind === "end_conversation")
    return tracked.name === END_CONVERSATION_TOOL_NAME ? null : "conversation_ended";
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
  let reasonKind = classifyAbortReasonForTelemetry(signal.reason);
  return reasonKind === "user_cancel" || reasonKind === "remote_cancel" || AbortError(signal);
}
//@ chunk-e6aww6q8.js:3783284-3783493 placement = AbortError (1)
function AbortError(signal) {
  let reason = signal.reason;
  if (!(reason instanceof DOMException) || reason.name !== "AbortError") return false;
  let abortController = new AbortController();
  abortController.abort();
  let reason_2 = abortController.signal.reason;
  return reason_2 instanceof DOMException && reason.message === reason_2.message;
}
export { getAbortKind, getSerializedPetalLimit, isCancelAbort };
