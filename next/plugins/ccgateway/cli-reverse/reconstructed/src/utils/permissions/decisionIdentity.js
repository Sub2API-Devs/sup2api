/**
 * utils/permissions/decisionIdentity.ts
 *
 * 2.1.316 新增：权限决定同一性与失败原因判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qk1ra0xe.js (3)
 * attribution: placement 3
 */
import {
  CAN_USE_TOOL_STREAM_CLOSED_REASON,
  CAN_USE_TOOL_INVALID_RESULT_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON,
} from "../../types/permissions.js";
import { isUnforwardedHostAsk } from "../../services/tools/hostWordedAsks.js";

//@ chunk-qk1ra0xe.js:281-355 placement
function isSameDecision(decision, otherDecision) {
  return decision === otherDecision || (decision.behavior === "ask" && decision.forcedByCaller === true);
}
//@ chunk-qk1ra0xe.js:355-430 placement
function isCanUseToolFailureReason(reason) {
  return (
    reason === CAN_USE_TOOL_STREAM_CLOSED_REASON ||
    reason === CAN_USE_TOOL_INVALID_RESULT_REASON ||
    reason === CAN_USE_TOOL_REQUEST_FAILED_REASON ||
    reason === CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON ||
    reason === CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON ||
    isUnforwardedHostAsk(reason)
  );
}
//@ chunk-qk1ra0xe.js:430-461 placement
function isRequestFailedReason(reason) {
  return reason === CAN_USE_TOOL_REQUEST_FAILED_REASON;
}
export { isSameDecision, isRequestFailedReason, isCanUseToolFailureReason };
