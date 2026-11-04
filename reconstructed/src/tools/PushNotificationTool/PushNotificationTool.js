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
import {
  zodStrictObject,
  stringSchema,
  literal,
  objectSchema,
  booleanSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
    message: stringSchema()
      .min(1)
      .describe("The notification body. Keep it under 200 characters; mobile OSes truncate."),
    status: literal("proactive"),
  }),
);
var pushNotificationOutputSchema = DoctorLazy(() =>
  objectSchema({
    message: stringSchema(),
    pushSent: booleanSchema().optional(),
    localSent: booleanSchema().optional(),
    disabledReason: _enum(["config_off", "user_present", "no_transport"]).optional(),
    sentAt: stringSchema()
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
  toAutoClassifierInput(input) {
    return input.message;
  },
  async description() {
    return PUSH_NOTIFICATION_DESCRIPTION;
  },
  async prompt() {
    return pushNotificationPrompt();
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    let contentText;
    if (result.disabledReason === "config_off")
      contentText = "Push not sent \u2014 mobile push is disabled in /config.";
    else if (result.disabledReason === "user_present")
      contentText =
        "Not sent \u2014 this terminal is active, so your output here already reaches the user; a separate notification would be redundant.";
    else if (result.disabledReason === "no_transport")
      contentText = result.localSent
        ? "Terminal notification sent. Mobile push not sent (Remote Control inactive)."
        : "Mobile push not sent (Remote Control inactive).";
    else
      contentText = result.localSent
        ? "Terminal notification sent. Mobile push requested."
        : "Mobile push requested.";
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: contentText,
    };
  },
  renderToolUseMessage(input) {
    if (!input.message) return "";
    return input.message;
  },
  create({ isNonInteractiveSession, session }) {
    return {
      async call({ message }, { onProgress }) {
        let sentAt = new Date().toISOString();
        let isRemote = env.CLAUDE_CODE_REMOTE || getIsRemoteMode();
        let hasMobileTransport = isRemote || isPersistentVsCodeTransport(session);
        let hasAnyTransport = hasMobileTransport || isReplBridgeActive();
        let logOutcome = ({ pushSent, localSent, disabledReason }) => {
          logEvent("tengu_push_notification_send", {
            message_length: message.length,
            push_sent: pushSent,
            local_sent: localSent,
            is_remote: isRemote,
            disabled_reason: fromEnumOpt(disabledReason),
          });
        };
        if (hasAnyTransport && !hasMobileTransport && !resolveSetting("agentPushNotifEnabled", false).value) {
          logOutcome({
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
        if (
          !hasMobileTransport &&
          !env.CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK &&
          isUserActiveForNotifications()
        ) {
          logOutcome({
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
        if (!hasAnyTransport) {
          logOutcome({
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
        logOutcome({
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
export { PushNotificationTool };
