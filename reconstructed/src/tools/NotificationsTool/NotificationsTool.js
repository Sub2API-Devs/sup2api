/**
 * tools/NotificationsTool/NotificationsTool.ts
 *
 * 2.1.316 新增：外部通知读取工具 schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, array, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  READNOTIFICATIONS,
  READNOTIFICATIONS_SHORT_DESCRIPTION,
  READNOTIFICATIONS_PROMPT,
} from "../ReadNotificationsTool/ReadNotificationsTool.js";
import {
  DRAIN_TOTAL_BUDGET_CHARS,
  isQueuedNotificationsSupported,
  formatDrainedNotifications,
} from "../../services/queuedNotifications/queuedNotifications.js";

//@ chunk-kxyd0g16.js:5732-7894 placement
/**
 * Notifications 工具的输出 schema：通知条目（id、来源、时间、正文、到达时间）列表。
 */
var NotificationsSchema = DoctorLazy(() => zodStrictObject({}));
var notificationsOutputSchema = DoctorLazy(() =>
  u({
    notifications: array(
      u({
        notification_id: string().describe(
          "Server-assigned stable id \u2014 the dedup key across redeliveries.",
        ),
        origin: string().describe(
          'Server-attested source token: "github_webhook" | "trigger_fire" | "mcp_send_message" (open set; unknown well-formed tokens pass through verbatim, off-grammar values coerce to "unknown").',
        ),
        queued_at: string().describe("RFC3339 timestamp of when the backend queued it."),
        content: string().describe("Verbatim notification body."),
        arrived_at: string()
          .optional()
          .describe(
            "RFC3339 timestamp, by this machine's clock, of when the notification reached this session's queue. Missing from results saved before this field existed.",
          ),
      }),
    ),
    remaining: E().describe(
      "Notifications still queued after this drain (drains are size-budgeted); call the tool again to read them.",
    ),
    read_at: string()
      .optional()
      .describe(
        "RFC3339 timestamp, by this machine's clock, of when this call read the queue. Missing from results saved before this field existed.",
      ),
  }),
);
var notificationsTool = buildTool({
  name: READNOTIFICATIONS,
  searchHint: "read queued external notifications (webhooks, triggers)",
  backgrounding: "never",
  maxResultSizeChars: DRAIN_TOTAL_BUDGET_CHARS,
  persistenceThresholdCeiling: DRAIN_TOTAL_BUDGET_CHARS,
  skipAggregateToolResultBudget: true,
  get inputSchema() {
    return NotificationsSchema();
  },
  get outputSchema() {
    return notificationsOutputSchema();
  },
  isEnabled: isQueuedNotificationsSupported,
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  async description() {
    return READNOTIFICATIONS_SHORT_DESCRIPTION;
  },
  async prompt() {
    return READNOTIFICATIONS_PROMPT;
  },
  toAutoClassifierInput() {
    return "read queued notifications";
  },
  create({ agentId, queuedNotificationsRegistry }) {
    return {
      async call(n) {
        if (agentId !== undefined)
          throw Error(
            "ReadNotifications can only be called from the main conversation \u2014 subagents must not drain the session notification buffer.",
          );
        let readAt = new Date(Date.now()).toISOString();
        let { notifications, remaining } = queuedNotificationsRegistry.drain();
        return {
          data: {
            notifications: notifications.map((notification) => ({
              notification_id: notification.notificationId,
              origin: notification.origin,
              queued_at: notification.queuedAt,
              content: notification.content,
              arrived_at: notification.arrivedAt,
            })),
            remaining,
            read_at: readAt,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: formatDrainedNotifications(e.notifications, e.remaining, e.read_at),
    };
  },
  renderToolUseMessage() {
    return "";
  },
  extractSearchText(e) {
    return e.notifications.map((notification) => notification.content).join(`
`);
  },
});
export { notificationsTool };
