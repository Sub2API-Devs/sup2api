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
import { IJ, J_ } from "../../utils/plugins/marketplaceNames.js";
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
import { vmi } from "../../utils/hooks.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createAttachmentMessage } from "../../utils/attachments.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";

//@ chunk-bnwcqde4.js:685-790 placement
function isOrganizationHookPolicyPending() {
  let t = !1;
  try {
    t = hasManagedSettings();
  } catch (error) {
    logError(error);
  }
  if (!t) return !1;
  try {
    return IJ();
  } catch (error) {
    return (logError(error), !0);
  }
}
//@ chunk-bnwcqde4.js:790-879 placement
function isHookPolicyUnanswered() {
  if (!isOrganizationHookPolicyPending()) return !1;
  try {
    return J_() === "unanswered";
  } catch (error) {
    return (logError(error), !0);
  }
}
//@ chunk-bnwcqde4.js:879-945 placement
function markOrganizationAskHeld() {
  try {
    getPluginRegistry().organizationAsk.hasHeld = !0;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-bnwcqde4.js:945-1020 placement
function buildGoalSentinelAttachment(t, o) {
  return { type: "goal_status", met: t, sentinel: !0, condition: o };
}
//@ chunk-bnwcqde4.js:1020-1306 placement
function findActiveGoalCondition(t) {
  if (!t) return null;
  for (let o = t.length - 1; o >= 0; o--) {
    let r = t[o];
    if (r?.type !== "attachment" || r.attachment.type !== "goal_status") continue;
    if (r.attachment.met || r.attachment.failed) return null;
    let condition = r.attachment.condition;
    return typeof condition === "string" && condition.length > 0 ? condition : null;
  }
  return null;
}
//@ chunk-bnwcqde4.js:1306-1436 placement
function logGoalCleared(t, o) {
  logEvent("tengu_goal_cleared", {
    reason: fromEnum(o),
    iterations: t.iterations,
    durationMs: Date.now() - t.setAt,
    origin: fromEnumOpt(t.origin),
  });
}
//@ chunk-bnwcqde4.js:1436-1507 placement
var MAX_GOAL_CONDITION_CHARS = 4000,
  k = new Set(["clear", "stop", "off", "reset", "none", "cancel"]);
//@ chunk-bnwcqde4.js:1507-1553 placement
function isGoalClearKeyword(t) {
  return k.has(t.toLowerCase());
}
//@ chunk-bnwcqde4.js:1553-1837 placement
function findLastMetGoal(t) {
  for (let o = t.length - 1; o >= 0; o--) {
    let r = t[o];
    if (r?.type !== "attachment" || r.attachment.type !== "goal_status") continue;
    let attachment = r.attachment;
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
var buildGoalSetMessage = (t) =>
  `A session-scoped Stop hook is now active with condition: "${t}". Briefly acknowledge the goal, then immediately start (or continue) working toward it \u2014 treat the condition itself as your directive and do not pause to ask the user what to do. The hook will block stopping until the condition holds. It auto-clears once the condition is met \u2014 do not tell the user to run \`/goal clear\` after success; that's only for clearing a goal early.`;
//@ chunk-bnwcqde4.js:2301-2484 placement
function getSessionStopPromptHooks(t, o) {
  let r = [];
  for (let e of t.get(o, "Stop").get("Stop") ?? []) {
    if (e.matcher !== "" || e.skillRoot !== void 0) continue;
    for (let hook of e.hooks) if (hook.type === "prompt") r.push(hook);
  }
  return r;
}
//@ chunk-bnwcqde4.js:2484-2827 placement
var GOAL_UNTRUSTED_WORKSPACE_MESSAGE =
    "/goal is only available in trusted workspaces. Restart, accept the trust dialog, and try again.",
  A =
    "/goal can't run yet: your organization's settings haven't been read, so it isn't known whether it allows hooks.",
  O =
    "/goal can't run while hooks are restricted (disableAllHooks or allowManagedHooksOnly is set in settings or by policy).";
//@ chunk-bnwcqde4.js:2827-2852 placement
function _() {
  return !isCcsCoworkSurface();
}
//@ chunk-bnwcqde4.js:2852-2907 placement
function u() {
  return isCcsTenant()
    ? !_() ||
        shouldDisableAllHooksIncludingManaged() ||
        shouldHoldDeviceHooksByPolicy() ||
        personTurnedHooksOff()
    : shouldSkipSessionHooksByPolicy();
}
//@ chunk-bnwcqde4.js:2907-2979 placement = getValueFromInput (1)
function getValueFromInput(input) {
  let o = { type: "prompt", prompt: input };
  return (vmi(o, () => !u()), o);
}
//@ chunk-bnwcqde4.js:2979-3152 placement
function getGoalBlockedReason() {
  if (u()) return { message: O, code: "hooks_gate" };
  if (isHookPolicyUnanswered()) return (markOrganizationAskHeld(), { message: A, code: "hooks_held" });
  if (!getIsNonInteractiveSession() && !checkHasTrustDialogAccepted())
    return { message: GOAL_UNTRUSTED_WORKSPACE_MESSAGE, code: "trust_gate" };
  return null;
}
//@ chunk-bnwcqde4.js:3152-3229 placement
function queueGoalOrigin(t, o, r) {
  t((e) => ({ ...e, queuedGoalOrigin: { condition: o, origin: r } }));
}
//@ chunk-bnwcqde4.js:3229-3397 placement
function consumeQueuedGoalOrigin(t, o) {
  let queuedGoalOrigin = o.getAppState().queuedGoalOrigin;
  if (queuedGoalOrigin === void 0 || queuedGoalOrigin.condition !== t) return "user";
  return (o.setAppState((e) => ({ ...e, queuedGoalOrigin: void 0 })), queuedGoalOrigin.origin);
}
/**
 * 设置会话目标：检查钩子/信任门槛，替换旧目标，在 Stop 钩子注册表加入 prompt 型钩子并记录遥测。
 */
//@ chunk-bnwcqde4.js:3397-3988 placement
function setSessionGoal(t, o, r) {
  let e = r ?? consumeQueuedGoalOrigin(t, o),
    n = getGoalBlockedReason();
  if (n !== null) return (logFeatureSad("goal_set", n.code, { origin: fromEnum(e) }), n.message);
  let s = getSessionId(),
    activeGoal = o.getAppState().activeGoal;
  if (activeGoal !== void 0) logGoalCleared(activeGoal, "superseded");
  for (let i of getSessionStopPromptHooks(o.sessionHooksRegistry, s))
    o.sessionHooksRegistry.remove(s, "Stop", i);
  o.sessionHooksRegistry.add(s, "Stop", "", getValueFromInput(t));
  let m = {
    condition: t,
    iterations: 0,
    setAt: Date.now(),
    origin: e,
    tokensAtStart: getTotalOutputTokens(),
  };
  return (
    o.setAppState((i) => ({ ...i, activeGoal: m })),
    o.applyMessageOp({ type: "append", messages: [createAttachmentMessage(!1, t)] }),
    logEvent("tengu_stop_hook_added", { promptLength: t.length, via: lit("goal"), origin: fromEnum(e) }),
    logFeatureOk("goal_set"),
    null
  );
}
//@ chunk-bnwcqde4.js:3988-4394 placement
function clearSessionGoal(t) {
  let o = getSessionId(),
    r = getSessionStopPromptHooks(t.sessionHooksRegistry, o);
  if (r.length === 0) return null;
  let prompt = r[0].prompt;
  for (let s of r) t.sessionHooksRegistry.remove(o, "Stop", s);
  let activeGoal = t.getAppState().activeGoal;
  if (activeGoal !== void 0) logGoalCleared(activeGoal, "user_clear");
  return (
    t.setAppState((s) => (s.activeGoal === void 0 ? s : { ...s, activeGoal: void 0 })),
    t.applyMessageOp({ type: "append", messages: [createAttachmentMessage(!0, prompt)] }),
    logEvent("tengu_stop_hook_removed", { via: lit("goal") }),
    prompt
  );
}
/**
 * /goal 命令：设置、查看或清除会话目标（达成条件），长度有限制。
 */
//@ chunk-s4441tej.js:3789-4492 placement
var call = async (args, context) => {
  let trimmed = args.trim();
  if (trimmed === "") {
    let activeGoal = context.options.activeGoal;
    if (!activeGoal) return { type: "text", value: "No goal set. Usage: `/goal <condition>`" };
    let r =
        activeGoal.iterations === 0
          ? "not yet evaluated"
          : `${activeGoal.iterations} ${plural(activeGoal.iterations, "turn")}`,
      n = activeGoal.lastReason
        ? `
Last check: ${getFirstLine(activeGoal.lastReason.trim())}`
        : "";
    return { type: "text", value: `Goal active: ${activeGoal.condition} (${r})${n}` };
  }
  if (isGoalClearKeyword(trimmed)) {
    let t = clearSessionGoal(context);
    return { type: "text", value: t === null ? "No goal set" : `Goal cleared: ${t}` };
  }
  if (trimmed.length > MAX_GOAL_CONDITION_CHARS)
    return (
      logFeatureSad("goal_set", "too_long"),
      {
        type: "text",
        value: `Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${trimmed.length})`,
      }
    );
  let a = setSessionGoal(trimmed, context);
  if (a !== null) return { type: "text", value: a };
  return { type: "query", value: `Goal set: ${trimmed}`, prompt: buildGoalSetMessage(trimmed) };
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
};
