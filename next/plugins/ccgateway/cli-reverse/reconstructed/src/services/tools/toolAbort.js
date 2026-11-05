/**
 * services/tools/toolAbort.ts
 *
 * 2.1.316 新增：工具执行中止处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 5, layout 6
 */
import { unwrapAbortReason, classifyAbortReasonForTelemetry } from "../../utils/abortController.js";
import { isTurnLevelAbort } from "../../utils/abortReasons.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isCcsTenant, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isCodeModeExperimentEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3878618-3878684 placement
var END_CONVERSATION_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-5xgkngpb.js:3878618", () => {
  END_CONVERSATION_TOOL_NAME =
    require("../../tools/EndConversationTool/constants.js").END_CONVERSATION_TOOL_NAME;
});
//@ chunk-5xgkngpb.js:3878684-3879107 placement
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
  if (
    codeModeAccepted() &&
    tracked.ran &&
    tracked.asyncReplReceipt === true &&
    tracked.name === REPL_TOOL_NAME &&
    abortScope === "turn" &&
    require("../../utils/codeMode/asyncReplReceipt.js").turnAbortDetachesEval(signal.reason)
  )
    return null;
  if (reasonKind === "end_conversation")
    return tracked.name === END_CONVERSATION_TOOL_NAME ? null : "conversation_ended";
  return "user_interrupted";
}
//@ chunk-5xgkngpb.js:3879107-3879222 placement
/**
 * 非交互且（特定环境或 CCS 租户）时取序列化花瓣特性开关的数值，否则为 0。
 */
function getSerializedPetalLimit() {
  if (!(isRemoteManagedEnvironment() || isCcsTenant()) || !getIsNonInteractiveSession()) return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_serialized_petal", 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" ? featureValue_CACHED_MAY_BE_STALE : 0;
}
//@ chunk-5xgkngpb.js:3879222-3879234 layout
var STOPPED_RESULT_WAIT_MS = 1e4;
//@ chunk-5xgkngpb.js:3879234-3879260 layout
/**
 * 返回去重命中时的 tool_result 文案（"Wasted call — file unchanged since your last Read..."）。
 */
function getFileUnchangedMessage() {
  return STOPPED_RESULT_WAIT_MS;
}
//@ chunk-5xgkngpb.js:3879260-3879417 layout
function withStoppedWaitContext(toolUseContext, toolUseId) {
  if (!toolUseContext.abortController.signal.aborted) return toolUseContext;
  let stoppedWait = toolUseContext.stoppedResultWait?.(toolUseId);
  return stoppedWait?.kept === true
    ? {
        ...toolUseContext,
        abortController: stoppedWait.hookController,
      }
    : toolUseContext;
}
//@ chunk-5xgkngpb.js:3879417-3879503 layout
function withoutStoppedWait(toolUseContext) {
  return toolUseContext.stoppedResultWait === undefined
    ? toolUseContext
    : {
        ...toolUseContext,
        stoppedResultWait: undefined,
      };
}
//@ chunk-5xgkngpb.js:3879503-3879573 layout
function isStoppedResultWait(signal, toolName) {
  if (!signal.aborted || !isStoppedReplTool(toolName) || isTerminalShutdown()) return false;
  return isCancelAbort(signal);
}
//@ chunk-5xgkngpb.js:3879573-3879663 placement
/**
 * 判断中止原因是否属于用户取消、远程取消或 AbortError。
 */
function isCancelAbort(signal) {
  let reasonKind = classifyAbortReasonForTelemetry(signal.reason);
  return reasonKind === "user_cancel" || reasonKind === "remote_cancel" || AbortError(signal);
}
//@ chunk-5xgkngpb.js:3879663-3879732 layout
function isStoppedReplTool(toolName) {
  return (
    codeModeAccepted() &&
    toolName === REPL_TOOL_NAME &&
    isCodeModeExperimentEnabled() &&
    !hasModuleHookingSite("tool.call", {
      tool: toolName,
    })
  );
}
//@ chunk-5xgkngpb.js:3879732-3879941 placement (2.1.88 match: AbortError, 1)
function AbortError(signal) {
  let reason = signal.reason;
  if (!(reason instanceof DOMException) || reason.name !== "AbortError") return false;
  let abortController = new AbortController();
  abortController.abort();
  let reason_2 = abortController.signal.reason;
  return reason_2 instanceof DOMException && reason.message === reason_2.message;
}
export {
  withStoppedWaitContext,
  withoutStoppedWait,
  getAbortKind,
  getFileUnchangedMessage,
  isStoppedResultWait,
  isStoppedReplTool,
  getSerializedPetalLimit,
  isCancelAbort,
};
