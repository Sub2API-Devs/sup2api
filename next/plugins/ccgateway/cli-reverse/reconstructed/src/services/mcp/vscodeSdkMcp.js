/**
 * services/mcp/vscodeSdkMcp.ts
 *
 * VS Code 扩展 SDK MCP 通道：转发扩展上报的 log_event 等通知，并向扩展推送 experiment_gates 开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/vscodeSdkMcp.ts
 * pieces: chunk-0yw3taqg.js (5)
 * attribution: fingerprint 2, file-local 1, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
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
import { hookClientNotificationErrors } from "../../cli/print/hostOtelEvents.js";
import { identityId2 } from "../../types/ids.js";
import { onPolicyVerdictChanged } from "../policyLimits/policyState.js";
import { logForDebugging } from "../../utils/debug.js";
import { TENGU_WISE_BEAR_COPY } from "../usageCreditOffers.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:574912-575121 fingerprint (2.1.88 match: readAutoModeEnabledState, 0.808)
/**
 * readAutoModeEnabledState：GrowthBook tengu_auto_mode_config.enabled（enabled/disabled/opt-in），非覆盖来源的 disabled 视为 enabled。
 */
function readAutoModeEnabledState() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {});
  let v = value?.enabled;
  if (v === "disabled" && source !== "override" && source !== "payload") return "enabled";
  return v === "enabled" || v === "disabled" || v === "opt-in" ? v : "enabled";
}
//@ chunk-0yw3taqg.js:575121-575303 file-local
var LogEventNotificationSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AdminLimitRequestNotificationSchema;
deferInit("chunk-0yw3taqg.js:575121", () => {
  LogEventNotificationSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("log_event"),
      params: objectSchema({
        eventName: stringSchema(),
        eventData: objectSchema({}).passthrough(),
      }),
    }),
  );
  AdminLimitRequestNotificationSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("admin_limit_request"),
      params: objectSchema({}).passthrough().optional(),
    }),
  );
});
//@ chunk-0yw3taqg.js:575303-577575 layout
/**
 * setupVscodeSdkMcp：找到名为 claude-vscode 的 SDK 客户端，注册 log_event 与 admin_limit_request 通知处理（转发遥测、反馈问卷、自动模式提示等），推送 experiment_gates，并在策略变化时重发。
 */
function setupVscodeSdkMcp(sdkClients, callbacks) {
  let vscodeClient = sdkClients.find((sdkClient) => sdkClient.name === "claude-vscode");
  let state = getCliOwnedState();
  state.stopVscodePolicyGatesRefresh?.();
  state.stopVscodePolicyGatesRefresh = null;
  if (vscodeClient && vscodeClient.type === "connected") {
    state.vscodeClient = vscodeClient;
    onMcpNotification(vscodeClient, LogEventNotificationSchema(), async (notification) => {
      let { eventName, eventData } = notification.params;
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
      logEvent(`tengu_vscode_${eventName}`, eventData);
      if (eventName === "prompt_invisible_strip") logFeatureOk("input_invisible_strip");
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
    });
    onMcpNotification(vscodeClient, AdminLimitRequestNotificationSchema(), async () => {
      if (vscodeClient.config?.type === "sdk" && isVsCodeTopSession()) callbacks?.onAdminLimitRequest?.();
    });
    hookClientNotificationErrors(
      identityId2(vscodeClient.client),
      "vscode_notification_channel_error",
      "claude-vscode",
    );
    let allowProductFeedback = isPolicyAllowed("allow_product_feedback");
    let gates = {
      ...buildVscodeExperimentGates(allowProductFeedback),
      tengu_quiet_fern: true,
      tengu_vscode_cc_auth: true,
      tengu_slate_ribbon: true,
      tengu_loggia_carousel: callbacks?.refusalFallbackLaneEnabled ?? false,
      tengu_loggia_carousel_config: callbacks?.refusalFallbackSettingToggleVisible ?? false,
      startup_announcement: callbacks?.startupAnnouncement ?? false,
      tengu_proud_clover: callbacks?.maxEffortReminderEnabled ?? false,
      tengu_harbor_willow: callbacks?.autoDefaultLaunchEnabled ?? false,
      tengu_ccr_v2_session_crud_cli: callbacks?.ccrV2SessionCrudEnabled ?? false,
    };
    sendVscodeExperimentGates(vscodeClient, gates);
    let disposed = false;
    let unsubscribePolicy = onPolicyVerdictChanged(() => {
      queueMicrotask(() => {
        if (disposed) return;
        try {
          let allowed = isPolicyAllowed("allow_product_feedback");
          if (allowed === allowProductFeedback) return;
          allowProductFeedback = allowed;
          Object.assign(gates, buildVscodeExperimentGates(allowed));
          sendVscodeExperimentGates(vscodeClient, gates);
        } catch (error) {
          logForDebugging(
            `[VSCode] Failed to refresh the policy-bound gates: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    });
    state.stopVscodePolicyGatesRefresh = () => {
      disposed = true;
      unsubscribePolicy();
    };
  }
}
//@ chunk-0yw3taqg.js:577575-578998 layout
/**
 * buildVscodeExperimentGates：读取一组 tengu_* GrowthBook 开关组成发给 VS Code 扩展的 gates 对象。
 */
function buildVscodeExperimentGates(session) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_vscode_review_upsell",
    false,
  );
  let featureValue_CACHED_MAY_BE_STALE_2 = getFeatureValue_CACHED_MAY_BE_STALE("tengu_vellum_siding", false);
  let autoModeEnabledState = readAutoModeEnabledState();
  let featureValue_CACHED_MAY_BE_STALE_3 = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_lantern_sconce_copy",
    null,
  );
  let featureValue_CACHED_MAY_BE_STALE_4 = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null);
  return {
    tengu_vscode_review_upsell: featureValue_CACHED_MAY_BE_STALE && session,
    tengu_cobalt_harbor_notice: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor_notice", true),
    tengu_vscode_onboarding: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_onboarding", false),
    tengu_vscode_resume_precheck: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_resume_precheck", true),
    tengu_vscode_stored_startup_config: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_stored_startup_config", true),
    ),
    tengu_vscode_python_beside_start: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_python_beside_start", true),
    ),
    tengu_vscode_start_second_try: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_start_second_try", true),
    ),
    tengu_optimized_puzzle: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_optimized_puzzle", true)),
    tengu_vscode_inline_pastes: getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_inline_pastes", true),
    tengu_vscode_math_rendering: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_math_rendering", true),
    ),
    tengu_vscode_code_colors: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_code_colors", true)),
    tengu_vscode_restore_breaker: Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_restore_breaker", true),
    ),
    tengu_saffron_ferry: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_ferry", true)),
    ...false,
    tengu_tranquil_cloud: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_tranquil_cloud", true)),
    tengu_staged_ladybug: getFeatureValue_CACHED_MAY_BE_STALE("tengu_staged_ladybug", true),
    tengu_brick_follow: getFeatureValue_CACHED_MAY_BE_STALE("tengu_brick_follow", false),
    tengu_vellum_siding: featureValue_CACHED_MAY_BE_STALE_2 && session,
    tengu_glimmering_firefly: Boolean(getFeatureValue_CACHED_MAY_BE_STALE("tengu_glimmering_firefly", false)),
    tengu_lantern_sconce: getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce", false),
    tengu_auto_mode_state: autoModeEnabledState === "opt-in" ? "enabled" : autoModeEnabledState,
    tengu_lantern_sconce_copy: isPlainObject(featureValue_CACHED_MAY_BE_STALE_3)
      ? jsonStringify(featureValue_CACHED_MAY_BE_STALE_3)
      : false,
    [TENGU_WISE_BEAR_COPY]: isPlainObject(featureValue_CACHED_MAY_BE_STALE_4)
      ? jsonStringify(featureValue_CACHED_MAY_BE_STALE_4)
      : false,
  };
}
//@ chunk-0yw3taqg.js:578998-579271 fingerprint (2.1.88 match: setupVscodeSdkMcp, 0.343)
/**
 * sendVscodeExperimentGates：向 VS Code 客户端发送 experiment_gates 通知，失败只记日志。
 */
function sendVscodeExperimentGates(vscodeClient, gates) {
  identityId2(vscodeClient.client)
    .notification({
      method: "experiment_gates",
      params: {
        gates,
      },
    })
    .catch((client) => {
      let message = "unreadable error value";
      try {
        let message_2 = client?.message;
        message = typeof message_2 === "string" ? message_2 : String(client);
      } catch {}
      try {
        logForDebugging(`[VSCode] Failed to send experiment_gates notification: ${message}`);
      } catch {}
    });
}
export { setupVscodeSdkMcp, LogEventNotificationSchema };
