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
import { mergedCommandNames } from "../settings/commandSyncNames.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import { alwaysTrue } from "../slowOperations.js";
import { resolveSetting } from "../settings/userIntentSettings.js";
import { getSubscriptionType } from "../auth.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-hgfr0vx8.js:478-549 placement
/**
 * workflow 规模名列表。
 */
var WORKFLOW_SIZE_NAMES = ["unrestricted", "small", "medium", "large"];
var MEDIUM = "medium";
var SMALL = "small";
//@ chunk-hgfr0vx8.js:549-593 placement
/**
 * 规范化 workflow 规模名。
 */
function workflowSizeName(e) {
  return WORKFLOW_SIZE_NAMES.find((o) => o === e);
}
//@ chunk-hgfr0vx8.js:593-628 placement
var WORKFLOW_SIZE_AGENT_HINTS = {
  small: 5,
  medium: 10,
  large: 50,
};
//@ chunk-hgfr0vx8.js:628-749 placement
/**
 * 规模名附上建议的 agent 数量。
 */
function sizeWithAgentHint(e) {
  let o = e === "small" || e === "medium" || e === "large" ? WORKFLOW_SIZE_AGENT_HINTS[e] : undefined;
  return o === undefined ? e : `${e} (aim for <${o} agents)`;
}
//@ chunk-hgfr0vx8.js:749-818 placement
/**
 * 规模说明（默认规模标注 default）。
 */
function workflowSizeDisplay(e, o) {
  return o && e !== "unrestricted" ? `${e} (default)` : sizeWithAgentHint(e);
}
//@ chunk-hgfr0vx8.js:818-892 placement
/**
 * 规模对应的建议 agent 数。
 */
function workflowAgentHint(e) {
  return e === "small" || e === "medium" || e === "large" ? WORKFLOW_SIZE_AGENT_HINTS[e] : undefined;
}
//@ chunk-hgfr0vx8.js:892-984 placement
function workflowSizeGuideline(e) {
  if (!(e in WORKFLOW_SIZE_AGENT_HINTS)) return e;
  return `${e} \u2014 keep workflows under ${WORKFLOW_SIZE_AGENT_HINTS[e]} agents`;
}
//@ chunk-hgfr0vx8.js:984-1114 placement
/**
 * “这是指南不是硬限制”说明。
 */
function guidelineNotLimitText() {
  return "This is a guideline, not a hard limit \u2014 follow it unless the user's prompt calls for a different scale.";
}
//@ chunk-hgfr0vx8.js:1114-1372 placement
/**
 * 本会话 workflow 规模指南说明。
 */
function workflowSizeIntro(e, isDefault) {
  let t = isDefault
    ? "This session has the default workflow size guideline:"
    : "A workflow size guideline is configured for this session:";
  let r = isDefault ? ' The user can raise or remove it with "Dynamic workflow size" in /config.' : "";
  return `${t} ${workflowSizeGuideline(e)}. ${guidelineNotLimitText()}${r}`;
}
//@ chunk-hgfr0vx8.js:1372-1564 placement
/**
 * workflow 规模指南变更说明。
 */
function workflowSizeChangedText(e) {
  if (e === "unrestricted") return "Workflow size is now unrestricted \u2014 no size guideline applies.";
  return `The workflow size guideline for this session changed: ${workflowSizeGuideline(e)}. ${guidelineNotLimitText()}`;
}
//@ chunk-hgfr0vx8.js:1564-1630 placement
/**
 * workflow 是否被设置或环境变量关闭。
 */
function isWorkflowsConfiguredOff() {
  return isWorkflowsEnvDisabled() || mergedCommandNames()?.settings.disableWorkflows === true;
}
//@ chunk-hgfr0vx8.js:1630-1684 placement
/**
 * 环境变量是否禁用 workflow。
 */
function isWorkflowsEnvDisabled() {
  return env.CLAUDE_CODE_DISABLE_WORKFLOWS;
}
//@ chunk-hgfr0vx8.js:1684-1795 placement
/**
 * 缓存 workflow 可用性判断。
 */
class WorkflowAvailabilityCache {
  cached = undefined;
  resolve() {
    if (this.cached !== undefined) return this.cached;
    this.cached = resolveWorkflowAvailability();
    return this.cached;
  }
}
//@ chunk-hgfr0vx8.js:1795-1818 placement
var workflowAvailabilityByHost = new HostScoped(() => new WorkflowAvailabilityCache());
//@ chunk-hgfr0vx8.js:1818-1854 placement
function isWorkflowsAvailable() {
  return getWorkflowsUnavailableReason() === undefined;
}
//@ chunk-hgfr0vx8.js:1854-2313 placement
function getWorkflowsUnavailableReason() {
  if (!alwaysTrue()) return "unsupported_runtime";
  let e = isWorkflowsConfiguredOff();
  let o =
    e &&
    !env.CLAUDE_CODE_DISABLE_WORKFLOWS &&
    resolveSetting("disableWorkflows", false).source === "userSettings";
  if (e && !o) return "managed_settings";
  if (!isWorkflowsPolicyAllowed()) return "org_policy";
  let { available, defaultOn } = workflowAvailability();
  if (!available) return "unavailable";
  if (!(mergedCommandNames()?.settings.enableWorkflows ?? defaultOn)) {
    let source = resolveSetting("enableWorkflows", defaultOn).source;
    return source === "userSettings" || source === "default" ? "user_setting" : "managed_settings";
  }
  return o ? "user_setting" : undefined;
}
//@ chunk-hgfr0vx8.js:2313-2349 placement
/**
 * workflow 默认是否开启。
 */
function workflowsDefaultOn() {
  return workflowAvailability().defaultOn;
}
//@ chunk-hgfr0vx8.js:2349-2388 placement = isProSubscriber (1)
function isProSubscriber() {
  return getSubscriptionType() === "pro" ? SMALL : MEDIUM;
}
//@ chunk-hgfr0vx8.js:2465-2536 placement
/**
 * 关键词触发 workflow 是否开启（默认开）。
 */
function isWorkflowKeywordTriggerEnabled() {
  return mergedCommandNames()?.settings.workflowKeywordTriggerEnabled ?? true;
}
//@ chunk-hgfr0vx8.js:2536-2580 placement
/**
 * 组织策略是否允许 workflow。
 */
function isWorkflowsPolicyAllowed() {
  return isPolicyAllowed("allow_workflows");
}
//@ chunk-hgfr0vx8.js:2580-2746 placement
/**
 * workflow 是否被关闭（设置、环境变量或开关）。
 */
function isWorkflowsDisabled() {
  if (!alwaysTrue() || isWorkflowsConfiguredOff() || !isWorkflowsPolicyAllowed()) return true;
  if (mergedCommandNames()?.settings.enableWorkflows === false) return true;
  return (
    env.CLAUDE_CODE_WORKFLOWS === false ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflows_enabled", true)
  );
}
//@ chunk-hgfr0vx8.js:2746-2791 placement
function workflowAvailability() {
  return workflowAvailabilityByHost.of(getRootSession().host).resolve();
}
//@ chunk-hgfr0vx8.js:2791-3130 placement
/**
 * workflow 是否可用与默认开启（pro 默认关）。
 */
function resolveWorkflowAvailability() {
  if (!alwaysTrue())
    return {
      available: false,
      defaultOn: false,
    };
  if (env.CLAUDE_CODE_WORKFLOWS === true) {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_workflows_enabled",
      true,
    );
    return {
      available: featureValue_CACHED_MAY_BE_STALE,
      defaultOn: featureValue_CACHED_MAY_BE_STALE,
    };
  }
  if (env.CLAUDE_CODE_WORKFLOWS === false)
    return {
      available: false,
      defaultOn: false,
    };
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflows_enabled", true))
    return {
      available: false,
      defaultOn: false,
    };
  return {
    available: true,
    defaultOn: getSubscriptionType() !== "pro",
  };
}
//@ chunk-hgfr0vx8.js:3130-3179 placement
/**
 * workflow 工具 GrowthBook 开关（默认开）。
 */
function isWorkflowToolEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_compass", true);
}
export {
  workflowSizeChangedText,
  isWorkflowsAvailable,
  isWorkflowKeywordTriggerEnabled,
  workflowAgentHint,
  workflowSizeDisplay,
  workflowSizeName,
  workflowSizeIntro,
  isWorkflowsEnvDisabled,
  isWorkflowsConfiguredOff,
  isWorkflowsPolicyAllowed,
  isProSubscriber,
  workflowAvailability,
  isWorkflowsDisabled,
  workflowsDefaultOn,
  WORKFLOW_SIZE_NAMES,
  isWorkflowToolEnabled,
  getWorkflowsUnavailableReason,
};
