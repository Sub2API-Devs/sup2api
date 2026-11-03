/**
 * utils/hooks/hookPolicy.ts
 *
 * 2.1.316 新增：钩子策略
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
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
import { isPrefilterableHook } from "../hooks.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-e6aww6q8.js:874823-874901 placement = _temp7 (1)
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
//@ chunk-e6aww6q8.js:874901-875000 placement
/**
 * 决定 fileSuggestion 钩子来源：策略托管时取策略设置，否则用调用方给的值。
 */
function resolveFileSuggestionHook(fileSuggestion) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (!isProjectScopeTrustAccepted()) return;
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.fileSuggestion : fileSuggestion;
}
//@ chunk-e6aww6q8.js:875037-875068 placement
var TENGU_QUIET_HOPCROFT = "tengu_quiet_hopcroft";
//@ chunk-e6aww6q8.js:875068-875173 placement
/**
 * 判断"静默"闸门是否开启（默认开，payload 显式开启且未用非默认主机时关闭）。
 */
function isQuietHopcroftGateOn() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_QUIET_HOPCROFT, false);
    return !(e === true && source === "payload" && !hasGrowthBookUsedNonDefaultHost());
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:875173-875203 placement
var TENGU_VAST_PLATYPUS = "tengu_vast_platypus";
//@ chunk-e6aww6q8.js:875203-875243 placement
/**
 * 判断 tengu_vast_platypus 开关是否关闭。
 */
function isVastPlatypusOn() {
  return !readFlagWithOverride(TENGU_VAST_PLATYPUS, {
    safe: false,
  });
}
//@ chunk-e6aww6q8.js:875243-875281 placement
/**
 * 判断事件是否为受保护的钩子事件且闸门开启。
 */
function isGuardedHookEvent(e) {
  return GUARD_HOOK_EVENTS.has(e) && isQuietHopcroftGateOn();
}
//@ chunk-e6aww6q8.js:875281-875339 placement
/**
 * 钩子输入字符串长度上限（MAX_STRING_LENGTH 的一半）。
 */
function hookInputSizeLimit() {
  return Math.floor(constants_11.MAX_STRING_LENGTH / 2);
}
//@ chunk-e6aww6q8.js:875339-875508 placement
function blockingErrorResult(hookEvent, command, r) {
  if (!isGuardedHookEvent(hookEvent)) return;
  return {
    blockingError: {
      blockingError: r,
      command,
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message: r,
      },
    }),
  };
}
//@ chunk-e6aww6q8.js:875508-875807 placement
function unserializableInputBlockMessage(e) {
  return `Blocked: this call's input can't be written as JSON, so the hook could not check it. The input is too large, or contains a value that JSON can't represent (such as a BigInt or a circular reference). Retry with a smaller, plain input.${e === undefined ? "" : ` (JSON error: ${errorMessage(e)})`}`;
}
//@ chunk-e6aww6q8.js:875807-876240 placement
/**
 * 生成无法确定适用 hook 时的阻止说明（区分内部故障与其他原因）。
 */
function hookResolutionFaultMessage(hookEvent, n) {
  if (mergeClients_3(n))
    return "Blocked: Claude Code could not work out which hooks apply to this call, because of a fault in Claude Code. Nothing in this session can fix it, and a retry is blocked the same way.";
  return `Blocked: Claude Code could not work out which hooks apply to this call. Retry with a different input. If every call is blocked, check the ${hookEvent} hooks in /hooks or in your settings.${n === undefined ? "" : ` (${errorMessage(n)})`}`;
}
//@ chunk-e6aww6q8.js:876240-876316 placement
/**
 * 若该钩子可被预过滤，返回插件钩子运行器的拒绝原因。
 */
function pluginHookRefusal(hookOriginLabel, hookEvent, hook) {
  return hookOriginLabel !== undefined && isPrefilterableHook(hook)
    ? getPluginHookRunner()?.refusal?.(hookOriginLabel, hookEvent, hook)
    : undefined;
}
//@ chunk-e6aww6q8.js:876316-876906 placement
function describeKillSwitchedHook(hookEvent, n, r, pluginId, h) {
  let y = h && !isQuietHopcroftGateOn();
  logForDebugging(
    `Hooks: a ${n} hook was not run${y ? ", and does not block: the kill switch has the blocks off" : ""}: ${r}`,
    {
      level: "warn",
    },
  );
  if (!h || y)
    return {
      outcome: "non_blocking_error",
    };
  let S = `Blocked, and retrying will not help. ${r}`;
  let w = pluginId
    ? `${S}
This hook comes from the ${pluginId} plugin.`
    : S;
  return {
    outcome: "blocking",
    blockingError: {
      blockingError: w,
      command: n,
      ...promptEndingFields(hookEvent, {
        noVerdict: "remote_runner_refused",
      }),
    },
    ...(hookEvent === "PermissionRequest" && {
      permissionRequestResult: {
        behavior: "deny",
        message: w,
      },
    }),
    ...((hookEvent === "UserPromptExpansion" || hookEvent === "UserPromptSubmit") && {
      suppressOriginalPrompt: true,
    }),
  };
}
export {
  resolveFileSuggestionHook,
  blockingErrorResult,
  hookInputSizeLimit,
  isGuardedHookEvent,
  isVastPlatypusOn,
  isQuietHopcroftGateOn,
  hookResolutionFaultMessage,
  pluginHookRefusal,
  describeKillSwitchedHook,
  unserializableInputBlockMessage,
  hasPolicySetting,
};
