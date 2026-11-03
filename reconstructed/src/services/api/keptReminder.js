/**
 * services/api/keptReminder.ts
 *
 * 2.1.316 新增：跨请求保留的系统提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
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

//@ chunk-e6aww6q8.js:2592973-2593012 placement
var thinkingRelayModuleKept = require("./chunk-1cnesc1e.js");
//@ chunk-e6aww6q8.js:2593012-2593228 placement
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
//@ chunk-e6aww6q8.js:2593228-2593360 placement
function tetherLiveFlag() {
  let CLAUDE_CODE_TETHER_LIVE = tetherEnvAccessor.CLAUDE_CODE_TETHER_LIVE;
  if (CLAUDE_CODE_TETHER_LIVE !== undefined) return CLAUDE_CODE_TETHER_LIVE;
  if (!isCcsTenant() && !isActualFirstPartyAnthropicBaseUrl()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_curious_tower", false);
}
//@ chunk-e6aww6q8.js:2593360-2593398 placement
function disableTetherLiveGate() {
  getSessionFeatureValues().tetherLiveGate = false;
}
//@ chunk-e6aww6q8.js:2593398-2593431 placement
var TENGU_SLEEPY_SNOWFLAKE = "tengu_sleepy_snowflake";
//@ chunk-e6aww6q8.js:2593431-2594176 placement
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
  let s = getCachedClientData()?.[TENGU_SLEEPY_SNOWFLAKE];
  let h = s !== undefined && s !== null && typeof s === "object" && !Array.isArray(s);
  let y = h ? findModelKeyedEntry(s, model)?.[1] : undefined;
  if (y === "threads" || y === "all")
    return {
      scope: y,
      source: "clientData",
    };
  if ((s !== undefined && s !== null && !h) || (y !== undefined && y !== "off"))
    logForDebugging(
      `[reminders] ignoring client_data ${TENGU_SLEEPY_SNOWFLAKE} for ${model}: got ${h ? `the value ${JSON.stringify(y)}` : "a value that is not a map"}; expected a map from model pattern to "off", "threads" or "all"`,
      {
        level: "warn",
      },
    );
  if (y !== undefined)
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
//@ chunk-e6aww6q8.js:2594176-2594218 placement
function isKeptReminderModeNotOff(e, n) {
  return keptReminderModeSafe(e, n) !== "off";
}
//@ chunk-e6aww6q8.js:2594218-2594368 placement
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
//@ chunk-e6aww6q8.js:2594368-2594544 placement
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
//@ chunk-e6aww6q8.js:2594544-2595348 placement
/**
 * 按模型计算并缓存保留提醒模式：仅第一方 Anthropic；首次可用记录的种子值；threads 模式需 tether 可用；记录 seeded/applied 事件。
 */
function keptReminderMode(model, seed) {
  let sessionFeatureValues = getSessionFeatureValues();
  let h =
    (tetherEnvAccessor.CLAUDE_CODE_TETHER_LIVE === true && sessionFeatureValues.tetherLiveGate !== false) ||
    isCcsTenant();
  if (
    !canSendFirstPartyBetas() ||
    getAPIProvider() !== "firstParty" ||
    (!h && !isActualFirstPartyAnthropicBaseUrl())
  )
    return "off";
  if (sessionFeatureValues.keptReminderRetired) return "off";
  let y = keptReminderDelivery(getSessionId());
  let { byModel } = y;
  let lower = strip1mSuffix(model).toLowerCase();
  let L = byModel.get(lower);
  let recorded;
  if (seed !== undefined && !y.seedTaken) {
    y.seedTaken = true;
    recorded = isFoamySpringEnabled() ? seed.recorded : undefined;
  }
  if (L !== undefined && (recorded === undefined || !y.served.has(lower))) return L;
  if (L === undefined && !h && !isFirstPartyBaseUrl()) {
    byModel.set(lower, "off");
    return "off";
  }
  let { scope, source } = keptReminderScope(model, recorded);
  let Se = scope === "threads" && !isTetherLive() ? "off" : scope;
  byModel.set(lower, Se);
  if (source === "clientData" || source === "growthbook") y.served.add(lower);
  else y.served.delete(lower);
  if (source === "recorded")
    logEvent("tengu_kept_reminder_seeded", {
      model: telemetrySafeModelName(model),
      recorded: Se !== "off",
      replaced: L !== undefined,
    });
  if (Se !== "off" && (L === undefined || L === "off"))
    logEvent("tengu_sleepy_snowflake_applied", {
      model: telemetrySafeModelName(model),
      source: fromEnum(source),
      value: fromEnum(Se),
    });
  return Se;
}
//@ chunk-e6aww6q8.js:2595348-2595391 placement
function retireKeptReminder() {
  getSessionFeatureValues().keptReminderRetired = true;
}
//@ chunk-e6aww6q8.js:2595391-2595445 placement
function hasClearAtProbeBudget() {
  return (getSessionFeatureValues().clearAtProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2595445-2595524 placement
function noteClearAtProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.clearAtProbeFailures = (sessionFeatureValues.clearAtProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2595524-2595578 placement
function hasThreadsProbeBudget() {
  return (getSessionFeatureValues().threadsProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2595578-2595657 placement
function noteThreadsProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.threadsProbeFailures = (sessionFeatureValues.threadsProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2595657-2595772 placement
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
