/**
 * services/analytics/privacyLevel.ts
 *
 * 2.1.316 新增：隐私级别判断函数组（HIPAA、安全事件、本地代理入口等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:754668-754695 placement
/**
 * 隐私级别判断函数组（HIPAA、安全事件、本地代理入口等）。
 */
function isHipaaMode() {
  return isHipaaTainted();
}
//@ chunk-exfmq47h.js:754695-754722 placement
/**
 * 导出函数 `isHipaaModeCurrent`：返回 Xl()。
 */
function isHipaaModeCurrent() {
  return isHipaaTainted();
}
//@ chunk-exfmq47h.js:754722-754761 placement
/**
 * 隐私等级对安全事件（tengu_safety_event）的判定：是否属安全事件、是否缺裁决、是否需要盖主体戳、是否属他人行、HIPAA 是否被污染。
 */
var SAFETY_EVENT_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:754722", () => {
  SAFETY_EVENT_NAMES = new Set(["tengu_safety_event"]);
});
//@ chunk-exfmq47h.js:754761-754805 placement
function isSafetyEvent(eventName) {
  return eventName !== undefined && SAFETY_EVENT_NAMES.has(eventName);
}
//@ chunk-exfmq47h.js:754805-754838 placement
function isVerdictMissing() {
  return isPolicyVerdictAbsent() || isSessionVerdictUnattributed();
}
//@ chunk-exfmq47h.js:754838-754880 placement
function needsPrincipalStamp(eventName) {
  return isSafetyEvent(eventName) && (isVerdictMissing() || isHipaaTainted());
}
//@ chunk-exfmq47h.js:754880-754921 placement
function principalStampForEvent(eventName) {
  return isSafetyEvent(eventName) ? rowPrincipalStamp() : undefined;
}
//@ chunk-exfmq47h.js:754921-754959 placement
function isEventOfAnotherPrincipal(eventName, stamp) {
  return isSafetyEvent(eventName) && isRowOfAnotherPrincipal(stamp);
}
//@ chunk-exfmq47h.js:754959-755002 placement
function isRowOfCurrentPrincipal(stamp) {
  return !isVerdictMissing() && !isHipaaTainted() && !isRowOfAnotherPrincipal(stamp);
}
//@ chunk-exfmq47h.js:755002-755078 placement
function isCurrentPrincipalStamp(principalStamp) {
  return (
    typeof principalStamp === "string" &&
    /^[0-9a-f]+$/.test(principalStamp) &&
    principalStamp === rowPrincipalStamp()
  );
}
//@ chunk-exfmq47h.js:755078-755151 placement
function isHipaaTainted() {
  let verdictAbsent = isPolicyVerdictAbsent();
  if (hasComplianceTaint("hipaa")) return true;
  return verdictAbsent && (isLocalAgentEntrypoint() || principalSeenUnderHipaa());
}
//@ chunk-exfmq47h.js:755151-755197 placement
var LOCAL_AGENT_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:755151", () => {
  LOCAL_AGENT_ENTRYPOINTS = new Set(["local-agent", "local_agent"]);
});
//@ chunk-exfmq47h.js:755197-755352 placement
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
  isRowOfCurrentPrincipal,
  isHipaaMode,
  needsPrincipalStamp,
  isEventOfAnotherPrincipal,
  isHipaaModeCurrent,
  isSafetyEvent,
  isVerdictMissing,
  isCurrentPrincipalStamp,
  principalStampForEvent,
};
