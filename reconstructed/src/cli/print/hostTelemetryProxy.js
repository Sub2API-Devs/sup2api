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
  WO,
  stringOrUndefined,
  qO,
  jO,
  QO,
  $O,
  canRouteHostOtel,
  markHostOtelRouteOk,
  logHostOtelDropOnce,
  routeHostOtelEnvelope,
  KO,
  VO,
  hookClientNotificationErrors,
} from "./mcpTurnRedial.js";
import { ye } from "../../utils/startupMarks.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { K6e } from "../../services/analytics/eventSerialization.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { onMcpNotification } from "../../services/mcp/mcpWireUtils.js";
import { LogEventNotificationSchema } from "../../services/mcp/vscodeSdkMcp.js";
import { oa } from "../../types/ids.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Vt } from "../../utils/agentId.js";

//@ chunk-tyg7f3ek.js:532948-532998 placement = preferThirdPartyAuthentication (0.76)
function notifyVscodeHost(e, n) {
  if (shouldShowFeedbackSurvey(e, "claude-vscode")) recordSurveyShown(e, n);
}
//@ chunk-tyg7f3ek.js:532998-534092 placement
function shouldShowFeedbackSurvey(e, n) {
  if (!isPolicyAllowed("allow_product_feedback")) return !1;
  if (shouldSkipFeedbackSurvey() || env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return !1;
  let r = surveyEventType(e.event_type),
    s = e.event_type === "responded" ? surveyResponse(e.response) : void 0,
    h = WO(e.survey_type),
    y = ye(stringOrUndefined(e.appearance_id)),
    S = ye(stringOrUndefined(e.last_assistant_message_id));
  if (
    (logEvent("tengu_feedback_survey_event", {
      event_type: r,
      appearance_id: y,
      response: s,
      survey_type: h,
      last_assistant_message_id: S,
      surface: qO(e.surface),
      followup_box: jO(e.followup_box),
      no_followup_reason: QO(e.no_followup_reason),
      char_count:
        typeof e.char_count === "number" && Number.isSafeInteger(e.char_count) && e.char_count >= 0
          ? fromNumber(e.char_count)
          : void 0,
      error_code: $O(e.error_code),
      saved_locally: typeof e.saved_locally === "boolean" ? e.saved_locally : void 0,
    }),
    e.event_type === "followup_text_submitted" || e.event_type === "followup_text_failed")
  )
    return !0;
  if (!canRouteHostOtel("survey")) return !0;
  return (
    logOTelEvent("feedback_survey", {
      event_type: r,
      appearance_id: y,
      response: s,
      survey_type: h,
      enabled_via_override: isFeedbackSurveyForOtel(),
      event_origin: "sdk_host",
      event_origin_server: K6e(n),
    })
      .then(
        () => {
          markHostOtelRouteOk();
        },
        () => {
          logHostOtelDropOnce("survey_emit_failed", "proxied survey OTLP record emit failed");
        },
      )
      .catch(() => {}),
    !0
  );
}
//@ chunk-tyg7f3ek.js:534092-534105 placement
var SURVEY_MIN_INTERVAL_MS = 60000;
//@ chunk-tyg7f3ek.js:534105-534309 placement
function recordSurveyShown(e, n) {
  if (e.event_type !== "appeared") return;
  let r = getGlobalConfig().feedbackSurveyState?.lastShownTime;
  if (r !== void 0 && Date.now() - r < SURVEY_MIN_INTERVAL_MS) return;
  saveGlobalConfig((s) => ({ ...s, feedbackSurveyState: { lastShownTime: Date.now() } }), n);
}
//@ chunk-tyg7f3ek.js:534309-534339 placement
var MATH_RENDERING_DRAWN = "math_rendering_drawn";
//@ chunk-tyg7f3ek.js:534339-534418 placement
function isMathRenderingEvent(e) {
  return e === "math_rendering_drawn" || e === "math_rendering_refused";
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
function findMathRenderingField(e) {
  return MATH_RENDERING_FIELDS.find((n) => n === e);
}
//@ chunk-tyg7f3ek.js:534715-534738 placement
function alwaysFalse() {
  return !1;
}
//@ chunk-tyg7f3ek.js:538953-539088 placement
var PROXIED_OTEL_EVENTS = new Set(["tengu_message_rated", "tengu_feedback_survey_event"]),
  xK = DoctorLazy(() => u({ method: T("log_otel_event"), params: oe().optional() }));
/**
 * 连接到桌面版 ccd_session MCP 时，转发其 log_otel_event 通知为本地遥测事件。
 */
//@ chunk-tyg7f3ek.js:539088-539662 placement
function installCcdSessionTelemetryProxy(e) {
  let found = e.find((r) => r.name === "ccd_session");
  if (!found || found.type !== "connected") return;
  if (found.config.type !== "sdk" || !isTopHostSession()) return;
  (onMcpNotification(found, xK(), async (r) => {
    routeHostOtelEnvelope(r.params, found.name);
  }),
    onMcpNotification(found, LogEventNotificationSchema(), async (r) => {
      let { eventName: eventName, eventData: eventData } = r.params;
      if (!PROXIED_OTEL_EVENTS.has(eventName)) return;
      if (!isPolicyAllowed("allow_product_feedback")) return;
      let y = eventData;
      switch (eventName) {
        case "tengu_message_rated":
          logEvent(eventName, {
            message_uuid: ye(stringOrUndefined(y.message_uuid)),
            sentiment: KO(y.sentiment),
            surface: VO(y.surface),
            cleared: y.cleared === !0,
          });
          break;
        case "tengu_feedback_survey_event":
          shouldShowFeedbackSurvey(y, found.name);
          break;
      }
    }),
    hookClientNotificationErrors(oa(found.client), "notification_channel_error", "ccd_session"));
}
//@ chunk-tyg7f3ek.js:539699-540014 placement
function bytecodeOrderStats() {
  if (!alwaysTrue()) return {};
  let { bytecodeOrderStats: bytecodeOrderStats } = importMetaRequire("bun:jsc"),
    n = bytecodeOrderStats?.();
  if (!n) return {};
  return {
    bytecode_hot: n.hot,
    bytecode_unknown: n.unknown,
    bytecode_cold: n.cold,
    bytecode_hot_kib: Math.round(n.hotBytes / 1024),
    bytecode_unknown_kib: Math.round(n.unknownBytes / 1024),
    bytecode_cold_kib: Math.round(n.coldBytes / 1024),
  };
}
//@ chunk-tyg7f3ek.js:540051-540125 placement
function bridgeMessageUuid(e, n) {
  if (e === void 0) return;
  return n === "bridge" ? (Vt(e) ?? void 0) : e;
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
