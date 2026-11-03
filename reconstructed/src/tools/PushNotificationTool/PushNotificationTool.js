/**
 * tools/PushNotificationTool/PushNotificationTool.ts
 *
 * 推送通知工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4rqaac63.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, T, u, M, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { PUSHNOTIFICATION } from "./constants.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../../services/analytics/growthbook.js";
import { PUSH_NOTIFICATION_DESCRIPTION, Hsi } from "./prompt.js";
import { env } from "../../utils/env.js";
import { getIsRemoteMode, isReplBridgeActive, isUserActiveForNotifications } from "../../bootstrap/state.js";
import { isPersistentVsCodeTransport } from "../../cli/transportState.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";

//@ chunk-4rqaac63.js:4619-7369 placement
var PushNotificationTool = DoctorLazy(() =>
    zodStrictObject({
      message: o()
        .min(1)
        .describe("The notification body. Keep it under 200 characters; mobile OSes truncate."),
      status: T("proactive"),
    }),
  ),
  R = DoctorLazy(() =>
    u({
      message: o(),
      pushSent: M().optional(),
      localSent: M().optional(),
      disabledReason: U(["config_off", "user_present", "no_transport"]).optional(),
      sentAt: o()
        .optional()
        .describe(
          "ISO timestamp captured at tool execution on the emitting process. Optional \u2014 resumed sessions replay pre-sentAt outputs verbatim.",
        ),
    }),
  ),
  g = 300000,
  F = buildTool({
    name: PUSHNOTIFICATION,
    searchHint: "send a notification to the user via terminal and optionally mobile",
    backgrounding: "never",
    maxResultSizeChars: 1000,
    userFacingName: () => "PushNotification",
    get inputSchema() {
      return PushNotificationTool();
    },
    get outputSchema() {
      return R();
    },
    shouldDefer: !0,
    isEnabled() {
      return getFeatureValue_CACHED_WITH_REFRESH("tengu_kairos_push_notifications", !1, g);
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return e.message;
    },
    async description() {
      return PUSH_NOTIFICATION_DESCRIPTION;
    },
    async prompt() {
      return Hsi();
    },
    mapToolResultToToolResultBlockParam(e, l) {
      let t;
      if (e.disabledReason === "config_off") t = "Push not sent \u2014 mobile push is disabled in /config.";
      else if (e.disabledReason === "user_present")
        t =
          "Not sent \u2014 this terminal is active, so your output here already reaches the user; a separate notification would be redundant.";
      else if (e.disabledReason === "no_transport")
        t = e.localSent
          ? "Terminal notification sent. Mobile push not sent (Remote Control inactive)."
          : "Mobile push not sent (Remote Control inactive).";
      else t = e.localSent ? "Terminal notification sent. Mobile push requested." : "Mobile push requested.";
      return { tool_use_id: l, type: "tool_result", content: t };
    },
    renderToolUseMessage(e) {
      if (!e.message) return "";
      return e.message;
    },
    create({ isNonInteractiveSession: e, session: l }) {
      return {
        async call({ message: t }, { onProgress: d }) {
          let iso = new Date().toISOString(),
            f = env.CLAUDE_CODE_REMOTE || getIsRemoteMode(),
            c = f || isPersistentVsCodeTransport(l),
            m = c || isReplBridgeActive(),
            s = ({ pushSent: pushSent, localSent: localSent, disabledReason: disabledReason }) => {
              logEvent("tengu_push_notification_send", {
                message_length: t.length,
                push_sent: pushSent,
                local_sent: localSent,
                is_remote: f,
                disabled_reason: fromEnumOpt(disabledReason),
              });
            };
          if (m && !c && !resolveSetting("agentPushNotifEnabled", !1).value)
            return (
              s({ pushSent: !1, localSent: !1, disabledReason: "config_off" }),
              { data: { message: t, pushSent: !1, localSent: !1, disabledReason: "config_off", sentAt: iso } }
            );
          if (!c && !env.CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK && isUserActiveForNotifications())
            return (
              s({ pushSent: !1, localSent: !1, disabledReason: "user_present" }),
              {
                data: {
                  message: t,
                  pushSent: !1,
                  localSent: !1,
                  disabledReason: "user_present",
                  sentAt: iso,
                },
              }
            );
          d?.({ type: "os_notification", message: t, notificationType: "push_notification" });
          let r = !e;
          if (!m)
            return (
              s({ pushSent: !1, localSent: r, disabledReason: "no_transport" }),
              {
                data: { message: t, pushSent: !1, localSent: r, disabledReason: "no_transport", sentAt: iso },
              }
            );
          return (
            s({ pushSent: !0, localSent: r }),
            { data: { message: t, pushSent: !0, localSent: r, sentAt: iso } }
          );
        },
      };
    },
  });
