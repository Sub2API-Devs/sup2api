/**
 * services/mcp/vscodeSdkMcp.ts
 *
 * VS Code 扩展 SDK MCP 通道：转发扩展上报的 log_event 等通知，并向扩展推送 experiment_gates 开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/vscodeSdkMcp.ts
 * pieces: chunk-tyg7f3ek.js (5)
 * attribution: fingerprint 2, file-local 1, layout 2
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { ht } from "./cliOwnedClients.js";
import { onMcpNotification } from "./mcpWireUtils.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  isMathRenderingEvent,
  MATH_RENDERING_DRAWN,
  findMathRenderingField,
} from "../../cli/print/hostTelemetryProxy.js";
import { hookClientNotificationErrors } from "../../cli/print/mcpTurnRedial.js";
import { oa } from "../../types/ids.js";
import { onPolicyVerdictChanged } from "../policyLimits/policyState.js";
import { logForDebugging } from "../../utils/debug.js";
import { TENGU_WISE_BEAR_COPY } from "../usageCreditOffers.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * readAutoModeEnabledState：GrowthBook tengu_auto_mode_config.enabled（enabled/disabled/opt-in），非覆盖来源的 disabled 视为 enabled。
 */
//@ chunk-tyg7f3ek.js:534738-534947 fingerprint = readAutoModeEnabledState (0.807)
function readAutoModeEnabledState() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_auto_mode_config",
      {},
    ),
    r = e?.enabled;
  if (r === "disabled" && source !== "override" && source !== "payload") return "enabled";
  return r === "enabled" || r === "disabled" || r === "opt-in" ? r : "enabled";
}
//@ chunk-tyg7f3ek.js:534947-535129 file-local
var LogEventNotificationSchema = DoctorLazy(() =>
    u({ method: T("log_event"), params: u({ eventName: o(), eventData: u({}).passthrough() }) }),
  ),
  AdminLimitRequestNotificationSchema = DoctorLazy(() =>
    u({ method: T("admin_limit_request"), params: u({}).passthrough().optional() }),
  );
/**
 * setupVscodeSdkMcp：找到名为 claude-vscode 的 SDK 客户端，注册 log_event 与 admin_limit_request 通知处理（转发遥测、反馈问卷、自动模式提示等），推送 experiment_gates，并在策略变化时重发。
 */
//@ chunk-tyg7f3ek.js:535129-537401 layout
function setupVscodeSdkMcp(sdkClients, callbacks) {
  let vscodeClient = sdkClients.find((h) => h.name === "claude-vscode"),
    state = ht();
  if (
    (state.stopVscodePolicyGatesRefresh?.(),
    (state.stopVscodePolicyGatesRefresh = null),
    vscodeClient && vscodeClient.type === "connected")
  ) {
    ((state.vscodeClient = vscodeClient),
      onMcpNotification(vscodeClient, LogEventNotificationSchema(), async (w) => {
        let { eventName: eventName, eventData: eventData } = w.params;
        if (eventName === "tengu_feedback_survey_event") {
          if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession())
            callbacks?.onFeedbackSurveyEvent?.(eventData);
          return;
        }
        if (eventName === "auto_default_nudge_shown" || eventName === "auto_default_nudge_resolved") {
          if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession())
            callbacks?.onAutoDefaultNudgeEvent?.(
              eventName === "auto_default_nudge_shown" ? "shown" : "resolved",
              eventData,
            );
          return;
        }
        if (
          (eventName.startsWith("review_upsell_") || eventName === "feedback_form_opened") &&
          !isPolicyAllowed("allow_product_feedback")
        )
          return;
        if ((logEvent(`tengu_vscode_${eventName}`, eventData), eventName === "prompt_invisible_strip"))
          logFeatureOk("input_invisible_strip");
        if (isMathRenderingEvent(eventName) && vscodeClient.config?.type === "sdk" && isVsCodeTopSession())
          if (eventName === MATH_RENDERING_DRAWN) logFeatureOk("ide_math_rendering");
          else logFeatureSad("ide_math_rendering", findMathRenderingField(eventData.reason) ?? "unknown");
        if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession()) {
          if (eventName === "user_prompt_submit_hooks_shown")
            logFeatureOk("ide_user_prompt_submit_hooks_status");
          else if (eventName === "user_prompt_submit_hooks_unseen")
            logFeatureBad("ide_user_prompt_submit_hooks_status", "no_spinner");
        }
        if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession()) {
          if (eventName === "mods_surface_attached") logFeatureOk("ide_mods_surface_attach");
          else if (eventName === "mods_surface_attach_failed")
            logFeatureBad(
              "ide_mods_surface_attach",
              eventData.reason === "timed_out"
                ? "timed_out"
                : eventData.reason === "refused"
                  ? "refused"
                  : eventData.reason === "no_request_method"
                    ? "no_request_method"
                    : "unknown",
            );
        }
      }),
      onMcpNotification(vscodeClient, AdminLimitRequestNotificationSchema(), async () => {
        if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession()) callbacks?.onAdminLimitRequest?.();
      }),
      hookClientNotificationErrors(
        oa(vscodeClient.client),
        "vscode_notification_channel_error",
        "claude-vscode",
      ));
    let allowProductFeedback = isPolicyAllowed("allow_product_feedback"),
      gates = {
        ...buildVscodeExperimentGates(allowProductFeedback),
        tengu_quiet_fern: !0,
        tengu_vscode_cc_auth: !0,
        tengu_slate_ribbon: !0,
        tengu_loggia_carousel: callbacks?.refusalFallbackLaneEnabled ?? !1,
        tengu_loggia_carousel_config: callbacks?.refusalFallbackSettingToggleVisible ?? !1,
        startup_announcement: callbacks?.startupAnnouncement ?? !1,
        tengu_proud_clover: callbacks?.maxEffortReminderEnabled ?? !1,
        tengu_harbor_willow: callbacks?.autoDefaultLaunchEnabled ?? !1,
        tengu_ccr_v2_session_crud_cli: callbacks?.ccrV2SessionCrudEnabled ?? !1,
      };
    sendVscodeExperimentGates(vscodeClient, gates);
    let S = !1,
      unsubscribePolicy = onPolicyVerdictChanged(() => {
        queueMicrotask(() => {
          if (S) return;
          try {
            let w = isPolicyAllowed("allow_product_feedback");
            if (w === allowProductFeedback) return;
            ((allowProductFeedback = w),
              Object.assign(gates, buildVscodeExperimentGates(w)),
              sendVscodeExperimentGates(vscodeClient, gates));
          } catch (error) {
            logForDebugging(
              `[VSCode] Failed to refresh the policy-bound gates: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        });
      });
    state.stopVscodePolicyGatesRefresh = () => {
      ((S = !0), unsubscribePolicy());
    };
  }
}
/**
 * buildVscodeExperimentGates：读取一组 tengu_* GrowthBook 开关组成发给 VS Code 扩展的 gates 对象。
 */
//@ chunk-tyg7f3ek.js:537401-538680 layout
function buildVscodeExperimentGates(e) {
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_review_upsell", !1),
    r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_vellum_siding", !1),
    s = readAutoModeEnabledState(),
    h = getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce_copy", null),
    y = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null);
  return {
    tengu_vscode_review_upsell: n && e,
    tengu_cobalt_harbor_notice: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor_notice", !0),
    tengu_vscode_onboarding: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_onboarding", !1),
    tengu_vscode_resume_precheck: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_resume_precheck", !0),
    tengu_vscode_stored_startup_config: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_stored_startup_config", !0),
    ),
    tengu_vscode_python_beside_start: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_python_beside_start", !0),
    ),
    tengu_optimized_puzzle: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_optimized_puzzle", !0)),
    tengu_vscode_inline_pastes: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_inline_pastes", !0),
    tengu_vscode_math_rendering: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_math_rendering", !0),
    ),
    tengu_vscode_code_colors: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_code_colors", !0)),
    tengu_vscode_restore_breaker: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_restore_breaker", !0),
    ),
    tengu_saffron_ferry: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_ferry", !0)),
    ...!1,
    tengu_tranquil_cloud: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_tranquil_cloud", !0)),
    tengu_staged_ladybug: getFeatureValue_CACHED_MAY_BE_STALE("tengu_staged_ladybug", !0),
    tengu_brick_follow: getFeatureValue_CACHED_MAY_BE_STALE("tengu_brick_follow", !1),
    tengu_vellum_siding: r && e,
    tengu_lantern_sconce: getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce", !1),
    tengu_auto_mode_state: s === "opt-in" ? "enabled" : s,
    tengu_lantern_sconce_copy: isPlainObject(h) ? jsonStringify(h) : !1,
    [TENGU_WISE_BEAR_COPY]: isPlainObject(y) ? jsonStringify(y) : !1,
  };
}
/**
 * sendVscodeExperimentGates：向 VS Code 客户端发送 experiment_gates 通知，失败只记日志。
 */
//@ chunk-tyg7f3ek.js:538680-538953 fingerprint = setupVscodeSdkMcp (0.343)
function sendVscodeExperimentGates(e, n) {
  oa(e.client)
    .notification({ method: "experiment_gates", params: { gates: n } })
    .catch((client) => {
      let s = "unreadable error value";
      try {
        let h = client?.message;
        s = typeof h === "string" ? h : String(client);
      } catch {}
      try {
        logForDebugging(`[VSCode] Failed to send experiment_gates notification: ${s}`);
      } catch {}
    });
}

export { setupVscodeSdkMcp, LogEventNotificationSchema };
