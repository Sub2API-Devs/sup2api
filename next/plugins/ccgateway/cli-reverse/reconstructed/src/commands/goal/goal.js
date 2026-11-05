/**
 * commands/goal/goal.ts
 *
 * 2.1.316 新增：/goal 命令：设置、查看或清除会话目标（达成条件），长度有限制。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f14qge9c.js (19)
 * attribution: placement 19
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f14qge9c.js:649-754 placement
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
//@ chunk-f14qge9c.js:754-843 placement
function isHookPolicyUnanswered() {
  if (!isOrganizationHookPolicyPending()) return false;
  try {
    return marketplaceNameAnswerState() === "unanswered";
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-f14qge9c.js:843-909 placement
function markOrganizationAskHeld() {
  try {
    getPluginRegistry().organizationAsk.hasHeld = true;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-f14qge9c.js:909-984 placement
function buildGoalSentinelAttachment(met, condition) {
  return {
    type: "goal_status",
    met,
    sentinel: true,
    condition,
  };
}
//@ chunk-f14qge9c.js:984-1270 placement
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
//@ chunk-f14qge9c.js:1270-1400 placement
function logGoalCleared(condition, reason) {
  logEvent("tengu_goal_cleared", {
    reason: fromEnum(reason),
    iterations: condition.iterations,
    durationMs: Date.now() - condition.setAt,
    origin: fromEnumOpt(condition.origin),
  });
}
//@ chunk-f14qge9c.js:1400-1471 placement
var MAX_GOAL_CONDITION_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GOAL_CLEAR_WORDS;
deferInit("chunk-f14qge9c.js:1400", () => {
  MAX_GOAL_CONDITION_CHARS = 4000;
  GOAL_CLEAR_WORDS = new Set(["clear", "stop", "off", "reset", "none", "cancel"]);
});
//@ chunk-f14qge9c.js:1471-1517 placement
function isGoalClearKeyword(arg) {
  return GOAL_CLEAR_WORDS.has(arg.toLowerCase());
}
//@ chunk-f14qge9c.js:1517-1801 placement
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
//@ chunk-f14qge9c.js:1801-2265 placement
var buildGoalSetMessage = (condition) =>
  `A session-scoped Stop hook is now active with condition: "${condition}". Briefly acknowledge the goal, then immediately start (or continue) working toward it \u2014 treat the condition itself as your directive and do not pause to ask the user what to do. The hook will block stopping until the condition holds. It auto-clears once the condition is met \u2014 do not tell the user to run \`/goal clear\` after success; that's only for clearing a goal early.`;
//@ chunk-f14qge9c.js:2265-2448 placement
function getSessionStopPromptHooks(sessionHooksRegistry, sessionId) {
  let hooks = [];
  for (let hook of sessionHooksRegistry.get(sessionId, "Stop").get("Stop") ?? []) {
    if (hook.matcher !== "" || hook.skillRoot !== undefined) continue;
    for (let hook_2 of hook.hooks) if (hook_2.type === "prompt") hooks.push(hook_2);
  }
  return hooks;
}
//@ chunk-f14qge9c.js:2448-3045 placement
/**
 * /goal 无法运行的两条说明：组织设置未读取（hooks 是否允许未知）与 hooks 被限制（disableAllHooks/allowManagedHooksOnly）。
 */
var GOAL_UNTRUSTED_WORKSPACE_MESSAGE =
  "/goal is only available in trusted workspaces. Restart, accept the trust dialog, and try again.";
var GOAL_HOOKS_POLICY_UNREAD_TEXT =
  "/goal can't run yet: your organization's settings haven't been read, so it isn't known whether it allows hooks.";
var GOAL_HOOKS_RESTRICTED_TEXT =
  "/goal can't run while hooks are restricted (disableAllHooks or allowManagedHooksOnly is set in settings or by policy).";
var GOAL_RELAYED_MESSAGE =
  "This message was relayed from Slack, Teams or a project thread and may be someone else's, so /goal didn't set, clear or show the goal. To use /goal, send it yourself from the terminal, the Claude app, claude.ai/code or your own Remote Control app.";
//@ chunk-f14qge9c.js:3045-3094 placement
function areHooksRestrictedForGoal() {
  return isCcsTenant()
    ? shouldDisableAllHooksIncludingManaged() || shouldHoldDeviceHooksByPolicy() || personTurnedHooksOff()
    : shouldSkipSessionHooksByPolicy();
}
//@ chunk-f14qge9c.js:3094-3166 placement (2.1.88 match: getValueFromInput, 1)
function getValueFromInput(input) {
  let message = {
    type: "prompt",
    prompt: input,
  };
  registerHookEligibility(message, () => !areHooksRestrictedForGoal());
  return message;
}
//@ chunk-f14qge9c.js:3166-3339 placement
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
//@ chunk-f14qge9c.js:3339-3416 placement
function queueGoalOrigin(setAppState, condition, origin) {
  setAppState((state) => ({
    ...state,
    queuedGoalOrigin: {
      condition,
      origin,
    },
  }));
}
//@ chunk-f14qge9c.js:3416-3584 placement
function consumeQueuedGoalOrigin(key, context) {
  let queuedGoalOrigin = context.getAppState().queuedGoalOrigin;
  if (queuedGoalOrigin === undefined || queuedGoalOrigin.condition !== key) return "user";
  context.setAppState((state) => ({
    ...state,
    queuedGoalOrigin: undefined,
  }));
  return queuedGoalOrigin.origin;
}
//@ chunk-f14qge9c.js:3584-4175 placement
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
//@ chunk-f14qge9c.js:4175-4581 placement
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
export {
  isHookPolicyUnanswered,
  getSessionStopPromptHooks,
  clearSessionGoal,
  setSessionGoal,
  buildGoalSentinelAttachment,
  queueGoalOrigin,
  findActiveGoalCondition,
  logGoalCleared,
  isOrganizationHookPolicyPending,
  markOrganizationAskHeld,
  isGoalClearKeyword,
  getGoalBlockedReason,
  getValueFromInput,
  GOAL_RELAYED_MESSAGE,
  MAX_GOAL_CONDITION_CHARS,
  buildGoalSetMessage,
  findLastMetGoal,
};
