/**
 * cli/print/hostOtelEvents.ts
 *
 * 2.1.316 新增：宿主（桌面/VS Code）OTel 事件转发的信封校验、限流与丢弃上报，以及反馈问卷的事件枚举与显示配置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (27)
 * attribution: placement 27
 */
import {
  getHostOtelState,
  getEventLoggerOwner,
  getEventLogger,
  isOTelInitPending,
  getOTelWindowCloseCause,
} from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  MAX_NORMALIZED_TEXT_CHARS,
  truncateNormalizedText,
} from "../../services/analytics/eventSerialization.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { isVsCodeTopSession, isTopHostSession } from "../../utils/sessionShape.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { DEFAULT_SURVEY_TIMING } from "../../components/FeedbackSurvey/useFeedbackSurvey.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { getGlobalConfig } from "../../utils/config.js";
import { isConsumerSubscriber } from "../../utils/auth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:567108-567300 placement
var HOST_OTEL_LIMITS = /^(?=[\s\S]{1,64}$)[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/;
var HOST_OTEL_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
var MAX_OTEL_ATTRIBUTES = 32;
var MAX_OTEL_VALUE_CHARS = 16384;
var EVENT_ORIGIN = "event_origin";
var EVENT_ORIGIN_SERVER = "event_origin_server";
var HOST = "host.";
var SDK_HOST = "sdk_host.";
var HOST_OTEL_REFILL_PER_MINUTE = 120;
var HOST_OTEL_BUCKET_SIZE = 240;
//@ chunk-0yw3taqg.js:567300-567447 placement
function reportHostOtelDrop(reason) {
  let hostOtelState = getHostOtelState();
  if (hostOtelState.reportedDropReasons.has(reason)) return;
  hostOtelState.reportedDropReasons.add(reason);
  if (getEventLoggerOwner() === "beta") return;
  logFeatureSad("mcp_host_otel_route", reason);
}
//@ chunk-0yw3taqg.js:567447-567496 placement
function logHostOtelDrop(reason, message, level) {
  reportHostOtelDrop(reason);
  logForDebugging(
    message,
    level
      ? {
          level,
        }
      : undefined,
  );
}
//@ chunk-0yw3taqg.js:567496-567600 placement
function logHostOtelDropOnce(reason, message, level) {
  if (getHostOtelState().reportedDropReasons.has(reason)) return;
  try {
    reportHostOtelDrop(reason);
    logForDebugging(
      message,
      level
        ? {
            level,
          }
        : undefined,
    );
  } catch {}
}
//@ chunk-0yw3taqg.js:567600-567714 placement
function logOnceByReason(reason, message) {
  let hostOtelState = getHostOtelState();
  if (hostOtelState.reportedDropReasons.has(reason)) return;
  hostOtelState.reportedDropReasons.add(reason);
  try {
    logForDebugging(message);
  } catch {}
}
//@ chunk-0yw3taqg.js:567714-567823 placement
function markHostOtelRouteOk() {
  let hostOtelState = getHostOtelState();
  if (!hostOtelState.featureOkLogged && getEventLoggerOwner() === "org") {
    hostOtelState.featureOkLogged = true;
    logFeatureOk("mcp_host_otel_route");
  }
}
//@ chunk-0yw3taqg.js:567823-568032 placement
function takeHostOtelRateToken(nowMs) {
  let hostOtelState = getHostOtelState();
  let rateTokens = hostOtelState.rateTokens ?? HOST_OTEL_BUCKET_SIZE;
  let rateLastRefillMs = hostOtelState.rateLastRefillMs ?? nowMs;
  hostOtelState.rateTokens = Math.min(
    HOST_OTEL_BUCKET_SIZE,
    rateTokens + (Math.max(0, nowMs - rateLastRefillMs) / 60000) * HOST_OTEL_REFILL_PER_MINUTE,
  );
  hostOtelState.rateLastRefillMs = Math.max(rateLastRefillMs, nowMs);
  if (hostOtelState.rateTokens < 1) return false;
  hostOtelState.rateTokens -= 1;
  return true;
}
//@ chunk-0yw3taqg.js:568032-568998 placement
function canRouteHostOtel(kind) {
  let reasons =
    kind === "survey"
      ? {
          loggerNotReady: "survey_logger_not_ready",
          rateCapped: "survey_rate_capped",
          otlpNotConfigured: "survey_otlp_not_configured",
          otlpInitFailed: "survey_otlp_init_failed",
        }
      : {
          loggerNotReady: "logger_not_ready",
          rateCapped: "rate_capped",
          otlpNotConfigured: "otlp_not_configured",
          otlpInitFailed: "otlp_init_failed",
        };
  if (!getEventLogger()) {
    if (!isOTelInitPending()) {
      if (getOTelWindowCloseCause() === "init_failed") {
        logHostOtelDropOnce(
          reasons.otlpInitFailed,
          `host OTLP ${kind} record dropped: telemetry init failed before producing a logger; further drops are not logged this session`,
        );
        return false;
      }
      logOnceByReason(
        reasons.otlpNotConfigured,
        `host OTLP ${kind} record dropped: no OTLP logs exporter configured; further drops are not logged this session`,
      );
      return false;
    }
    logOnceByReason(
      reasons.loggerNotReady,
      `host OTLP ${kind} record dropped: telemetry logger not ready; further drops are not logged this session`,
    );
    return false;
  }
  if (!takeHostOtelRateToken(Date.now())) {
    logHostOtelDropOnce(
      reasons.rateCapped,
      `host OTLP ${kind} record dropped: rate cap reached; further drops are not logged this session`,
      "warn",
    );
    return false;
  }
  return true;
}
//@ chunk-0yw3taqg.js:568998-570062 placement
/**
 * 校验宿主转发的 OTLP 事件名与属性（命名规则、长度、禁止 claude_code./host. 前缀）。
 */
function validateHostOtelEvent(eventName, attributes, serverName) {
  if (typeof eventName !== "string" || !HOST_OTEL_LIMITS.test(eventName))
    return {
      ok: false,
      reason: "bad_event_name",
    };
  if (eventName.startsWith("claude_code.") || eventName.startsWith(HOST))
    return {
      ok: false,
      reason: "bad_event_name",
    };
  if (
    typeof attributes !== "object" ||
    attributes === null ||
    Array.isArray(attributes) ||
    (Object.getPrototypeOf(attributes) !== Object.prototype && Object.getPrototypeOf(attributes) !== null)
  )
    return {
      ok: false,
      reason: "bad_attributes_shape",
    };
  let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(attributes);
  if (Object.getOwnPropertySymbols(ownPropertyDescriptors).length > 0)
    return {
      ok: false,
      reason: "bad_attributes_shape",
    };
  let pairs = [];
  for (let key of Object.getOwnPropertyNames(ownPropertyDescriptors)) {
    let descriptor = ownPropertyDescriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    )
      return {
        ok: false,
        reason: "bad_attributes_shape",
      };
    pairs.push([key, descriptor.value]);
  }
  if (pairs.length > MAX_OTEL_ATTRIBUTES)
    return {
      ok: false,
      reason: "too_many_attributes",
    };
  let normalized = {};
  let totalLength = eventName.length;
  for (let [key, value] of pairs) {
    if (!HOST_OTEL_KEY_PATTERN.test(key))
      return {
        ok: false,
        reason: "bad_attribute_key",
      };
    if (typeof value !== "string" || value.length > MAX_NORMALIZED_TEXT_CHARS)
      return {
        ok: false,
        reason: "bad_attribute_value",
      };
    totalLength += key.length + value.length;
    if (totalLength > MAX_OTEL_VALUE_CHARS)
      return {
        ok: false,
        reason: "payload_too_large",
      };
    normalized[SDK_HOST + key] = truncateNormalizedText(value);
  }
  normalized[EVENT_ORIGIN] = "sdk_host";
  normalized[EVENT_ORIGIN_SERVER] = truncateNormalizedText(serverName);
  return {
    ok: true,
    eventName,
    attributes: normalized,
  };
}
//@ chunk-0yw3taqg.js:570062-570475 placement
function routeHostOtelEnvelope(params, serverName) {
  try {
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      logHostOtelDropOnce(
        "bad_envelope",
        "host OTLP event dropped: bad_envelope (params is not an object); further envelope drops are not logged this session",
        "warn",
      );
      return;
    }
    let { eventName, attributes } = params;
    emitHostOtelEvent(eventName, attributes, serverName);
  } catch {
    logHostOtelDropOnce(
      "bad_envelope",
      "host OTLP event dropped: bad_envelope (envelope read threw); further envelope drops are not logged this session",
      "warn",
    );
  }
}
//@ chunk-0yw3taqg.js:570475-570911 placement
function emitHostOtelEvent(eventName, attributes, serverName) {
  try {
    if (!canRouteHostOtel("route")) return;
    let validation = validateHostOtelEvent(eventName, attributes, serverName);
    if (!validation.ok) {
      logHostOtelDrop(validation.reason, `host OTLP event dropped: ${validation.reason}`);
      return;
    }
    logOTelEvent(`${HOST}${validation.eventName}`, validation.attributes)
      .then(
        () => {
          markHostOtelRouteOk();
        },
        () => {
          logHostOtelDropOnce("emit_failed", "host OTLP event emit failed");
        },
      )
      .catch(() => {});
  } catch (error) {
    let errorName = "unknown";
    try {
      if (error instanceof Error) {
        let name = error.name;
        if (typeof name === "string") errorName = truncateToLength(name, 256);
      }
    } catch {}
    try {
      logHostOtelDrop("route_error", `host OTLP event route error: ${errorName}`, "warn");
    } catch {}
  }
}
//@ chunk-0yw3taqg.js:570911-571158 placement
function notificationErrorReporter(reason, channelLabel) {
  return (error) => {
    try {
      let message = "unreadable error value";
      try {
        let message_2 = error?.message;
        message = truncateToLength(typeof message_2 === "string" ? message_2 : String(error), 256);
      } catch {}
      logHostOtelDropOnce(
        reason,
        `${channelLabel} notification channel error: ${message}; further channel errors are not logged this session`,
        "warn",
      );
    } catch {}
  };
}
//@ chunk-0yw3taqg.js:571158-571313 placement
function hookClientNotificationErrors(client, reason, channelLabel) {
  let notificationErrorHookedClients = getCliOwnedState().notificationErrorHookedClients;
  if (notificationErrorHookedClients.has(client)) return;
  notificationErrorHookedClients.add(client);
  let onerror = client.onerror;
  let report = notificationErrorReporter(reason, channelLabel);
  client.onerror = (error) => {
    try {
      onerror?.(error);
    } catch {}
    report(error);
  };
}
//@ chunk-0yw3taqg.js:571313-572197 placement
/**
 * 宿主 OTel 调查问卷的事件类型与各字段合法取值集合，以及按集合净化的 enum 构造函数。
 */
var SURVEY_EVENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SURVEY_RESPONSE_VALUES;
var SURVEY_TYPE_VALUES;
var SURVEY_SURFACE_VALUES;
var SURVEY_FOLLOWUP_BOX_VALUES;
var SURVEY_NO_FOLLOWUP_REASON_VALUES;
var SURVEY_ERROR_CODE_VALUES;
var MESSAGE_RATING_SENTIMENT_VALUES;
var MESSAGE_RATING_SURFACE_VALUES;
deferInit("chunk-0yw3taqg.js:571313", () => {
  SURVEY_EVENT_TYPES = new Set([
    "appeared",
    "responded",
    "abandoned",
    "followup_prompt_appeared",
    "followup_skipped",
    "followup_submitted",
    "followup_text_submitted",
    "followup_text_failed",
  ]);
  SURVEY_RESPONSE_VALUES = new Set(["bad", "fine", "good", "not_sure", "dismissed"]);
  SURVEY_TYPE_VALUES = new Set(["session", "post_compact", "memory", "long_context"]);
  SURVEY_SURFACE_VALUES = new Set(["ide", "desktop"]);
  SURVEY_FOLLOWUP_BOX_VALUES = new Set(["every_rating", "bad_only", "none"]);
  SURVEY_NO_FOLLOWUP_REASON_VALUES = new Set([
    "no_answer",
    "not_allowed",
    "gate_off",
    "refused",
    "saved_locally",
  ]);
  SURVEY_ERROR_CODE_VALUES = new Set(
    Object.keys({
      auth_error: true,
      auth_refused: true,
      data_residency: true,
      http_error: true,
      missing_feedback_id: true,
      network_error: true,
      not_first_party: true,
      org_refused: true,
      payload_too_large_413: true,
      payload_too_large_precheck: true,
      payload_too_large_range_error: true,
      payload_too_large_timeout: true,
      policy_blocked: true,
      scope_refused: true,
      timeout: true,
      zdr_org: true,
      unknown: true,
      unavailable: true,
    }),
  );
  MESSAGE_RATING_SENTIMENT_VALUES = new Set(["positive", "negative"]);
  MESSAGE_RATING_SURFACE_VALUES = new Set(["tool_use", "assistant_text"]);
});
//@ chunk-0yw3taqg.js:572197-572264 placement
function sanitizeEnum(value, allowed) {
  return typeof value === "string" && allowed.has(value)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(value)
    : undefined;
}
//@ chunk-0yw3taqg.js:572264-572295 placement
function surveyEventType(eventType) {
  return sanitizeEnum(eventType, SURVEY_EVENT_TYPES);
}
//@ chunk-0yw3taqg.js:572295-572326 placement
function surveyResponse(response) {
  return sanitizeEnum(response, SURVEY_RESPONSE_VALUES);
}
//@ chunk-0yw3taqg.js:572326-572357 placement
function surveyResponseEnum(surveyType) {
  return sanitizeEnum(surveyType, SURVEY_TYPE_VALUES);
}
//@ chunk-0yw3taqg.js:572357-572388 placement
function surveySurfaceEnum(surface) {
  return sanitizeEnum(surface, SURVEY_SURFACE_VALUES);
}
//@ chunk-0yw3taqg.js:572388-572419 placement
function surveyReasonEnum(followupBox) {
  return sanitizeEnum(followupBox, SURVEY_FOLLOWUP_BOX_VALUES);
}
//@ chunk-0yw3taqg.js:572419-572450 placement
function surveyFollowupEnum(noFollowupReason) {
  return sanitizeEnum(noFollowupReason, SURVEY_NO_FOLLOWUP_REASON_VALUES);
}
//@ chunk-0yw3taqg.js:572450-572481 placement
function surveyTriggerEnum(errorCode) {
  return sanitizeEnum(errorCode, SURVEY_ERROR_CODE_VALUES);
}
//@ chunk-0yw3taqg.js:572481-572512 placement
function surveyOutcomeEnum(sentiment) {
  return sanitizeEnum(sentiment, MESSAGE_RATING_SENTIMENT_VALUES);
}
//@ chunk-0yw3taqg.js:572512-572543 placement
function surveySourceEnum(surface) {
  return sanitizeEnum(surface, MESSAGE_RATING_SURFACE_VALUES);
}
//@ chunk-0yw3taqg.js:572543-572594 placement
function stringOrUndefined(value) {
  return typeof value === "string" ? value : undefined;
}
//@ chunk-0yw3taqg.js:572594-572956 placement
function vscodeSurveyConfig() {
  if (!isVsCodeTopSession() && !isTopHostSession()) return;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_feedback_survey", false)) return;
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
  if (shouldSkipFeedbackSurvey()) return;
  if (!isPolicyAllowed("allow_product_feedback")) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_feedback_survey_config",
    DEFAULT_SURVEY_TIMING,
  );
  return {
    ...featureValue_CACHED_MAY_BE_STALE,
    probability: getInitialSettings().feedbackSurveyRate ?? featureValue_CACHED_MAY_BE_STALE.probability,
    lastSurveyShownTime: getGlobalConfig().feedbackSurveyState?.lastShownTime ?? null,
  };
}
//@ chunk-0yw3taqg.js:572956-573122 placement
function feedbackSurveyCapabilities() {
  let isVsCode = isVsCodeTopSession();
  if (!isVsCode && !isTopHostSession()) return;
  let isConsumer = isConsumerSubscriber();
  return {
    transcript_allowed: isConsumer,
    logs_followup: true,
    every_rating:
      isVsCode &&
      isConsumer &&
      vscodeSurveyConfig() !== undefined &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_curried_sparrow", false),
  };
}
export {
  vscodeSurveyConfig,
  feedbackSurveyCapabilities,
  surveyEventType,
  surveyResponse,
  surveyResponseEnum,
  stringOrUndefined,
  surveySurfaceEnum,
  surveyReasonEnum,
  surveyFollowupEnum,
  surveyTriggerEnum,
  canRouteHostOtel,
  markHostOtelRouteOk,
  logHostOtelDropOnce,
  routeHostOtelEnvelope,
  surveyOutcomeEnum,
  surveySourceEnum,
  hookClientNotificationErrors,
};
