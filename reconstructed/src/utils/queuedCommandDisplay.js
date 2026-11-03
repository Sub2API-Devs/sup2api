/**
 * utils/queuedCommandDisplay.ts
 *
 * 2.1.316 新增：排队命令显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { extractTag, regExp_3 } from "./messages.js";
import {
  SUMMARY,
  TASK_TYPE,
  STATUS,
  BACKGROUND_COMMAND_PREFIX,
  AGENT_NOTIFICATION_PREFIX,
  AGENT_FINISHED_SUFFIX,
  TASK_NOTIFICATION,
  REMOTE_TASK_PREFIX,
} from "../constants/xml.js";
import { ARTIFACT_CHANGED, ARTIFACT_CHANGED_TITLE } from "../tools/ArtifactTool/artifactNotices.js";
import { getFirstLine, truncateToLength } from "./stringUtils.js";

//@ chunk-e6aww6q8.js:4673725-4673745 placement
var weakMap_14 = new WeakMap();
//@ chunk-e6aww6q8.js:4673745-4673820 placement = _temp (0.787)
function completedCommandSummary(msg) {
  let userPromptText = getUserPromptText(msg);
  return userPromptText?.status === "completed" ? userPromptText.summary : null;
}
//@ chunk-e6aww6q8.js:4673820-4673840 placement
var stickyTextCache = new WeakMap();
//@ chunk-e6aww6q8.js:4673840-4674254 placement = computeStickyPromptText (0.8)
function getUserPromptText(msg) {
  let n = stickyTextCache.get(msg);
  if (n === undefined) {
    n = null;
    if (msg.type === "user" && msg.message.content[0]?.type === "text")
      n = parseTaskNotification(msg.message.content[0].text, msg.origin);
    else if (
      msg.type === "attachment" &&
      msg.attachment.type === "queued_command" &&
      msg.attachment.commandMode === "task-notification" &&
      typeof msg.attachment.prompt === "string" &&
      !msg.attachment.imagePasteIds?.length
    )
      n = parseTaskNotification(msg.attachment.prompt, msg.attachment.origin);
    stickyTextCache.set(msg, n);
  }
  return n;
}
//@ chunk-e6aww6q8.js:4674254-4674453 placement
/**
 * 解析排队的任务通知：取出摘要（不含标签）、状态与任务类型。
 */
function parseTaskNotification(e, origin) {
  let r = processQueuedCommands_3(e, origin);
  if (r === null) return null;
  let tag = extractTag(r, SUMMARY);
  if (!tag || tag.includes("<")) return null;
  let tag_2 = extractTag(r, TASK_TYPE);
  return {
    status: extractTag(r, STATUS),
    summary: tag,
    taskType: tag_2 !== null && !tag_2.includes("<") ? tag_2 : null,
  };
}
//@ chunk-e6aww6q8.js:4674453-4674532 placement = processQueuedCommands (1)
function processQueuedCommands_3(e, n) {
  if (n && n.kind !== "task-notification") return null;
  return bareTaskNotification(e);
}
//@ chunk-e6aww6q8.js:4674532-4674729 placement
function isCollapsibleNotification(e) {
  if (e.status !== null && e.status !== "completed") return false;
  return (
    e.summary.startsWith(BACKGROUND_COMMAND_PREFIX) ||
    (e.summary.startsWith(AGENT_NOTIFICATION_PREFIX) && e.summary.endsWith(AGENT_FINISHED_SUFFIX)) ||
    (e.taskType === ARTIFACT_CHANGED && e.summary.startsWith(ARTIFACT_CHANGED_TITLE))
  );
}
//@ chunk-e6aww6q8.js:4674729-4674741 placement
var MAX_COLLAPSED_NOTICE_WIDTH = 160;
//@ chunk-e6aww6q8.js:4674741-4675054 placement
/**
 * 生成折叠后的任务通知：首行摘要截断后加"· +N more"。
 */
function buildCollapsedNotification(e, n) {
  let r = e.taskType === null ? "" : `<${TASK_TYPE}>${e.taskType}</${TASK_TYPE}>`;
  let s = e.status === null ? "" : `<${STATUS}>${e.status}</${STATUS}>`;
  let firstLine = getFirstLine(e.summary);
  let replaced = truncateToLength(firstLine, MAX_COLLAPSED_NOTICE_WIDTH).replace(/&[a-zA-Z#0-9]*$/, "");
  let w =
    replaced !== firstLine || e.summary.slice(firstLine.length).trim() !== ""
      ? `${replaced}\u2026`
      : replaced;
  return `<${TASK_NOTIFICATION}>${r}${s}<${SUMMARY}>${w} \xB7 +${n} more</${SUMMARY}></${TASK_NOTIFICATION}>`;
}
//@ chunk-e6aww6q8.js:4675054-4675188 placement
function notificationKind(msg) {
  let n = completedCommandSummary(msg);
  if (n === null) return null;
  if (n.startsWith(BACKGROUND_COMMAND_PREFIX)) return "bash";
  if (n.startsWith(REMOTE_TASK_PREFIX)) return "remote";
  return null;
}
//@ chunk-e6aww6q8.js:4675188-4675449 placement
function collapsedNotificationKind(e) {
  let n = weakMap_14.get(e);
  if (n !== undefined)
    return {
      kind: "bash",
      count: n,
    };
  if (isWeakNotified(e)) return null;
  let r = completedCommandSummary(e);
  if (r === null) return null;
  if (r.startsWith(BACKGROUND_COMMAND_PREFIX))
    return {
      kind: "bash",
      count: 1,
    };
  if (r.startsWith(AGENT_NOTIFICATION_PREFIX) && r.endsWith(AGENT_FINISHED_SUFFIX))
    return {
      kind: "agent",
      count: 1,
    };
  return null;
}
//@ chunk-e6aww6q8.js:4675952-4676004 placement
var weakMap_15 = new WeakMap();
var weakSet_8 = new WeakSet();
var weakMap_16 = new WeakMap();
//@ chunk-e6aww6q8.js:4676004-4676038 placement
/**
 * isWeakNotified：该消息是否在弱表里。
 */
function isWeakNotified(message) {
  return weakSet_8.has(message);
}
//@ chunk-e6aww6q8.js:4676038-4676078 placement
/**
 * collapsedRowOf：取折叠行。
 */
function collapsedRowOf(e) {
  return weakMap_16.get(e) ?? null;
}
//@ chunk-e6aww6q8.js:4676078-4676356 placement
/**
 * 把连续的可折叠通知（后台命令完成、代理完成、artifact 变更）合并成一行，其余原样保留。
 */
function collapseNotificationRuns(e, n, r) {
  let s = [];
  let h = 0;
  while (h < e.length) {
    let y = e[h];
    let S = n(y);
    let w = h + 1;
    if (S !== null && isCollapsibleNotification(S))
      while (w < e.length) {
        let G = n(e[w]);
        if (G === null || !isCollapsibleNotification(G)) break;
        w++;
      }
    let L = w - h === 1 || S === null ? null : r(e.slice(h, w), S);
    if (L === null) for (let G = h; G < w; G++) s.push(e[G]);
    else s.push(L);
    h = w;
  }
  return s;
}
//@ chunk-e6aww6q8.js:4676356-4676394 placement
/**
 * collapseNotificationRunsIn：折叠连续通知。
 */
function collapseNotificationRunsIn(messages) {
  return collapseNotificationRuns(messages, getUserPromptText, collapsedNotificationRow);
}
//@ chunk-e6aww6q8.js:4676394-4676849 placement
/**
 * 生成折叠通知对应的消息行（用户消息或排队命令附件），并缓存折叠关系。
 */
function collapsedNotificationRow(e, n) {
  let r = e[0];
  let s = e.length - 1;
  let h = weakMap_15.get(r);
  if (h?.more === s) return h.row;
  let collapsedNotification = buildCollapsedNotification(n, s);
  let S;
  switch (r.type) {
    case "user":
      S = {
        ...r,
        message: {
          role: "user",
          content: [
            {
              type: "text",
              text: collapsedNotification,
            },
          ],
        },
      };
      break;
    case "attachment":
      if (r.attachment.type !== "queued_command") return null;
      S = {
        ...r,
        attachment: {
          ...r.attachment,
          prompt: collapsedNotification,
        },
      };
      break;
    default:
      return null;
  }
  if (e.every((w) => completedCommandSummary(w)?.startsWith(BACKGROUND_COMMAND_PREFIX)))
    weakMap_14.set(S, e.length);
  weakMap_15.set(r, {
    more: s,
    row: S,
  });
  weakSet_8.add(S);
  weakMap_16.set(S, e);
  return S;
}
//@ chunk-e6aww6q8.js:4676849-4677066 placement
function bareTaskNotification(e) {
  let n = e.trimStart();
  if (!n.startsWith(`<${TASK_NOTIFICATION}`)) return null;
  let r = `</${TASK_NOTIFICATION}>`;
  let index = n.indexOf(r);
  if (index === -1) return null;
  let sliced = n.slice(0, index + r.length);
  return n.slice(sliced.length).replace(regExp_3, "").trim() === "" ? sliced : null;
}
export {
  collapsedNotificationKind,
  collapsedRowOf,
  parseTaskNotification,
  buildCollapsedNotification,
  collapseNotificationRuns,
  processQueuedCommands_3,
  isWeakNotified,
  collapseNotificationRunsIn,
  notificationKind,
  weakMap_14,
};
