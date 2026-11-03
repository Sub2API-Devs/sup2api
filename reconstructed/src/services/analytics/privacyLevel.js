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
import { hwr } from "../../utils/entrypointKinds.js";

/**
 * 隐私级别判断函数组（HIPAA、安全事件、本地代理入口等）。
 */
//@ chunk-aepeg2w5.js:739399-739426 placement
function isHipaaMode() {
  return Xl();
}
//@ chunk-aepeg2w5.js:739426-739453 placement
function Lis() {
  return Xl();
}
//@ chunk-aepeg2w5.js:739453-739492 placement
var Az = new Set(["tengu_safety_event"]);
//@ chunk-aepeg2w5.js:739492-739536 placement
function ms(e) {
  return e !== void 0 && Az.has(e);
}
//@ chunk-aepeg2w5.js:739536-739569 placement
function pg() {
  return isPolicyVerdictAbsent() || isSessionVerdictUnattributed();
}
//@ chunk-aepeg2w5.js:739569-739611 placement
function sx(e) {
  return ms(e) && (pg() || Xl());
}
//@ chunk-aepeg2w5.js:739611-739652 placement
function Yl(e) {
  return ms(e) ? rowPrincipalStamp() : void 0;
}
//@ chunk-aepeg2w5.js:739652-739690 placement
function ax(e, n) {
  return ms(e) && isRowOfAnotherPrincipal(n);
}
//@ chunk-aepeg2w5.js:739690-739733 placement
function ux(e) {
  return !pg() && !Xl() && !isRowOfAnotherPrincipal(e);
}
//@ chunk-aepeg2w5.js:739733-739809 placement
function Tz(e) {
  return typeof e === "string" && /^[0-9a-f]+$/.test(e) && e === rowPrincipalStamp();
}
//@ chunk-aepeg2w5.js:739809-739882 placement
function Xl() {
  let e = isPolicyVerdictAbsent();
  if (hasComplianceTaint("hipaa")) return !0;
  return e && (isLocalAgentEntrypoint() || principalSeenUnderHipaa());
}
//@ chunk-aepeg2w5.js:739882-739928 placement
var Cz = new Set(["local-agent", "local_agent"]);
/**
 * CLAUDE_CODE_ENTRYPOINT 是否属于特定入口（远程、coworker 等）。
 */
//@ chunk-aepeg2w5.js:739928-740083 placement
function isLocalAgentEntrypoint() {
  let envClaudeCodeEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT;
  return (
    envClaudeCodeEntrypoint !== void 0 &&
    (Cz.has(envClaudeCodeEntrypoint) ||
      envClaudeCodeEntrypoint.startsWith("remote") ||
      envClaudeCodeEntrypoint.startsWith("claude-coworker") ||
      hwr.has(envClaudeCodeEntrypoint))
  );
}

export { Lis, ux, isHipaaMode, sx, ax, ms, pg, Tz, Yl };
