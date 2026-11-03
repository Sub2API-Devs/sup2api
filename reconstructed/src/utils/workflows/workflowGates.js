/**
 * utils/workflows/workflowGates.ts
 *
 * 2.1.316 新增：Workflow 功能开关与规模指南（unrestricted/small/medium/large，托管/组织禁用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hgfr0vx8.js (24)
 * attribution: placement 24
 */
import { DU } from "../settings/commandSyncNames.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import { alwaysTrue } from "../slowOperations.js";
import { resolveSetting } from "../settings/userIntentSettings.js";
import { getSubscriptionType } from "../auth.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-hgfr0vx8.js:478-549 placement
var ees = ["unrestricted", "small", "medium", "large"],
  MEDIUM = "medium",
  SMALL = "small";
//@ chunk-hgfr0vx8.js:549-593 placement
function tTn(e) {
  return ees.find((o) => o === e);
}
//@ chunk-hgfr0vx8.js:593-628 placement
var n = { small: 5, medium: 10, large: 50 };
/**
 * 规模名附上建议的 agent 数量。
 */
//@ chunk-hgfr0vx8.js:628-749 placement
function sizeWithAgentHint(e) {
  let o = e === "small" || e === "medium" || e === "large" ? n[e] : void 0;
  return o === void 0 ? e : `${e} (aim for <${o} agents)`;
}
//@ chunk-hgfr0vx8.js:749-818 placement
function Ahi(e, o) {
  return o && e !== "unrestricted" ? `${e} (default)` : sizeWithAgentHint(e);
}
//@ chunk-hgfr0vx8.js:818-892 placement
function Chi(e) {
  return e === "small" || e === "medium" || e === "large" ? n[e] : void 0;
}
//@ chunk-hgfr0vx8.js:892-984 placement
function f(e) {
  if (!(e in n)) return e;
  return `${e} \u2014 keep workflows under ${n[e]} agents`;
}
/**
 * “这是指南不是硬限制”说明。
 */
//@ chunk-hgfr0vx8.js:984-1114 placement
function guidelineNotLimitText() {
  return "This is a guideline, not a hard limit \u2014 follow it unless the user's prompt calls for a different scale.";
}
/**
 * 本会话 workflow 规模指南说明。
 */
//@ chunk-hgfr0vx8.js:1114-1372 placement
function workflowSizeIntro(e, o) {
  let t = o
      ? "This session has the default workflow size guideline:"
      : "A workflow size guideline is configured for this session:",
    r = o ? ' The user can raise or remove it with "Dynamic workflow size" in /config.' : "";
  return `${t} ${f(e)}. ${guidelineNotLimitText()}${r}`;
}
/**
 * workflow 规模指南变更说明。
 */
//@ chunk-hgfr0vx8.js:1372-1564 placement
function workflowSizeChangedText(e) {
  if (e === "unrestricted") return "Workflow size is now unrestricted \u2014 no size guideline applies.";
  return `The workflow size guideline for this session changed: ${f(e)}. ${guidelineNotLimitText()}`;
}
//@ chunk-hgfr0vx8.js:1564-1630 placement
function _cr() {
  return fQr() || DU()?.settings.disableWorkflows === !0;
}
//@ chunk-hgfr0vx8.js:1630-1684 placement
function fQr() {
  return env.CLAUDE_CODE_DISABLE_WORKFLOWS;
}
/**
 * 缓存 workflow 可用性判断。
 */
//@ chunk-hgfr0vx8.js:1684-1795 placement
class WorkflowAvailabilityCache {
  cached = void 0;
  resolve() {
    if (this.cached !== void 0) return this.cached;
    return ((this.cached = resolveWorkflowAvailability()), this.cached);
  }
}
//@ chunk-hgfr0vx8.js:1795-1818 placement
var p = new HostScoped(() => new WorkflowAvailabilityCache());
//@ chunk-hgfr0vx8.js:1818-1854 placement
function isWorkflowsAvailable() {
  return getWorkflowsUnavailableReason() === void 0;
}
//@ chunk-hgfr0vx8.js:1854-2313 placement
function getWorkflowsUnavailableReason() {
  if (!alwaysTrue()) return "unsupported_runtime";
  let e = _cr(),
    o =
      e &&
      !env.CLAUDE_CODE_DISABLE_WORKFLOWS &&
      resolveSetting("disableWorkflows", !1).source === "userSettings";
  if (e && !o) return "managed_settings";
  if (!Scr()) return "org_policy";
  let { available: available, defaultOn: defaultOn } = l();
  if (!available) return "unavailable";
  if (!(DU()?.settings.enableWorkflows ?? defaultOn)) {
    let source = resolveSetting("enableWorkflows", defaultOn).source;
    return source === "userSettings" || source === "default" ? "user_setting" : "managed_settings";
  }
  return o ? "user_setting" : void 0;
}
//@ chunk-hgfr0vx8.js:2313-2349 placement
function nes() {
  return l().defaultOn;
}
//@ chunk-hgfr0vx8.js:2349-2388 placement = isProSubscriber (1)
function isProSubscriber() {
  return getSubscriptionType() === "pro" ? SMALL : MEDIUM;
}
//@ chunk-hgfr0vx8.js:2465-2536 placement
function nTn() {
  return DU()?.settings.workflowKeywordTriggerEnabled ?? !0;
}
//@ chunk-hgfr0vx8.js:2536-2580 placement
function Scr() {
  return isPolicyAllowed("allow_workflows");
}
/**
 * workflow 是否被关闭（设置、环境变量或开关）。
 */
//@ chunk-hgfr0vx8.js:2580-2746 placement
function isWorkflowsDisabled() {
  if (!alwaysTrue() || _cr() || !Scr()) return !0;
  if (DU()?.settings.enableWorkflows === !1) return !0;
  return (
    env.CLAUDE_CODE_WORKFLOWS === !1 || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflows_enabled", !0)
  );
}
//@ chunk-hgfr0vx8.js:2746-2791 placement
function l() {
  return p.of(getRootSession().host).resolve();
}
/**
 * workflow 是否可用与默认开启（pro 默认关）。
 */
//@ chunk-hgfr0vx8.js:2791-3130 placement
function resolveWorkflowAvailability() {
  if (!alwaysTrue()) return { available: !1, defaultOn: !1 };
  if (env.CLAUDE_CODE_WORKFLOWS === !0) {
    let o = getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflows_enabled", !0);
    return { available: o, defaultOn: o };
  }
  if (env.CLAUDE_CODE_WORKFLOWS === !1) return { available: !1, defaultOn: !1 };
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflows_enabled", !0))
    return { available: !1, defaultOn: !1 };
  return { available: !0, defaultOn: getSubscriptionType() !== "pro" };
}
//@ chunk-hgfr0vx8.js:3130-3179 placement
function res() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_compass", !0);
}

export {
  workflowSizeChangedText,
  isWorkflowsAvailable,
  nTn,
  Chi,
  Ahi,
  tTn,
  workflowSizeIntro,
  fQr,
  _cr,
  Scr,
  isProSubscriber,
  l,
  isWorkflowsDisabled,
  nes,
  ees,
  res,
  getWorkflowsUnavailableReason,
};
