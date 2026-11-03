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
import { z6n } from "../../utils/abortReasons.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { isCcsTenant, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-e6aww6q8.js:3782731-3782797 placement
var END_CONVERSATION_TOOL_NAME = require("./chunk-jbpmz76b.js").END_CONVERSATION_TOOL_NAME;
/**
 * 判断已中止的工具调用该记为对话结束、用户中断或不算中断（interrupt、权限停止、shell 已运行且属后台化时）。
 */
//@ chunk-e6aww6q8.js:3782797-3783079 placement
function getAbortKind(e, n, r) {
  if (!e.aborted) return null;
  let s = unwrapAbortReason(e.reason);
  if (s === "interrupt" || s === "permission-stop") return null;
  if (n.ran && z6n(e.reason, r) && (n.name === BASH_TOOL_NAME || n.name === POWERSHELL_TOOL_NAME))
    return null;
  if (s === "end_conversation") return n.name === END_CONVERSATION_TOOL_NAME ? null : "conversation_ended";
  return "user_interrupted";
}
/**
 * 非交互且（特定环境或 CCS 租户）时取序列化花瓣特性开关的数值，否则为 0。
 */
//@ chunk-e6aww6q8.js:3783079-3783194 placement
function getSerializedPetalLimit() {
  if (!(mn() || isCcsTenant()) || !getIsNonInteractiveSession()) return 0;
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_serialized_petal", 0);
  return typeof e === "number" ? e : 0;
}
//@ chunk-e6aww6q8.js:3783194-3783284 placement
function wYs(e) {
  let n = classifyAbortReasonForTelemetry(e.reason);
  return n === "user_cancel" || n === "remote_cancel" || AbortError(e);
}
//@ chunk-e6aww6q8.js:3783284-3783493 placement = AbortError (1)
function AbortError(e) {
  let reason = e.reason;
  if (!(reason instanceof DOMException) || reason.name !== "AbortError") return !1;
  let abortController = new AbortController();
  abortController.abort();
  let reason_2 = abortController.signal.reason;
  return reason_2 instanceof DOMException && reason.message === reason_2.message;
}

export { getAbortKind, getSerializedPetalLimit, wYs };
