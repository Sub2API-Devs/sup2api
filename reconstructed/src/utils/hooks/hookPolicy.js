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
function qWe(a_2) {
  try {
    return getSettingsForSource("policySettings")?.[a_2] !== void 0;
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:874901-875000 placement
function NBr(e) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (!isProjectScopeTrustAccepted()) return;
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.fileSuggestion : e;
}
//@ chunk-e6aww6q8.js:875037-875068 placement
var TENGU_QUIET_HOPCROFT = "tengu_quiet_hopcroft";
//@ chunk-e6aww6q8.js:875068-875173 placement
function I7() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      TENGU_QUIET_HOPCROFT,
      !1,
    );
    return !(e === !0 && source === "payload" && !hasGrowthBookUsedNonDefaultHost());
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:875173-875203 placement
var TENGU_VAST_PLATYPUS = "tengu_vast_platypus";
//@ chunk-e6aww6q8.js:875203-875243 placement
function DHt() {
  return !readFlagWithOverride(TENGU_VAST_PLATYPUS, { safe: !1 });
}
//@ chunk-e6aww6q8.js:875243-875281 placement
function W0(e) {
  return GUARD_HOOK_EVENTS.has(e) && I7();
}
//@ chunk-e6aww6q8.js:875281-875339 placement
function LHt() {
  return Math.floor(constants_11.MAX_STRING_LENGTH / 2);
}
//@ chunk-e6aww6q8.js:875339-875508 placement
function blockingErrorResult(e, n, r) {
  if (!W0(e)) return;
  return {
    blockingError: { blockingError: r, command: n },
    ...(e === "PermissionRequest" && { permissionRequestResult: { behavior: "deny", message: r } }),
  };
}
//@ chunk-e6aww6q8.js:875508-875807 placement
function unserializableInputBlockMessage(e) {
  return `Blocked: this call's input can't be written as JSON, so the hook could not check it. The input is too large, or contains a value that JSON can't represent (such as a BigInt or a circular reference). Retry with a smaller, plain input.${e === void 0 ? "" : ` (JSON error: ${errorMessage(e)})`}`;
}
/**
 * 生成无法确定适用 hook 时的阻止说明（区分内部故障与其他原因）。
 */
//@ chunk-e6aww6q8.js:875807-876240 placement
function hookResolutionFaultMessage(e, n) {
  if (mergeClients_3(n))
    return "Blocked: Claude Code could not work out which hooks apply to this call, because of a fault in Claude Code. Nothing in this session can fix it, and a retry is blocked the same way.";
  return `Blocked: Claude Code could not work out which hooks apply to this call. Retry with a different input. If every call is blocked, check the ${e} hooks in /hooks or in your settings.${n === void 0 ? "" : ` (${errorMessage(n)})`}`;
}
//@ chunk-e6aww6q8.js:876240-876316 placement
function Hge(e, n, r) {
  return e !== void 0 && isPrefilterableHook(r) ? getPluginHookRunner()?.refusal?.(e, n, r) : void 0;
}
//@ chunk-e6aww6q8.js:876316-876906 placement
function describeKillSwitchedHook(e, n, r, s, h) {
  let y = h && !I7();
  if (
    (logForDebugging(
      `Hooks: a ${n} hook was not run${y ? ", and does not block: the kill switch has the blocks off" : ""}: ${r}`,
      { level: "warn" },
    ),
    !h || y)
  )
    return { outcome: "non_blocking_error" };
  let S = `Blocked, and retrying will not help. ${r}`,
    w = s
      ? `${S}
This hook comes from the ${s} plugin.`
      : S;
  return {
    outcome: "blocking",
    blockingError: {
      blockingError: w,
      command: n,
      ...promptEndingFields(e, { noVerdict: "remote_runner_refused" }),
    },
    ...(e === "PermissionRequest" && { permissionRequestResult: { behavior: "deny", message: w } }),
    ...((e === "UserPromptExpansion" || e === "UserPromptSubmit") && { suppressOriginalPrompt: !0 }),
  };
}

export {
  NBr,
  blockingErrorResult,
  LHt,
  W0,
  DHt,
  I7,
  hookResolutionFaultMessage,
  Hge,
  describeKillSwitchedHook,
  unserializableInputBlockMessage,
  qWe,
};
