/**
 * commands/goal/goal.ts
 *
 * 2.1.316 新增：/goal 命令：设置、查看或清除会话目标（达成条件），长度有限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bnwcqde4.js (20), chunk-s4441tej.js (1)
 * attribution: placement 21
 */
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { logError } from "../../utils/log.js";
import {
  managedMarketplaceAnswerFlag,
  marketplaceNameAnswerState,
} from "../../utils/plugins/marketplaceNames.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { isCcsCoworkSurface } from "../../utils/entrypointKinds.js";
import {
  isCcsTenant,
  getIsNonInteractiveSession,
  getSessionId,
  getTotalOutputTokens,
} from "../../bootstrap/state.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldHoldDeviceHooksByPolicy,
  personTurnedHooksOff,
  shouldSkipSessionHooksByPolicy,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { registerHookEligibility } from "../../utils/hooks.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createAttachmentMessage } from "../../utils/attachments.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bnwcqde4.js:685-790 placement
function isOrganizationHookPolicyPending() {
  let updated = false;
  try {
    updated = hasManagedSettings();
  } catch (error) {
    logError(error);
  }
  if (!updated) return false;
  try {
    return managedMarketplaceAnswerFlag();
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-bnwcqde4.js:790-879 placement
function isHookPolicyUnanswered() {
  if (!isOrganizationHookPolicyPending()) return false;
  try {
    return marketplaceNameAnswerState() === "unanswered";
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-bnwcqde4.js:879-945 placement
function markOrganizationAskHeld() {
  try {
    getPluginRegistry().organizationAsk.hasHeld = true;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-bnwcqde4.js:945-1020 placement
function buildGoalSentinelAttachment(met, condition) {
  return {
    type: "goal_status",
    met,
    sentinel: true,
    condition,
  };
}
//@ chunk-bnwcqde4.js:1020-1306 placement
function findActiveGoalCondition(messages) {
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type !== "attachment" || message.attachment.type !== "goal_status") continue;
    if (message.attachment.met || message.attachment.failed) return null;
    let condition = message.attachment.condition;
    return typeof condition === "string" && condition.length > 0 ? condition : null;
  }
  return null;
}
//@ chunk-bnwcqde4.js:1306-1436 placement
function logGoalCleared(condition, reason) {
  logEvent("tengu_goal_cleared", {
    reason: fromEnum(reason),
    iterations: condition.iterations,
    durationMs: Date.now() - condition.setAt,
    origin: fromEnumOpt(condition.origin),
  });
}
//@ chunk-bnwcqde4.js:1436-1507 placement
var MAX_GOAL_CONDITION_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GOAL_CLEAR_WORDS;
deferInit("chunk-bnwcqde4.js:1436", () => {
  MAX_GOAL_CONDITION_CHARS = 4000;
  GOAL_CLEAR_WORDS = new Set(["clear", "stop", "off", "reset", "none", "cancel"]);
});
//@ chunk-bnwcqde4.js:1507-1553 placement
function isGoalClearKeyword(arg) {
  return GOAL_CLEAR_WORDS.has(arg.toLowerCase());
}
//@ chunk-bnwcqde4.js:1553-1837 placement
function findLastMetGoal(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type !== "attachment" || message.attachment.type !== "goal_status") continue;
    let attachment = message.attachment;
    if (!attachment.met || attachment.sentinel) continue;
    return {
      condition: attachment.condition,
      iterations: attachment.iterations,
      durationMs: attachment.durationMs,
      tokens: attachment.tokens,
    };
  }
  return null;
}
//@ chunk-bnwcqde4.js:1837-2301 placement
var buildGoalSetMessage = (condition) =>
  `A session-scoped Stop hook is now active with condition: "${condition}". Briefly acknowledge the goal, then immediately start (or continue) working toward it \u2014 treat the condition itself as your directive and do not pause to ask the user what to do. The hook will block stopping until the condition holds. It auto-clears once the condition is met \u2014 do not tell the user to run \`/goal clear\` after success; that's only for clearing a goal early.`;
//@ chunk-bnwcqde4.js:2301-2484 placement
function getSessionStopPromptHooks(sessionHooksRegistry, sessionId) {
  let hooks = [];
  for (let hook of sessionHooksRegistry.get(sessionId, "Stop").get("Stop") ?? []) {
    if (hook.matcher !== "" || hook.skillRoot !== undefined) continue;
    for (let hook_2 of hook.hooks) if (hook_2.type === "prompt") hooks.push(hook_2);
  }
  return hooks;
}
//@ chunk-bnwcqde4.js:2484-2827 placement
/**
 * /goal 无法运行的两条说明：组织设置未读取（hooks 是否允许未知）与 hooks 被限制（disableAllHooks/allowManagedHooksOnly）。
 */
var GOAL_UNTRUSTED_WORKSPACE_MESSAGE =
  "/goal is only available in trusted workspaces. Restart, accept the trust dialog, and try again.";
var GOAL_HOOKS_POLICY_UNREAD_TEXT =
  "/goal can't run yet: your organization's settings haven't been read, so it isn't known whether it allows hooks.";
var GOAL_HOOKS_RESTRICTED_TEXT =
  "/goal can't run while hooks are restricted (disableAllHooks or allowManagedHooksOnly is set in settings or by policy).";
//@ chunk-bnwcqde4.js:2827-2852 placement
function _() {
  return !isCcsCoworkSurface();
}
//@ chunk-bnwcqde4.js:2852-2907 placement
function areHooksRestrictedForGoal() {
  return isCcsTenant()
    ? !_() ||
        shouldDisableAllHooksIncludingManaged() ||
        shouldHoldDeviceHooksByPolicy() ||
        personTurnedHooksOff()
    : shouldSkipSessionHooksByPolicy();
}
//@ chunk-bnwcqde4.js:2907-2979 placement (2.1.88 match: getValueFromInput, 1)
function getValueFromInput(input) {
  let message = {
    type: "prompt",
    prompt: input,
  };
  registerHookEligibility(message, () => !areHooksRestrictedForGoal());
  return message;
}
//@ chunk-bnwcqde4.js:2979-3152 placement
function getGoalBlockedReason() {
  if (areHooksRestrictedForGoal())
    return {
      message: GOAL_HOOKS_RESTRICTED_TEXT,
      code: "hooks_gate",
    };
  if (isHookPolicyUnanswered()) {
    markOrganizationAskHeld();
    return {
      message: GOAL_HOOKS_POLICY_UNREAD_TEXT,
      code: "hooks_held",
    };
  }
  if (!getIsNonInteractiveSession() && !checkHasTrustDialogAccepted())
    return {
      message: GOAL_UNTRUSTED_WORKSPACE_MESSAGE,
      code: "trust_gate",
    };
  return null;
}
//@ chunk-bnwcqde4.js:3152-3229 placement
function queueGoalOrigin(setAppState, condition, origin) {
  setAppState((state) => ({
    ...state,
    queuedGoalOrigin: {
      condition,
      origin,
    },
  }));
}
//@ chunk-bnwcqde4.js:3229-3397 placement
function consumeQueuedGoalOrigin(key, context) {
  let queuedGoalOrigin = context.getAppState().queuedGoalOrigin;
  if (queuedGoalOrigin === undefined || queuedGoalOrigin.condition !== key) return "user";
  context.setAppState((state) => ({
    ...state,
    queuedGoalOrigin: undefined,
  }));
  return queuedGoalOrigin.origin;
}
//@ chunk-bnwcqde4.js:3397-3988 placement
/**
 * 设置会话目标：检查钩子/信任门槛，替换旧目标，在 Stop 钩子注册表加入 prompt 型钩子并记录遥测。
 */
function setSessionGoal(condition, context, override) {
  let origin = override ?? consumeQueuedGoalOrigin(condition, context);
  let goalBlockedReason = getGoalBlockedReason();
  if (goalBlockedReason !== null) {
    logFeatureSad("goal_set", goalBlockedReason.code, {
      origin: fromEnum(origin),
    });
    return goalBlockedReason.message;
  }
  let sessionId = getSessionId();
  let activeGoal = context.getAppState().activeGoal;
  if (activeGoal !== undefined) logGoalCleared(activeGoal, "superseded");
  for (let hook of getSessionStopPromptHooks(context.sessionHooksRegistry, sessionId))
    context.sessionHooksRegistry.remove(sessionId, "Stop", hook);
  context.sessionHooksRegistry.add(sessionId, "Stop", "", getValueFromInput(condition));
  let activeGoal_2 = {
    condition,
    iterations: 0,
    setAt: Date.now(),
    origin,
    tokensAtStart: getTotalOutputTokens(),
  };
  context.setAppState((state) => ({
    ...state,
    activeGoal: activeGoal_2,
  }));
  context.applyMessageOp({
    type: "append",
    messages: [createAttachmentMessage(false, condition)],
  });
  logEvent("tengu_stop_hook_added", {
    promptLength: condition.length,
    via: lit("goal"),
    origin: fromEnum(origin),
  });
  logFeatureOk("goal_set");
  return null;
}
//@ chunk-bnwcqde4.js:3988-4394 placement
function clearSessionGoal(context) {
  let sessionId = getSessionId();
  let sessionStopPromptHooks = getSessionStopPromptHooks(context.sessionHooksRegistry, sessionId);
  if (sessionStopPromptHooks.length === 0) return null;
  let prompt = sessionStopPromptHooks[0].prompt;
  for (let sessionStopPromptHook of sessionStopPromptHooks)
    context.sessionHooksRegistry.remove(sessionId, "Stop", sessionStopPromptHook);
  let activeGoal = context.getAppState().activeGoal;
  if (activeGoal !== undefined) logGoalCleared(activeGoal, "user_clear");
  context.setAppState((state) =>
    state.activeGoal === undefined
      ? state
      : {
          ...state,
          activeGoal: undefined,
        },
  );
  context.applyMessageOp({
    type: "append",
    messages: [createAttachmentMessage(true, prompt)],
  });
  logEvent("tengu_stop_hook_removed", {
    via: lit("goal"),
  });
  return prompt;
}
//@ chunk-s4441tej.js:3789-4492 placement
/**
 * /goal 命令：设置、查看或清除会话目标（达成条件），长度有限制。
 */
var call = async (args, context) => {
  let condition = args.trim();
  if (condition === "") {
    let activeGoal = context.options.activeGoal;
    if (!activeGoal)
      return {
        type: "text",
        value: "No goal set. Usage: `/goal <condition>`",
      };
    let statusLine =
      activeGoal.iterations === 0
        ? "not yet evaluated"
        : `${activeGoal.iterations} ${plural(activeGoal.iterations, "turn")}`;
    let reasonLine = activeGoal.lastReason
      ? `
Last check: ${getFirstLine(activeGoal.lastReason.trim())}`
      : "";
    return {
      type: "text",
      value: `Goal active: ${activeGoal.condition} (${statusLine})${reasonLine}`,
    };
  }
  if (isGoalClearKeyword(condition)) {
    let cleared = clearSessionGoal(context);
    return {
      type: "text",
      value: cleared === null ? "No goal set" : `Goal cleared: ${cleared}`,
    };
  }
  if (condition.length > MAX_GOAL_CONDITION_CHARS) {
    logFeatureSad("goal_set", "too_long");
    return {
      type: "text",
      value: `Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${condition.length})`,
    };
  }
  let set = setSessionGoal(condition, context);
  if (set !== null)
    return {
      type: "text",
      value: set,
    };
  return {
    type: "query",
    value: `Goal set: ${condition}`,
    prompt: buildGoalSetMessage(condition),
  };
};
export {
  isHookPolicyUnanswered,
  logGoalCleared,
  isGoalClearKeyword,
  getGoalBlockedReason,
  getSessionStopPromptHooks,
  buildGoalSentinelAttachment,
  findActiveGoalCondition,
  isOrganizationHookPolicyPending,
  markOrganizationAskHeld,
  queueGoalOrigin,
  findLastMetGoal,
  clearSessionGoal,
  MAX_GOAL_CONDITION_CHARS,
  setSessionGoal,
  buildGoalSetMessage,
  getValueFromInput,
  call,
};
