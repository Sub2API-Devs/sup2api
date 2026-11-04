/**
 * cli/print/hostTelemetryProxy.ts
 *
 * 2.1.316 新增：桌面宿主会话的遥测代理与反馈问卷显示判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (13)
 * attribution: placement 13
 */
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { shouldSkipFeedbackSurvey, isFeedbackSurveyForOtel } from "../../utils/hostEnvironment.js";
import { env } from "../../utils/env.js";
import {
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
} from "./hostOtelEvents.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateNormalizedText } from "../../services/analytics/eventSerialization.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { DoctorLazy } from "../handlers/util.js";
import { objectSchema, literal, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { onMcpNotification } from "../../services/mcp/mcpWireUtils.js";
import { LogEventNotificationSchema } from "../../services/mcp/vscodeSdkMcp.js";
import { identityId2 } from "../../types/ids.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { importMetaRequire } from "../../../runtime/bun-runtime.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:532948-532998 placement = preferThirdPartyAuthentication (0.76)
function notifyVscodeHost(event, config) {
  if (shouldShowFeedbackSurvey(event, "claude-vscode")) recordSurveyShown(event, config);
}
//@ chunk-tyg7f3ek.js:532998-534092 placement
function shouldShowFeedbackSurvey(event, serverName) {
  if (!isPolicyAllowed("allow_product_feedback")) return false;
  if (shouldSkipFeedbackSurvey() || env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return false;
  let eventType = surveyEventType(event.event_type);
  let response = event.event_type === "responded" ? surveyResponse(event.response) : undefined;
  let surveyType = surveyResponseEnum(event.survey_type);
  let appearanceId = sanitizeMarkName(stringOrUndefined(event.appearance_id));
  let lastAssistantMessageId = sanitizeMarkName(stringOrUndefined(event.last_assistant_message_id));
  logEvent("tengu_feedback_survey_event", {
    event_type: eventType,
    appearance_id: appearanceId,
    response,
    survey_type: surveyType,
    last_assistant_message_id: lastAssistantMessageId,
    surface: surveySurfaceEnum(event.surface),
    followup_box: surveyReasonEnum(event.followup_box),
    no_followup_reason: surveyFollowupEnum(event.no_followup_reason),
    char_count:
      typeof event.char_count === "number" && Number.isSafeInteger(event.char_count) && event.char_count >= 0
        ? fromNumber(event.char_count)
        : undefined,
    error_code: surveyTriggerEnum(event.error_code),
    saved_locally: typeof event.saved_locally === "boolean" ? event.saved_locally : undefined,
  });
  if (event.event_type === "followup_text_submitted" || event.event_type === "followup_text_failed")
    return true;
  if (!canRouteHostOtel("survey")) return true;
  logOTelEvent("feedback_survey", {
    event_type: eventType,
    appearance_id: appearanceId,
    response,
    survey_type: surveyType,
    enabled_via_override: isFeedbackSurveyForOtel(),
    event_origin: "sdk_host",
    event_origin_server: truncateNormalizedText(serverName),
  })
    .then(
      () => {
        markHostOtelRouteOk();
      },
      () => {
        logHostOtelDropOnce("survey_emit_failed", "proxied survey OTLP record emit failed");
      },
    )
    .catch(() => {});
  return true;
}
//@ chunk-tyg7f3ek.js:534092-534105 placement
var SURVEY_MIN_INTERVAL_MS = 60000;
//@ chunk-tyg7f3ek.js:534105-534309 placement
function recordSurveyShown(event, config) {
  if (event.event_type !== "appeared") return;
  let lastShownTime = getGlobalConfig().feedbackSurveyState?.lastShownTime;
  if (lastShownTime !== undefined && Date.now() - lastShownTime < SURVEY_MIN_INTERVAL_MS) return;
  saveGlobalConfig(
    (currentConfig) => ({
      ...currentConfig,
      feedbackSurveyState: {
        lastShownTime: Date.now(),
      },
    }),
    config,
  );
}
//@ chunk-tyg7f3ek.js:534309-534339 placement
var MATH_RENDERING_DRAWN = "math_rendering_drawn";
//@ chunk-tyg7f3ek.js:534339-534418 placement
function isMathRenderingEvent(eventName) {
  return eventName === "math_rendering_drawn" || eventName === "math_rendering_refused";
}
//@ chunk-tyg7f3ek.js:534418-534673 placement
var MATH_RENDERING_FIELDS = [
  "formula_tex_length",
  "formula_nodes",
  "formula_depth",
  "formula_unmeasured",
  "formula_height",
  "formula_width",
  "formula_pull",
  "formula_reach",
  "message_tex_length",
  "message_nodes",
  "defines_macro",
  "names_internal",
  "holds_comment",
  "parse_error",
  "threw",
];
//@ chunk-tyg7f3ek.js:534673-534715 placement
function findMathRenderingField(reason) {
  return MATH_RENDERING_FIELDS.find((field) => field === reason);
}
//@ chunk-tyg7f3ek.js:534715-534738 placement
function alwaysFalse() {
  return false;
}
//@ chunk-tyg7f3ek.js:538953-539088 placement
var PROXIED_OTEL_EVENTS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var OTEL_EVENT_NOTIFICATION_SCHEMA;
deferInit("chunk-tyg7f3ek.js:538953", () => {
  PROXIED_OTEL_EVENTS = new Set(["tengu_message_rated", "tengu_feedback_survey_event"]);
  OTEL_EVENT_NOTIFICATION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      method: literal("log_otel_event"),
      params: unknown().optional(),
    }),
  );
});
//@ chunk-tyg7f3ek.js:539088-539662 placement
/**
 * 连接到桌面版 ccd_session MCP 时，转发其 log_otel_event 通知为本地遥测事件。
 */
function installCcdSessionTelemetryProxy(clients) {
  let found = clients.find((client) => client.name === "ccd_session");
  if (!found || found.type !== "connected") return;
  if (found.config.type !== "sdk" || !isTopHostSession()) return;
  onMcpNotification(found, OTEL_EVENT_NOTIFICATION_SCHEMA(), async (notification) => {
    routeHostOtelEnvelope(notification.params, found.name);
  });
  onMcpNotification(found, LogEventNotificationSchema(), async (notification) => {
    let { eventName, eventData } = notification.params;
    if (!PROXIED_OTEL_EVENTS.has(eventName)) return;
    if (!isPolicyAllowed("allow_product_feedback")) return;
    let data = eventData;
    switch (eventName) {
      case "tengu_message_rated":
        logEvent(eventName, {
          message_uuid: sanitizeMarkName(stringOrUndefined(data.message_uuid)),
          sentiment: surveyOutcomeEnum(data.sentiment),
          surface: surveySourceEnum(data.surface),
          cleared: data.cleared === true,
        });
        break;
      case "tengu_feedback_survey_event":
        shouldShowFeedbackSurvey(data, found.name);
        break;
    }
  });
  hookClientNotificationErrors(identityId2(found.client), "notification_channel_error", "ccd_session");
}
//@ chunk-tyg7f3ek.js:539699-540014 placement
function bytecodeOrderStats() {
  if (!alwaysTrue()) return {};
  let { bytecodeOrderStats } = importMetaRequire("bun:jsc");
  let stats = bytecodeOrderStats?.();
  if (!stats) return {};
  return {
    bytecode_hot: stats.hot,
    bytecode_unknown: stats.unknown,
    bytecode_cold: stats.cold,
    bytecode_hot_kib: Math.round(stats.hotBytes / 1024),
    bytecode_unknown_kib: Math.round(stats.unknownBytes / 1024),
    bytecode_cold_kib: Math.round(stats.coldBytes / 1024),
  };
}
//@ chunk-tyg7f3ek.js:540051-540125 placement
function bridgeMessageUuid(uuid, origin) {
  if (uuid === undefined) return;
  return origin === "bridge" ? (normalizeUuidOrNull(uuid) ?? undefined) : uuid;
}
export {
  bytecodeOrderStats,
  notifyVscodeHost,
  installCcdSessionTelemetryProxy,
  alwaysFalse,
  bridgeMessageUuid,
  isMathRenderingEvent,
  MATH_RENDERING_DRAWN,
  findMathRenderingField,
};
