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
import { m8 } from "../../services/mcp/ccrMetaMcp.js";
import { jb } from "../../bootstrap/sessionSlices.js";
import { getToolEndsTurnKind } from "../../services/tools/mcpResultMeta.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

/**
 * 生成关键系统提醒附件，跳过排队命令与工具结果之后的位置。
 */
//@ chunk-e6aww6q8.js:3287189-3288241 placement
function getCriticalReminderAttachment(e, n, r, s, h) {
  if (!m8(h, n.visibleTools)) return [];
  let y = new Set(),
    S,
    w,
    L;
  for (let q = e.length - 1; q >= 0 && S === void 0; q--) {
    let Z = e[q];
    if (Z === void 0 || jb(Z)) continue;
    switch (((w = Z.timestamp), Z.type)) {
      case "attachment": {
        let attachment = Z.attachment,
          ke = attachment.type === "critical_system_reminder" && attachment.content === n.text,
          we = attachment.type === "queued_command" && attachment.projectsUserTurn === !0;
        if (ke || we) S = Z.timestamp;
        break;
      }
      case "user": {
        let Se = !1;
        if (Array.isArray(Z.message.content))
          for (let ke of Z.message.content) {
            if (ke.type !== "tool_result") continue;
            if (((Se = !0), ke.is_error === !0)) y.add(ke.tool_use_id);
          }
        if (Se) L ??= getToolEndsTurnKind(Z) === !1;
        else if (!s(Z)) ((L ??= !1), (S = Z.timestamp));
        break;
      }
      case "assistant": {
        if (((L ??= !1), !Array.isArray(Z.message.content))) break;
        for (let Se of Z.message.content)
          if (Se.type === "tool_use" && n.visibleTools.includes(Se.name) && !y.has(Se.id)) S = Z.timestamp;
        break;
      }
      case "progress":
      case "system":
        break;
      default:
    }
  }
  if (L !== !0) return [];
  let G = r - Date.parse(S ?? w ?? "");
  if (!(G >= n.seconds * 1000)) return [];
  return (
    logFeatureOk("projects_status_nudge", { silent_seconds: Math.floor(G / 1000) }),
    [{ type: "critical_system_reminder", content: n.text }]
  );
}

export { getCriticalReminderAttachment };
