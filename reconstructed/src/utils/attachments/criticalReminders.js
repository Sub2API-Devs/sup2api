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
function getCriticalReminderAttachment(e, hostStatusNudge, r, isTurnCompanion, tools) {
  if (!serverHasAnyTool(tools, hostStatusNudge.visibleTools)) return [];
  let y = new Set();
  let S;
  let w;
  let L;
  for (let idx = e.length - 1; idx >= 0 && S === undefined; idx--) {
    let Z = e[idx];
    if (Z === undefined || isVirtualConversationMessage(Z)) continue;
    switch (((w = Z.timestamp), Z.type)) {
      case "attachment": {
        let attachment = Z.attachment;
        let ke =
          attachment.type === "critical_system_reminder" && attachment.content === hostStatusNudge.text;
        let we = attachment.type === "queued_command" && attachment.projectsUserTurn === true;
        if (ke || we) S = Z.timestamp;
        break;
      }
      case "user": {
        let Se = false;
        if (Array.isArray(Z.message.content))
          for (let ke of Z.message.content) {
            if (ke.type !== "tool_result") continue;
            Se = true;
            if (ke.is_error === true) y.add(ke.tool_use_id);
          }
        if (Se) L ??= getToolEndsTurnKind(Z) === false;
        else if (!isTurnCompanion(Z)) {
          L ??= false;
          S = Z.timestamp;
        }
        break;
      }
      case "assistant": {
        L ??= false;
        if (!Array.isArray(Z.message.content)) break;
        for (let Se of Z.message.content)
          if (Se.type === "tool_use" && hostStatusNudge.visibleTools.includes(Se.name) && !y.has(Se.id))
            S = Z.timestamp;
        break;
      }
      case "progress":
      case "system":
        break;
      default:
    }
  }
  if (L !== true) return [];
  let G = r - Date.parse(S ?? w ?? "");
  if (!(G >= hostStatusNudge.seconds * 1000)) return [];
  logFeatureOk("projects_status_nudge", {
    silent_seconds: Math.floor(G / 1000),
  });
  return [
    {
      type: "critical_system_reminder",
      content: hostStatusNudge.text,
    },
  ];
}
export { getCriticalReminderAttachment };
