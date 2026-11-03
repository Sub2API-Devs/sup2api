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
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { ijt } from "../../utils/wireToolInputEcho.js";
import { isCcsTenant, getSessionId } from "../../bootstrap/state.js";
import { antEnv } from "../../utils/env.js";
import { getCachedClientData } from "../../utils/config.js";
import { findModelKeyedEntry } from "../../utils/attachments/totalTokensReminder.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { Lt } from "../../utils/model/modelIds.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:2592973-2593012 placement
var dyr = require("./chunk-1cnesc1e.js");
//@ chunk-e6aww6q8.js:2593012-2593228 placement
function isTetherLive() {
  if (!canSendFirstPartyBetas()) return !1;
  if (getAPIProvider() !== "firstParty") return !1;
  let e = Ao();
  if (
    ((e.tetherZdrSeen ||=
      hasComplianceTaint("zdr") && getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkly_sunrise", !0) === !0),
    e.tetherZdrSeen)
  )
    return !1;
  return ((e.tetherLiveGate ??= tetherLiveFlag()), e.tetherLiveGate);
}
//@ chunk-e6aww6q8.js:2593228-2593360 placement
function tetherLiveFlag() {
  let CLAUDE_CODE_TETHER_LIVE = ijt.CLAUDE_CODE_TETHER_LIVE;
  if (CLAUDE_CODE_TETHER_LIVE !== void 0) return CLAUDE_CODE_TETHER_LIVE;
  if (!isCcsTenant() && !isActualFirstPartyAnthropicBaseUrl()) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_curious_tower", !1);
}
//@ chunk-e6aww6q8.js:2593360-2593398 placement
function IQe() {
  Ao().tetherLiveGate = !1;
}
//@ chunk-e6aww6q8.js:2593398-2593431 placement
var TENGU_SLEEPY_SNOWFLAKE = "tengu_sleepy_snowflake";
/**
 * 决定保留提醒（kept reminder）的范围 off/threads/all：env 优先，其次 transcript 记录值，再次 client_data 中按模型匹配的值，最后 GrowthBook tengu_sleepy_snowflake。
 */
//@ chunk-e6aww6q8.js:2593431-2594176 placement
function keptReminderScope(model, recorded) {
  let CLAUDE_CODE_SLEEPY_SNOWFLAKE = antEnv.CLAUDE_CODE_SLEEPY_SNOWFLAKE;
  if (CLAUDE_CODE_SLEEPY_SNOWFLAKE !== void 0) return { scope: CLAUDE_CODE_SLEEPY_SNOWFLAKE, source: "env" };
  if (recorded !== void 0) return { scope: recorded ? "all" : "off", source: "recorded" };
  let s = getCachedClientData()?.[TENGU_SLEEPY_SNOWFLAKE],
    h = s !== void 0 && s !== null && typeof s === "object" && !Array.isArray(s),
    y = h ? findModelKeyedEntry(s, model)?.[1] : void 0;
  if (y === "threads" || y === "all") return { scope: y, source: "clientData" };
  if ((s !== void 0 && s !== null && !h) || (y !== void 0 && y !== "off"))
    logForDebugging(
      `[reminders] ignoring client_data ${TENGU_SLEEPY_SNOWFLAKE} for ${model}: got ${h ? `the value ${JSON.stringify(y)}` : "a value that is not a map"}; expected a map from model pattern to "off", "threads" or "all"`,
      { level: "warn" },
    );
  if (y !== void 0) return { scope: "off", source: "clientData" };
  let S = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_snowflake", "all");
  return { scope: S === "threads" || S === "all" ? S : "off", source: "growthbook" };
}
//@ chunk-e6aww6q8.js:2594176-2594218 placement
function vEe(e, n) {
  return keptReminderModeSafe(e, n) !== "off";
}
//@ chunk-e6aww6q8.js:2594218-2594368 placement
function keptReminderModeSafe(e, n) {
  try {
    return keptReminderMode(e, n);
  } catch (error) {
    logError(error);
    try {
      let { byModel: byModel } = keptReminderDelivery(getSessionId()),
        lower = Lt(e).toLowerCase();
      if (!byModel.has(lower)) byModel.set(lower, "off");
    } catch {}
    return "off";
  }
}
//@ chunk-e6aww6q8.js:2594368-2594544 placement
function keptReminderDelivery(e) {
  let n = Ao();
  if (n.keptReminderDelivery?.conversationId !== e)
    n.keptReminderDelivery = { conversationId: e, byModel: new Map(), served: new Set() };
  return n.keptReminderDelivery;
}
/**
 * 按模型计算并缓存保留提醒模式：仅第一方 Anthropic；首次可用记录的种子值；threads 模式需 tether 可用；记录 seeded/applied 事件。
 */
//@ chunk-e6aww6q8.js:2594544-2595348 placement
function keptReminderMode(model, seed) {
  let r = Ao(),
    h = (ijt.CLAUDE_CODE_TETHER_LIVE === !0 && r.tetherLiveGate !== !1) || isCcsTenant();
  if (
    !canSendFirstPartyBetas() ||
    getAPIProvider() !== "firstParty" ||
    (!h && !isActualFirstPartyAnthropicBaseUrl())
  )
    return "off";
  if (r.keptReminderRetired) return "off";
  let y = keptReminderDelivery(getSessionId()),
    { byModel: byModel } = y,
    lower = Lt(model).toLowerCase(),
    L = byModel.get(lower),
    G;
  if (seed !== void 0 && !y.seedTaken)
    ((y.seedTaken = !0), (G = isFoamySpringEnabled() ? seed.recorded : void 0));
  if (L !== void 0 && (G === void 0 || !y.served.has(lower))) return L;
  if (L === void 0 && !h && !isFirstPartyBaseUrl()) return (byModel.set(lower, "off"), "off");
  let { scope: scope, source: source } = keptReminderScope(model, G),
    Se = scope === "threads" && !isTetherLive() ? "off" : scope;
  if ((byModel.set(lower, Se), source === "clientData" || source === "growthbook")) y.served.add(lower);
  else y.served.delete(lower);
  if (source === "recorded")
    logEvent("tengu_kept_reminder_seeded", {
      model: telemetrySafeModelName(model),
      recorded: Se !== "off",
      replaced: L !== void 0,
    });
  if (Se !== "off" && (L === void 0 || L === "off"))
    logEvent("tengu_sleepy_snowflake_applied", {
      model: telemetrySafeModelName(model),
      source: fromEnum(source),
      value: fromEnum(Se),
    });
  return Se;
}
//@ chunk-e6aww6q8.js:2595348-2595391 placement
function DQe() {
  Ao().keptReminderRetired = !0;
}
//@ chunk-e6aww6q8.js:2595391-2595445 placement
function _hn() {
  return (Ao().clearAtProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2595445-2595524 placement
function khn() {
  let e = Ao();
  e.clearAtProbeFailures = (e.clearAtProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2595524-2595578 placement
function bhn() {
  return (Ao().threadsProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2595578-2595657 placement
function whn() {
  let e = Ao();
  e.threadsProbeFailures = (e.threadsProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2595657-2595772 placement
function logKeptReminderOk() {
  let e = Ao();
  if (e.keptReminderOkLogged !== !0)
    ((e.keptReminderOkLogged = !0), logFeatureOk("api_kept_reminder_clear_at"));
}

export { isTetherLive, vEe, khn, _hn, bhn, whn, DQe, IQe, logKeptReminderOk, dyr, keptReminderModeSafe };
