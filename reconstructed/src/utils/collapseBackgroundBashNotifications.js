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

//@ chunk-e6aww6q8.js:4675449-4675952 fingerprint = collapseBackgroundBashNotifications (0.615)
/**
 * 把连续的后台 Bash 完成通知合并成一条显示。
 */
function collapseBackgroundBashNotifications(messages, n, r) {
  if (n) return messages;
  if (!isFullscreenEnvEnabled()) return messages;
  if (r) return collapseNotificationRunsIn(messages);
  let result = [];
  let i = 0;
  while (i < messages.length) {
    let msg = messages[i];
    let S = notificationKind(msg);
    if (S === null || msg.type !== "user") {
      result.push(msg);
      i++;
      continue;
    }
    let w = 0;
    while (i < messages.length && notificationKind(messages[i]) === S) {
      w++;
      i++;
    }
    if (w === 1) {
      result.push(msg);
      continue;
    }
    let L = S === "bash" ? `${w} background commands completed` : `${w} remote tasks completed`;
    let G = {
      ...msg,
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text: `<${TASK_NOTIFICATION}><${STATUS}>completed</${STATUS}><${SUMMARY}>${L}</${SUMMARY}></${TASK_NOTIFICATION}>`,
          },
        ],
      },
    };
    if (S === "bash") weakMap_14.set(G, w);
    result.push(G);
  }
  return result;
}
export { collapseBackgroundBashNotifications };
