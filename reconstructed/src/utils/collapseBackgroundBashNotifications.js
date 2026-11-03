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
import { $Ts, notificationKind, weakMap_14 } from "./queuedCommandDisplay.js";
import { TASK_NOTIFICATION, STATUS, SUMMARY } from "../constants/xml.js";

/**
 * 把连续的后台 Bash 完成通知合并成一条显示。
 */
//@ chunk-e6aww6q8.js:4675449-4675952 fingerprint = collapseBackgroundBashNotifications (0.615)
function collapseBackgroundBashNotifications(e, n, r) {
  if (n) return e;
  if (!isFullscreenEnvEnabled()) return e;
  if (r) return $Ts(e);
  let result = [],
    h = 0;
  while (h < e.length) {
    let msg = e[h],
      S = notificationKind(msg);
    if (S === null || msg.type !== "user") {
      (result.push(msg), h++);
      continue;
    }
    let w = 0;
    while (h < e.length && notificationKind(e[h]) === S) (w++, h++);
    if (w === 1) {
      result.push(msg);
      continue;
    }
    let L = S === "bash" ? `${w} background commands completed` : `${w} remote tasks completed`,
      G = {
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
