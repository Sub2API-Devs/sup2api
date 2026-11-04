/**
 * utils/collapseBackgroundBashNotifications.ts
 *
 * 把连续的后台 Bash 完成通知合并显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/collapseBackgroundBashNotifications.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { collapseNotificationRunsIn, notificationKind, weakMap_14 } from "./queuedCommandDisplay.js";
import { TASK_NOTIFICATION, STATUS, SUMMARY } from "../constants/xml.js";

//@ chunk-e6aww6q8.js:4675449-4675952 fingerprint (2.1.88 match: collapseBackgroundBashNotifications, 0.615)
/**
 * 把连续的后台 Bash 完成通知合并成一条显示。
 */
function collapseBackgroundBashNotifications(messages, host, options) {
  if (host) return messages;
  if (!isFullscreenEnvEnabled()) return messages;
  if (options) return collapseNotificationRunsIn(messages);
  let result = [];
  let i = 0;
  while (i < messages.length) {
    let msg = messages[i];
    let kind = notificationKind(msg);
    if (kind === null || msg.type !== "user") {
      result.push(msg);
      i++;
      continue;
    }
    let collapsedCount = 0;
    while (i < messages.length && notificationKind(messages[i]) === kind) {
      collapsedCount++;
      i++;
    }
    if (collapsedCount === 1) {
      result.push(msg);
      continue;
    }
    let summary =
      kind === "bash"
        ? `${collapsedCount} background commands completed`
        : `${collapsedCount} remote tasks completed`;
    let entry = {
      ...msg,
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text: `<${TASK_NOTIFICATION}><${STATUS}>completed</${STATUS}><${SUMMARY}>${summary}</${SUMMARY}></${TASK_NOTIFICATION}>`,
          },
        ],
      },
    };
    if (kind === "bash") weakMap_14.set(entry, collapsedCount);
    result.push(entry);
  }
  return result;
}
export { collapseBackgroundBashNotifications };
