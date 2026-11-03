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
import { zodStrictObject, string, literal, u, M, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { PUSHNOTIFICATION } from "./constants.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../../services/analytics/growthbook.js";
import { PUSH_NOTIFICATION_DESCRIPTION, pushNotificationPrompt } from "./prompt.js";
import { env } from "../../utils/env.js";
import { getIsRemoteMode, isReplBridgeActive, isUserActiveForNotifications } from "../../bootstrap/state.js";
import { isPersistentVsCodeTransport } from "../../cli/transportState.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";

//@ chunk-4rqaac63.js:4619-7369 placement
/**
 * PushNotification 的输出 schema（是否推送、是否本地、禁用原因）。
 */
var PushNotificationTool_2 = DoctorLazy(() =>
  zodStrictObject({
    message: string()
      .min(1)
      .describe("The notification body. Keep it under 200 characters; mobile OSes truncate."),
    status: literal("proactive"),
  }),
);
var pushNotificationOutputSchema = DoctorLazy(() =>
  u({
    message: string(),
    pushSent: M().optional(),
    localSent: M().optional(),
    disabledReason: _enum(["config_off", "user_present", "no_transport"]).optional(),
    sentAt: string()
      .optional()
      .describe(
        "ISO timestamp captured at tool execution on the emitting process. Optional \u2014 resumed sessions replay pre-sentAt outputs verbatim.",
      ),
  }),
);
var PUSH_ENABLED_CHECK_TTL_MS = 300000;
var PushNotificationTool = buildTool({
  name: PUSHNOTIFICATION,
  searchHint: "send a notification to the user via terminal and optionally mobile",
  backgrounding: "never",
  maxResultSizeChars: 1000,
  userFacingName: () => "PushNotification",
  get inputSchema() {
    return PushNotificationTool_2();
  },
  get outputSchema() {
    return pushNotificationOutputSchema();
  },
  shouldDefer: true,
  isEnabled() {
    return getFeatureValue_CACHED_WITH_REFRESH(
      "tengu_kairos_push_notifications",
      false,
      PUSH_ENABLED_CHECK_TTL_MS,
    );
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(e) {
    return e.message;
  },
  async description() {
    return PUSH_NOTIFICATION_DESCRIPTION;
  },
  async prompt() {
    return pushNotificationPrompt();
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
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
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: t,
    };
  },
  renderToolUseMessage(e) {
    if (!e.message) return "";
    return e.message;
  },
  create({ isNonInteractiveSession, session }) {
    return {
      async call({ message }, { onProgress }) {
        let sentAt = new Date().toISOString();
        let f = env.CLAUDE_CODE_REMOTE || getIsRemoteMode();
        let c = f || isPersistentVsCodeTransport(session);
        let m = c || isReplBridgeActive();
        let s = ({ pushSent, localSent, disabledReason }) => {
          logEvent("tengu_push_notification_send", {
            message_length: message.length,
            push_sent: pushSent,
            local_sent: localSent,
            is_remote: f,
            disabled_reason: fromEnumOpt(disabledReason),
          });
        };
        if (m && !c && !resolveSetting("agentPushNotifEnabled", false).value) {
          s({
            pushSent: false,
            localSent: false,
            disabledReason: "config_off",
          });
          return {
            data: {
              message,
              pushSent: false,
              localSent: false,
              disabledReason: "config_off",
              sentAt,
            },
          };
        }
        if (!c && !env.CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK && isUserActiveForNotifications()) {
          s({
            pushSent: false,
            localSent: false,
            disabledReason: "user_present",
          });
          return {
            data: {
              message,
              pushSent: false,
              localSent: false,
              disabledReason: "user_present",
              sentAt,
            },
          };
        }
        onProgress?.({
          type: "os_notification",
          message,
          notificationType: "push_notification",
        });
        let localSent = !isNonInteractiveSession;
        if (!m) {
          s({
            pushSent: false,
            localSent,
            disabledReason: "no_transport",
          });
          return {
            data: {
              message,
              pushSent: false,
              localSent,
              disabledReason: "no_transport",
              sentAt,
            },
          };
        }
        s({
          pushSent: true,
          localSent,
        });
        return {
          data: {
            message,
            pushSent: true,
            localSent,
            sentAt,
          },
        };
      },
    };
  },
});
