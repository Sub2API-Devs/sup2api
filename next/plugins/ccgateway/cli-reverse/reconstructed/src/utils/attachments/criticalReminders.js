/**
 * utils/attachments/criticalReminders.ts
 *
 * 2.1.316 新增：关键系统提醒附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { serverHasAnyTool } from "../../services/mcp/ccrMetaMcp.js";
import { isVirtualConversationMessage } from "../../bootstrap/sessionSlices.js";
import { getToolEndsTurnKind } from "../../services/tools/mcpResultMeta.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:3287189-3288241 placement
/**
 * 生成关键系统提醒附件，跳过排队命令与工具结果之后的位置。
 */
function getCriticalReminderAttachment(messages, hostStatusNudge, nowMs, isTurnCompanion, tools) {
  if (!serverHasAnyTool(tools, hostStatusNudge.visibleTools)) return [];
  let erroredToolUseIds = new Set();
  let lastActivityTimestamp;
  let lastTimestamp;
  let lastMessageWasUser;
  for (let idx = messages.length - 1; idx >= 0 && lastActivityTimestamp === undefined; idx--) {
    let message = messages[idx];
    if (message === undefined || isVirtualConversationMessage(message)) continue;
    switch (((lastTimestamp = message.timestamp), message.type)) {
      case "attachment": {
        let attachment = message.attachment;
        let isNudgeReminder =
          attachment.type === "critical_system_reminder" && attachment.content === hostStatusNudge.text;
        let isProjectsTurn = attachment.type === "queued_command" && attachment.projectsUserTurn === true;
        if (isNudgeReminder || isProjectsTurn) lastActivityTimestamp = message.timestamp;
        break;
      }
      case "user": {
        let hasToolResult = false;
        if (Array.isArray(message.message.content))
          for (let block of message.message.content) {
            if (block.type !== "tool_result") continue;
            hasToolResult = true;
            if (block.is_error === true) erroredToolUseIds.add(block.tool_use_id);
          }
        if (hasToolResult) lastMessageWasUser ??= getToolEndsTurnKind(message) === false;
        else if (!isTurnCompanion(message)) {
          lastMessageWasUser ??= false;
          lastActivityTimestamp = message.timestamp;
        }
        break;
      }
      case "assistant": {
        lastMessageWasUser ??= false;
        if (!Array.isArray(message.message.content)) break;
        for (let block of message.message.content)
          if (
            block.type === "tool_use" &&
            hostStatusNudge.visibleTools.includes(block.name) &&
            !erroredToolUseIds.has(block.id)
          )
            lastActivityTimestamp = message.timestamp;
        break;
      }
      case "progress":
      case "system":
        break;
      default:
    }
  }
  if (lastMessageWasUser !== true) return [];
  let silentMs = nowMs - Date.parse(lastActivityTimestamp ?? lastTimestamp ?? "");
  if (!(silentMs >= hostStatusNudge.seconds * 1000)) return [];
  logFeatureOk("projects_status_nudge", {
    silent_seconds: Math.floor(silentMs / 1000),
  });
  return [
    {
      type: "critical_system_reminder",
      content: hostStatusNudge.text,
    },
  ];
}
export { getCriticalReminderAttachment };
