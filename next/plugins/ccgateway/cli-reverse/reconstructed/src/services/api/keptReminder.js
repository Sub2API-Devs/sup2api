/**
 * services/api/keptReminder.ts
 *
 * 2.1.316 新增：跨请求保留的系统提醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { canSendFirstPartyBetas } from "../../utils/betas.js";
import { getAPIProvider, isActualFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { tetherEnvAccessor } from "../../utils/wireToolInputEcho.js";
import { isCcsTenant, getSessionId } from "../../bootstrap/state.js";
import { antEnv } from "../../utils/env.js";
import { getCachedClientData } from "../../utils/config.js";
import { findModelKeyedEntry } from "../../utils/attachments/totalTokensReminder.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2648144-2648183 placement
var thinkingRelayModuleKept; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-5xgkngpb.js:2648144", () => {
  thinkingRelayModuleKept = require("../teleport/relayState.js");
});
//@ chunk-5xgkngpb.js:2648183-2648399 placement
function isTetherLive() {
  if (!canSendFirstPartyBetas()) return false;
  if (getAPIProvider() !== "firstParty") return false;
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.tetherZdrSeen ||=
    hasComplianceTaint("zdr") && getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkly_sunrise", true) === true;
  if (sessionFeatureValues.tetherZdrSeen) return false;
  sessionFeatureValues.tetherLiveGate ??= tetherLiveFlag();
  return sessionFeatureValues.tetherLiveGate;
}
//@ chunk-5xgkngpb.js:2648399-2648531 placement
function tetherLiveFlag() {
  let CLAUDE_CODE_TETHER_LIVE = tetherEnvAccessor.CLAUDE_CODE_TETHER_LIVE;
  if (CLAUDE_CODE_TETHER_LIVE !== undefined) return CLAUDE_CODE_TETHER_LIVE;
  if (!isCcsTenant() && !isActualFirstPartyAnthropicBaseUrl()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_curious_tower", false);
}
//@ chunk-5xgkngpb.js:2648531-2648569 placement
function disableTetherLiveGate() {
  getSessionFeatureValues().tetherLiveGate = false;
}
//@ chunk-5xgkngpb.js:2648569-2648602 placement
var TENGU_SLEEPY_SNOWFLAKE = "tengu_sleepy_snowflake";
//@ chunk-5xgkngpb.js:2648602-2649347 placement
/**
 * 决定保留提醒（kept reminder）的范围 off/threads/all：env 优先，其次 transcript 记录值，再次 client_data 中按模型匹配的值，最后 GrowthBook tengu_sleepy_snowflake。
 */
function keptReminderScope(model, recorded) {
  let CLAUDE_CODE_SLEEPY_SNOWFLAKE = antEnv.CLAUDE_CODE_SLEEPY_SNOWFLAKE;
  if (CLAUDE_CODE_SLEEPY_SNOWFLAKE !== undefined)
    return {
      scope: CLAUDE_CODE_SLEEPY_SNOWFLAKE,
      source: "env",
    };
  if (recorded !== undefined)
    return {
      scope: recorded ? "all" : "off",
      source: "recorded",
    };
  let clientValue = getCachedClientData()?.[TENGU_SLEEPY_SNOWFLAKE];
  let isList =
    clientValue !== undefined &&
    clientValue !== null &&
    typeof clientValue === "object" &&
    !Array.isArray(clientValue);
  let entry = isList ? findModelKeyedEntry(clientValue, model)?.[1] : undefined;
  if (entry === "threads" || entry === "all")
    return {
      scope: entry,
      source: "clientData",
    };
  if (
    (clientValue !== undefined && clientValue !== null && !isList) ||
    (entry !== undefined && entry !== "off")
  )
    logForDebugging(
      `[reminders] ignoring client_data ${TENGU_SLEEPY_SNOWFLAKE} for ${model}: got ${isList ? `the value ${JSON.stringify(entry)}` : "a value that is not a map"}; expected a map from model pattern to "off", "threads" or "all"`,
      {
        level: "warn",
      },
    );
  if (entry !== undefined)
    return {
      scope: "off",
      source: "clientData",
    };
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_snowflake", "all");
  return {
    scope:
      featureValue_CACHED_MAY_BE_STALE === "threads" || featureValue_CACHED_MAY_BE_STALE === "all"
        ? featureValue_CACHED_MAY_BE_STALE
        : "off",
    source: "growthbook",
  };
}
//@ chunk-5xgkngpb.js:2649347-2649389 placement
function isKeptReminderModeNotOff(model, querySource) {
  return keptReminderModeSafe(model, querySource) !== "off";
}
//@ chunk-5xgkngpb.js:2649389-2649539 placement
function keptReminderModeSafe(model, seed) {
  try {
    return keptReminderMode(model, seed);
  } catch (error) {
    logError(error);
    try {
      let { byModel } = keptReminderDelivery(getSessionId());
      let lower = strip1mSuffix(model).toLowerCase();
      if (!byModel.has(lower)) byModel.set(lower, "off");
    } catch {}
    return "off";
  }
}
//@ chunk-5xgkngpb.js:2649539-2649715 placement
function keptReminderDelivery(sessionId) {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.keptReminderDelivery?.conversationId !== sessionId)
    sessionFeatureValues.keptReminderDelivery = {
      conversationId: sessionId,
      byModel: new Map(),
      served: new Set(),
    };
  return sessionFeatureValues.keptReminderDelivery;
}
//@ chunk-5xgkngpb.js:2649715-2650523 placement
/**
 * 按模型计算并缓存保留提醒模式：仅第一方 Anthropic；首次可用记录的种子值；threads 模式需 tether 可用；记录 seeded/applied 事件。
 */
function keptReminderMode(model, seed) {
  let sessionFeatureValues = getSessionFeatureValues();
  let result =
    (tetherEnvAccessor.CLAUDE_CODE_TETHER_LIVE === true && sessionFeatureValues.tetherLiveGate !== false) ||
    isCcsTenant();
  if (
    !canSendFirstPartyBetas() ||
    getAPIProvider() !== "firstParty" ||
    (!result && !isActualFirstPartyAnthropicBaseUrl())
  )
    return "off";
  if (sessionFeatureValues.keptReminderRetired) return "off";
  let delivery = keptReminderDelivery(getSessionId());
  let { byModel } = delivery;
  let lower = strip1mSuffix(model).toLowerCase();
  let byModelEntry = byModel.get(lower);
  let recorded;
  if (seed !== undefined && !delivery.seedTaken) {
    delivery.seedTaken = true;
    recorded = isFoamySpringEnabled() ? seed.recorded : undefined;
  }
  if (byModelEntry !== undefined && (recorded === undefined || !delivery.served.has(lower)))
    return byModelEntry;
  if (byModelEntry === undefined && !result && !isFirstPartyBaseUrl()) {
    byModel.set(lower, "off");
    return "off";
  }
  let { scope, source } = keptReminderScope(model, recorded);
  let effectiveScope = scope === "threads" && !isTetherLive() ? "off" : scope;
  byModel.set(lower, effectiveScope);
  if (source === "clientData" || source === "growthbook") delivery.served.add(lower);
  else delivery.served.delete(lower);
  if (source === "recorded")
    logEvent("tengu_kept_reminder_seeded", {
      model: telemetrySafeModelName(model),
      recorded: effectiveScope !== "off",
      replaced: byModelEntry !== undefined,
    });
  if (effectiveScope !== "off" && (byModelEntry === undefined || byModelEntry === "off"))
    logEvent("tengu_sleepy_snowflake_applied", {
      model: telemetrySafeModelName(model),
      source: fromEnum(source),
      value: fromEnum(effectiveScope),
    });
  return effectiveScope;
}
//@ chunk-5xgkngpb.js:2650523-2650566 placement
function retireKeptReminder() {
  getSessionFeatureValues().keptReminderRetired = true;
}
//@ chunk-5xgkngpb.js:2650566-2650620 placement
function hasClearAtProbeBudget() {
  return (getSessionFeatureValues().clearAtProbeFailures ?? 0) < 2;
}
//@ chunk-5xgkngpb.js:2650620-2650699 placement
function noteClearAtProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.clearAtProbeFailures = (sessionFeatureValues.clearAtProbeFailures ?? 0) + 1;
}
//@ chunk-5xgkngpb.js:2650699-2650753 placement
function hasThreadsProbeBudget() {
  return (getSessionFeatureValues().threadsProbeFailures ?? 0) < 2;
}
//@ chunk-5xgkngpb.js:2650753-2650832 placement
function noteThreadsProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.threadsProbeFailures = (sessionFeatureValues.threadsProbeFailures ?? 0) + 1;
}
//@ chunk-5xgkngpb.js:2650832-2650947 placement
function logKeptReminderOk() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.keptReminderOkLogged !== true) {
    sessionFeatureValues.keptReminderOkLogged = true;
    logFeatureOk("api_kept_reminder_clear_at");
  }
}
export {
  isTetherLive,
  isKeptReminderModeNotOff,
  noteClearAtProbeFailure,
  hasClearAtProbeBudget,
  hasThreadsProbeBudget,
  noteThreadsProbeFailure,
  retireKeptReminder,
  disableTetherLiveGate,
  logKeptReminderOk,
  thinkingRelayModuleKept,
  keptReminderModeSafe,
};
