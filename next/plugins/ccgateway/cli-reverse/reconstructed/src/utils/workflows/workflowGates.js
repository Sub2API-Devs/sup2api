/**
 * utils/workflows/workflowGates.ts
 *
 * 2.1.316 新增：Workflow 功能开关与规模指南（unrestricted/small/medium/large，托管/组织禁用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sm7j62wg.js (25)
 * attribution: placement 24, layout 1
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sm7j62wg.js:478-549 placement
/**
 * workflow 规模名列表。
 */
var WORKFLOW_SIZE_NAMES = ["unrestricted", "small", "medium", "large"];
var MEDIUM = "medium";
var SMALL = "small";
//@ chunk-sm7j62wg.js:549-593 placement
/**
 * 规范化 workflow 规模名。
 */
function workflowSizeName(size) {
  return WORKFLOW_SIZE_NAMES.find((name) => name === size);
}
//@ chunk-sm7j62wg.js:593-628 placement
var WORKFLOW_SIZE_AGENT_HINTS = {
  small: 5,
  medium: 10,
  large: 50,
};
//@ chunk-sm7j62wg.js:628-749 placement
/**
 * 规模名附上建议的 agent 数量。
 */
function sizeWithAgentHint(size) {
  let isLarge =
    size === "small" || size === "medium" || size === "large" ? WORKFLOW_SIZE_AGENT_HINTS[size] : undefined;
  return isLarge === undefined ? size : `${size} (aim for <${isLarge} agents)`;
}
//@ chunk-sm7j62wg.js:749-818 placement
/**
 * 规模说明（默认规模标注 default）。
 */
function workflowSizeDisplay(size, isDefault) {
  return isDefault && size !== "unrestricted" ? `${size} (default)` : sizeWithAgentHint(size);
}
//@ chunk-sm7j62wg.js:818-892 placement
/**
 * 规模对应的建议 agent 数。
 */
function workflowAgentHint(size) {
  return size === "small" || size === "medium" || size === "large"
    ? WORKFLOW_SIZE_AGENT_HINTS[size]
    : undefined;
}
//@ chunk-sm7j62wg.js:892-984 placement
function workflowSizeGuideline(size) {
  if (!(size in WORKFLOW_SIZE_AGENT_HINTS)) return size;
  return `${size} \u2014 keep workflows under ${WORKFLOW_SIZE_AGENT_HINTS[size]} agents`;
}
//@ chunk-sm7j62wg.js:984-1114 placement
/**
 * “这是指南不是硬限制”说明。
 */
function guidelineNotLimitText() {
  return "This is a guideline, not a hard limit \u2014 follow it unless the user's prompt calls for a different scale.";
}
//@ chunk-sm7j62wg.js:1114-1372 placement
/**
 * 本会话 workflow 规模指南说明。
 */
function workflowSizeIntro(size, isDefault) {
  let intro = isDefault
    ? "This session has the default workflow size guideline:"
    : "A workflow size guideline is configured for this session:";
  let configHint = isDefault
    ? ' The user can raise or remove it with "Dynamic workflow size" in /config.'
    : "";
  return `${intro} ${workflowSizeGuideline(size)}. ${guidelineNotLimitText()}${configHint}`;
}
//@ chunk-sm7j62wg.js:1372-1564 placement
/**
 * workflow 规模指南变更说明。
 */
function workflowSizeChangedText(size) {
  if (size === "unrestricted") return "Workflow size is now unrestricted \u2014 no size guideline applies.";
  return `The workflow size guideline for this session changed: ${workflowSizeGuideline(size)}. ${guidelineNotLimitText()}`;
}
//@ chunk-sm7j62wg.js:1564-1630 placement
/**
 * workflow 是否被设置或环境变量关闭。
 */
function isWorkflowsConfiguredOff() {
  return isWorkflowsEnvDisabled() || mergedCommandNames()?.settings.disableWorkflows === true;
}
//@ chunk-sm7j62wg.js:1630-1684 placement
/**
 * 环境变量是否禁用 workflow。
 */
function isWorkflowsEnvDisabled() {
  return env.CLAUDE_CODE_DISABLE_WORKFLOWS;
}
//@ chunk-sm7j62wg.js:1684-1795 placement
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
//@ chunk-sm7j62wg.js:1795-1818 placement
var workflowAvailabilityByHost; // deferred: uses WorkflowAvailabilityCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sm7j62wg.js:1795", () => {
  workflowAvailabilityByHost = new HostScoped(() => new WorkflowAvailabilityCache());
});
//@ chunk-sm7j62wg.js:1818-1854 placement
function isWorkflowsAvailable() {
  return getWorkflowsUnavailableReason() === undefined;
}
//@ chunk-sm7j62wg.js:1854-2313 placement
function getWorkflowsUnavailableReason() {
  if (!alwaysTrue()) return "unsupported_runtime";
  let unavailable = isWorkflowsConfiguredOff();
  let setByUserSettings =
    unavailable &&
    !env.CLAUDE_CODE_DISABLE_WORKFLOWS &&
    resolveSetting("disableWorkflows", false).source === "userSettings";
  if (unavailable && !setByUserSettings) return "managed_settings";
  if (!isWorkflowsPolicyAllowed()) return "org_policy";
  let { available, defaultOn } = workflowAvailability();
  if (!available) return "unavailable";
  if (!(mergedCommandNames()?.settings.enableWorkflows ?? defaultOn)) {
    let source = resolveSetting("enableWorkflows", defaultOn).source;
    return source === "userSettings" || source === "default" ? "user_setting" : "managed_settings";
  }
  return setByUserSettings ? "user_setting" : undefined;
}
//@ chunk-sm7j62wg.js:2313-2349 placement
/**
 * workflow 默认是否开启。
 */
function workflowsDefaultOn() {
  return workflowAvailability().defaultOn;
}
//@ chunk-sm7j62wg.js:2349-2388 placement (2.1.88 match: isProSubscriber, 1)
function isProSubscriber() {
  return getSubscriptionType() === "pro" ? SMALL : MEDIUM;
}
//@ chunk-sm7j62wg.js:2388-2465 layout
function workflowsUsableNow() {
  return isWorkflowsPolicyAllowed() && !env.CLAUDE_CODE_DISABLE_WORKFLOWS && workflowAvailability().available;
}
//@ chunk-sm7j62wg.js:2465-2536 placement
/**
 * 关键词触发 workflow 是否开启（默认开）。
 */
function isWorkflowKeywordTriggerEnabled() {
  return mergedCommandNames()?.settings.workflowKeywordTriggerEnabled ?? true;
}
//@ chunk-sm7j62wg.js:2536-2580 placement
/**
 * 组织策略是否允许 workflow。
 */
function isWorkflowsPolicyAllowed() {
  return isPolicyAllowed("allow_workflows");
}
//@ chunk-sm7j62wg.js:2580-2746 placement
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
//@ chunk-sm7j62wg.js:2746-2791 placement
function workflowAvailability() {
  return workflowAvailabilityByHost.of(getRootSession().host).resolve();
}
//@ chunk-sm7j62wg.js:2791-3130 placement
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
//@ chunk-sm7j62wg.js:3130-3179 placement
/**
 * workflow 工具 GrowthBook 开关（默认开）。
 */
function isWorkflowToolEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_compass", true);
}
export {
  workflowSizeChangedText,
  isWorkflowsAvailable,
  isProSubscriber,
  isWorkflowKeywordTriggerEnabled,
  isWorkflowsEnvDisabled,
  isWorkflowsConfiguredOff,
  isWorkflowsPolicyAllowed,
  workflowAgentHint,
  isWorkflowsDisabled,
  workflowSizeName,
  workflowSizeIntro,
  workflowsUsableNow,
  workflowSizeDisplay,
  isWorkflowToolEnabled,
  getWorkflowsUnavailableReason,
  workflowsDefaultOn,
  WORKFLOW_SIZE_NAMES,
};
