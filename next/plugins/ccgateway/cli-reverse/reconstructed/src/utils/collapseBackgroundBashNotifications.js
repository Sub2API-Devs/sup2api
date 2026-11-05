/**
 * utils/collapseBackgroundBashNotifications.ts
 *
 * 把连续的后台 Bash 完成通知合并显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/collapseBackgroundBashNotifications.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { collapseNotificationRunsIn, notificationKind, weakMap_19 } from "./queuedCommandDisplay.js";
import { TASK_NOTIFICATION, STATUS, SUMMARY } from "../constants/xml.js";

//@ chunk-5xgkngpb.js:4784054-4784557 fingerprint (2.1.88 match: collapseBackgroundBashNotifications, 0.615)
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
    if (kind === "bash") weakMap_19.set(entry, collapsedCount);
    result.push(entry);
  }
  return result;
}
export { collapseBackgroundBashNotifications };
