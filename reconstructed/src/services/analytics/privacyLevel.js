/**
 * services/analytics/privacyLevel.ts
 *
 * 2.1.316 新增：隐私级别判断函数组（HIPAA、安全事件、本地代理入口等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (13)
 * attribution: placement 13
 */
import {
  isPolicyVerdictAbsent,
  isSessionVerdictUnattributed,
  rowPrincipalStamp,
  isRowOfAnotherPrincipal,
  principalSeenUnderHipaa,
} from "../policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { HEADLESS_HOST_ENTRYPOINTS } from "../../utils/entrypointKinds.js";

//@ chunk-aepeg2w5.js:739399-739426 placement
/**
 * 隐私级别判断函数组（HIPAA、安全事件、本地代理入口等）。
 */
function isHipaaMode() {
  return isHipaaTainted();
}
//@ chunk-aepeg2w5.js:739426-739453 placement
/**
 * 导出函数 `isHipaaModeCurrent`：返回 Xl()。
 */
function isHipaaModeCurrent() {
  return isHipaaTainted();
}
//@ chunk-aepeg2w5.js:739453-739492 placement
/**
 * 隐私等级对安全事件（tengu_safety_event）的判定：是否属安全事件、是否缺裁决、是否需要盖主体戳、是否属他人行、HIPAA 是否被污染。
 */
var SAFETY_EVENT_NAMES = new Set(["tengu_safety_event"]);
//@ chunk-aepeg2w5.js:739492-739536 placement
function isSafetyEvent(e) {
  return e !== undefined && SAFETY_EVENT_NAMES.has(e);
}
//@ chunk-aepeg2w5.js:739536-739569 placement
function isVerdictMissing() {
  return isPolicyVerdictAbsent() || isSessionVerdictUnattributed();
}
//@ chunk-aepeg2w5.js:739569-739611 placement
function needsPrincipalStamp(e) {
  return isSafetyEvent(e) && (isVerdictMissing() || isHipaaTainted());
}
//@ chunk-aepeg2w5.js:739611-739652 placement
function principalStampForEvent(e) {
  return isSafetyEvent(e) ? rowPrincipalStamp() : undefined;
}
//@ chunk-aepeg2w5.js:739652-739690 placement
function isEventOfAnotherPrincipal(e, principalStamp) {
  return isSafetyEvent(e) && isRowOfAnotherPrincipal(principalStamp);
}
//@ chunk-aepeg2w5.js:739690-739733 placement
function isRowOfCurrentPrincipal(principalStamp) {
  return !isVerdictMissing() && !isHipaaTainted() && !isRowOfAnotherPrincipal(principalStamp);
}
//@ chunk-aepeg2w5.js:739733-739809 placement
function isCurrentPrincipalStamp(principalStamp) {
  return (
    typeof principalStamp === "string" &&
    /^[0-9a-f]+$/.test(principalStamp) &&
    principalStamp === rowPrincipalStamp()
  );
}
//@ chunk-aepeg2w5.js:739809-739882 placement
function isHipaaTainted() {
  let e = isPolicyVerdictAbsent();
  if (hasComplianceTaint("hipaa")) return true;
  return e && (isLocalAgentEntrypoint() || principalSeenUnderHipaa());
}
//@ chunk-aepeg2w5.js:739882-739928 placement
var LOCAL_AGENT_ENTRYPOINTS = new Set(["local-agent", "local_agent"]);
//@ chunk-aepeg2w5.js:739928-740083 placement
/**
 * CLAUDE_CODE_ENTRYPOINT 是否属于特定入口（远程、coworker 等）。
 */
function isLocalAgentEntrypoint() {
  let envClaudeCodeEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT;
  return (
    envClaudeCodeEntrypoint !== undefined &&
    (LOCAL_AGENT_ENTRYPOINTS.has(envClaudeCodeEntrypoint) ||
      envClaudeCodeEntrypoint.startsWith("remote") ||
      envClaudeCodeEntrypoint.startsWith("claude-coworker") ||
      HEADLESS_HOST_ENTRYPOINTS.has(envClaudeCodeEntrypoint))
  );
}
export {
  isHipaaModeCurrent,
  isRowOfCurrentPrincipal,
  isHipaaMode,
  needsPrincipalStamp,
  isEventOfAnotherPrincipal,
  isSafetyEvent,
  isVerdictMissing,
  isCurrentPrincipalStamp,
  principalStampForEvent,
};
