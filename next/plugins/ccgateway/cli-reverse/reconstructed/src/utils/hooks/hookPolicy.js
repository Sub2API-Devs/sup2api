/**
 * utils/hooks/hookPolicy.ts
 *
 * 2.1.316 新增：钩子策略
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 */
import { constants as constants_11 } from "buffer";
import { getSettingsForSource } from "../settings/settings.js";
import { shouldDisableAllHooksIncludingManaged } from "./hooksConfigSnapshot.js";
import { isProjectScopeTrustAccepted } from "../config.js";
import { isStatusLineManagedOnly } from "./hookInputRewrite.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
} from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { GUARD_HOOK_EVENTS } from "../../schemas/hookEntryValidation.js";
import { errorMessage } from "../errors.js";
import { mergeClients as mergeClients_3 } from "../hostScoped.js";
import { isOwnerRunHook } from "../hooks.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-5xgkngpb.js:885297-885375 placement (2.1.88 match: _temp7, 1)
/**
 * 判断托管策略中是否存在某设置项（读取失败按存在处理）。
 */
function hasPolicySetting(a_2) {
  try {
    return getSettingsForSource("policySettings")?.[a_2] !== undefined;
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:885375-885474 placement
/**
 * 决定 fileSuggestion 钩子来源：策略托管时取策略设置，否则用调用方给的值。
 */
function resolveFileSuggestionHook(fileSuggestion) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (!isProjectScopeTrustAccepted()) return;
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.fileSuggestion : fileSuggestion;
}
//@ chunk-5xgkngpb.js:885511-885542 placement
var TENGU_QUIET_HOPCROFT = "tengu_quiet_hopcroft";
//@ chunk-5xgkngpb.js:885542-885647 placement
/**
 * 判断"静默"闸门是否开启（默认开，payload 显式开启且未用非默认主机时关闭）。
 */
function isQuietHopcroftGateOn() {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_QUIET_HOPCROFT, false);
    return !(value === true && source === "payload" && !hasGrowthBookUsedNonDefaultHost());
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:885647-885677 placement
var TENGU_VAST_PLATYPUS = "tengu_vast_platypus";
//@ chunk-5xgkngpb.js:885677-885717 placement
/**
 * 判断 tengu_vast_platypus 开关是否关闭。
 */
function isVastPlatypusOn() {
  return !readFlagWithOverride(TENGU_VAST_PLATYPUS, {
    safe: false,
  });
}
//@ chunk-5xgkngpb.js:885717-885755 placement
/**
 * 判断事件是否为受保护的钩子事件且闸门开启。
 */
function isGuardedHookEvent(hookEvent) {
  return GUARD_HOOK_EVENTS.has(hookEvent) && isQuietHopcroftGateOn();
}
//@ chunk-5xgkngpb.js:885755-885813 placement
/**
 * 钩子输入字符串长度上限（MAX_STRING_LENGTH 的一半）。
 */
function hookInputSizeLimit() {
  return Math.floor(constants_11.MAX_STRING_LENGTH / 2);
}
//@ chunk-5xgkngpb.js:885813-885982 placement
function blockingErrorResult(hookEvent, command, message) {
  if (!isGuardedHookEvent(hookEvent)) return;
  return {
    blockingError: {
      blockingError: message,
      command,
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message,
      },
    }),
  };
}
//@ chunk-5xgkngpb.js:885982-886281 placement
function unserializableInputBlockMessage(error) {
  return `Blocked: this call's input can't be written as JSON, so the hook could not check it. The input is too large, or contains a value that JSON can't represent (such as a BigInt or a circular reference). Retry with a smaller, plain input.${error === undefined ? "" : ` (JSON error: ${errorMessage(error)})`}`;
}
//@ chunk-5xgkngpb.js:886281-886714 placement
/**
 * 生成无法确定适用 hook 时的阻止说明（区分内部故障与其他原因）。
 */
function hookResolutionFaultMessage(hookEvent, error) {
  if (mergeClients_3(error))
    return "Blocked: Claude Code could not work out which hooks apply to this call, because of a fault in Claude Code. Nothing in this session can fix it, and a retry is blocked the same way.";
  return `Blocked: Claude Code could not work out which hooks apply to this call. Retry with a different input. If every call is blocked, check the ${hookEvent} hooks in /hooks or in your settings.${error === undefined ? "" : ` (${errorMessage(error)})`}`;
}
//@ chunk-5xgkngpb.js:886714-886792 placement
/**
 * 若该钩子可被预过滤，返回插件钩子运行器的拒绝原因。
 */
function pluginHookRefusal(hookOriginLabel, hookEvent, hook) {
  return hookOriginLabel !== undefined && isOwnerRunHook(hookOriginLabel, hook)
    ? getPluginHookRunner()?.refusal?.(hookOriginLabel, hookEvent, hook)
    : undefined;
}
//@ chunk-5xgkngpb.js:886792-887381 placement
function describeKillSwitchedHook(hookEvent, hookEvent_2, reason, pluginId, blocks) {
  let gateOff = blocks && !isQuietHopcroftGateOn();
  logForDebugging(
    `Hooks: a ${hookEvent_2} hook was not run${gateOff ? ", and does not block: the kill switch has the blocks off" : ""}: ${reason}`,
    {
      level: "warn",
    },
  );
  if (!blocks || gateOff)
    return {
      outcome: "non_blocking_error",
    };
  let baseText = `Blocked, and retrying will not help. ${reason}`;
  let text = pluginId
    ? `${baseText}
This hook comes from the ${pluginId} plugin.`
    : baseText;
  return {
    outcome: "blocking",
    blockingError: {
      blockingError: text,
      command: hookEvent_2,
      ...promptEndingFields(hookEvent, {
        noVerdict: "remote_runner_refused",
      }),
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message: text,
      },
    }),
    ...((hookEvent === "UserPromptExpansion" || hookEvent === "UserPromptSubmit") && {
      suppressOriginalPrompt: true,
    }),
  };
}
export {
  describeKillSwitchedHook,
  isVastPlatypusOn,
  blockingErrorResult,
  hookInputSizeLimit,
  isGuardedHookEvent,
  isQuietHopcroftGateOn,
  hookResolutionFaultMessage,
  pluginHookRefusal,
  unserializableInputBlockMessage,
  hasPolicySetting,
  resolveFileSuggestionHook,
};
