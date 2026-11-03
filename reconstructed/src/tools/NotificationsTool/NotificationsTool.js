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
import { zodStrictObject, u, A, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { READNOTIFICATIONS, dsi, Fnr } from "../ReadNotificationsTool/ReadNotificationsTool.js";
import {
  qMr,
  NGn,
  formatDrainedNotifications,
} from "../../services/queuedNotifications/queuedNotifications.js";

/**
 * 外部通知读取工具 schema。
 */
//@ chunk-kxyd0g16.js:5732-7894 placement
var NotificationsSchema = DoctorLazy(() => zodStrictObject({})),
  xn = DoctorLazy(() =>
    u({
      notifications: A(
        u({
          notification_id: o().describe(
            "Server-assigned stable id \u2014 the dedup key across redeliveries.",
          ),
          origin: o().describe(
            'Server-attested source token: "github_webhook" | "trigger_fire" | "mcp_send_message" (open set; unknown well-formed tokens pass through verbatim, off-grammar values coerce to "unknown").',
          ),
          queued_at: o().describe("RFC3339 timestamp of when the backend queued it."),
          content: o().describe("Verbatim notification body."),
          arrived_at: o()
            .optional()
            .describe(
              "RFC3339 timestamp, by this machine's clock, of when the notification reached this session's queue. Missing from results saved before this field existed.",
            ),
        }),
      ),
      remaining: E().describe(
        "Notifications still queued after this drain (drains are size-budgeted); call the tool again to read them.",
      ),
      read_at: o()
        .optional()
        .describe(
          "RFC3339 timestamp, by this machine's clock, of when this call read the queue. Missing from results saved before this field existed.",
        ),
    }),
  ),
  Ut = buildTool({
    name: READNOTIFICATIONS,
    searchHint: "read queued external notifications (webhooks, triggers)",
    backgrounding: "never",
    maxResultSizeChars: qMr,
    persistenceThresholdCeiling: qMr,
    skipAggregateToolResultBudget: !0,
    get inputSchema() {
      return NotificationsSchema();
    },
    get outputSchema() {
      return xn();
    },
    isEnabled: NGn,
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    async description() {
      return dsi;
    },
    async prompt() {
      return Fnr;
    },
    toAutoClassifierInput() {
      return "read queued notifications";
    },
    create({ agentId: e, queuedNotificationsRegistry: r }) {
      return {
        async call(n) {
          if (e !== void 0)
            throw Error(
              "ReadNotifications can only be called from the main conversation \u2014 subagents must not drain the session notification buffer.",
            );
          let iso = new Date(Date.now()).toISOString(),
            { notifications: notifications, remaining: remaining } = r.drain();
          return {
            data: {
              notifications: notifications.map((y) => ({
                notification_id: y.notificationId,
                origin: y.origin,
                queued_at: y.queuedAt,
                content: y.content,
                arrived_at: y.arrivedAt,
              })),
              remaining: remaining,
              read_at: iso,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return {
        tool_use_id: r,
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

export { Ut };
