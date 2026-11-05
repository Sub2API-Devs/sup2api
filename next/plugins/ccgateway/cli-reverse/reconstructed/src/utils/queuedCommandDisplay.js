/**
 * utils/queuedCommandDisplay.ts
 *
 * 2.1.316 新增：排队命令显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4782328-4782348 placement
var weakMap_19; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4782328", () => {
  weakMap_19 = new WeakMap();
});
//@ chunk-5xgkngpb.js:4782348-4782423 placement (2.1.88 match: _temp, 0.788)
function completedCommandSummary(msg) {
  let userPromptText = getUserPromptText(msg);
  return userPromptText?.status === "completed" ? userPromptText.summary : null;
}
//@ chunk-5xgkngpb.js:4782423-4782443 placement
var stickyTextCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4782423", () => {
  stickyTextCache = new WeakMap();
});
//@ chunk-5xgkngpb.js:4782443-4782857 placement (2.1.88 match: computeStickyPromptText, 0.799)
function getUserPromptText(msg) {
  let summary = stickyTextCache.get(msg);
  if (summary === undefined) {
    summary = null;
    if (msg.type === "user" && msg.message.content[0]?.type === "text")
      summary = parseTaskNotification(msg.message.content[0].text, msg.origin);
    else if (
      msg.type === "attachment" &&
      msg.attachment.type === "queued_command" &&
      msg.attachment.commandMode === "task-notification" &&
      typeof msg.attachment.prompt === "string" &&
      !msg.attachment.imagePasteIds?.length
    )
      summary = parseTaskNotification(msg.attachment.prompt, msg.attachment.origin);
    stickyTextCache.set(msg, summary);
  }
  return summary;
}
//@ chunk-5xgkngpb.js:4782857-4783056 placement
/**
 * 解析排队的任务通知：取出摘要（不含标签）、状态与任务类型。
 */
function parseTaskNotification(text, origin) {
  let inner = processQueuedCommands_2(text, origin);
  if (inner === null) return null;
  let tag = extractTag(inner, SUMMARY);
  if (!tag || tag.includes("<")) return null;
  let tag_2 = extractTag(inner, TASK_TYPE);
  return {
    status: extractTag(inner, STATUS),
    summary: tag,
    taskType: tag_2 !== null && !tag_2.includes("<") ? tag_2 : null,
  };
}
//@ chunk-5xgkngpb.js:4783056-4783135 placement (2.1.88 match: processQueuedCommands, 1)
function processQueuedCommands_2(text, origin) {
  if (origin && origin.kind !== "task-notification") return null;
  return bareTaskNotification(text);
}
//@ chunk-5xgkngpb.js:4783135-4783333 placement (2.1.88 match: enqueueRemoteNotification, 0.173)
function isCollapsibleNotification(summary) {
  if (summary.status !== null && summary.status !== "completed") return false;
  return (
    summary.summary.startsWith(BACKGROUND_COMMAND_PREFIX) ||
    (summary.summary.startsWith(AGENT_NOTIFICATION_PREFIX) &&
      summary.summary.endsWith(AGENT_FINISHED_SUFFIX)) ||
    (summary.taskType === ARTIFACT_CHANGED && summary.summary.startsWith(ARTIFACT_CHANGED_TITLE))
  );
}
//@ chunk-5xgkngpb.js:4783333-4783345 placement
var MAX_COLLAPSED_NOTICE_WIDTH = 160;
//@ chunk-5xgkngpb.js:4783345-4783657 placement
/**
 * 生成折叠后的任务通知：首行摘要截断后加"· +N more"。
 */
function buildCollapsedNotification(summary, moreCount) {
  let taskTypeTag = summary.taskType === null ? "" : `<${TASK_TYPE}>${summary.taskType}</${TASK_TYPE}>`;
  let statusTag = summary.status === null ? "" : `<${STATUS}>${summary.status}</${STATUS}>`;
  let firstLine = getFirstLine(summary.summary);
  let replaced = truncateToLength(firstLine, MAX_COLLAPSED_NOTICE_WIDTH).replace(/&[a-zA-Z#0-9]*$/, "");
  let summaryText =
    replaced !== firstLine || summary.summary.slice(firstLine.length).trim() !== ""
      ? `${replaced}\u2026`
      : replaced;
  return `<${TASK_NOTIFICATION}>${taskTypeTag}${statusTag}<${SUMMARY}>${summaryText} \xB7 +${moreCount} more</${SUMMARY}></${TASK_NOTIFICATION}>`;
}
//@ chunk-5xgkngpb.js:4783657-4783792 placement
function notificationKind(msg) {
  let summary = completedCommandSummary(msg);
  if (summary === null) return null;
  if (summary.startsWith(BACKGROUND_COMMAND_PREFIX)) return "bash";
  if (summary.startsWith(REMOTE_TASK_PREFIX)) return "remote";
  return null;
}
//@ chunk-5xgkngpb.js:4783792-4784054 placement
function collapsedNotificationKind(message) {
  let count = weakMap_19.get(message);
  if (count !== undefined)
    return {
      kind: "bash",
      count,
    };
  if (isWeakNotified(message)) return null;
  let summary = completedCommandSummary(message);
  if (summary === null) return null;
  if (summary.startsWith(BACKGROUND_COMMAND_PREFIX))
    return {
      kind: "bash",
      count: 1,
    };
  if (summary.startsWith(AGENT_NOTIFICATION_PREFIX) && summary.endsWith(AGENT_FINISHED_SUFFIX))
    return {
      kind: "agent",
      count: 1,
    };
  return null;
}
//@ chunk-5xgkngpb.js:4784557-4784609 placement
var weakMap_20; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_9;
var weakMap_21;
deferInit("chunk-5xgkngpb.js:4784557", () => {
  weakMap_20 = new WeakMap();
  weakSet_9 = new WeakSet();
  weakMap_21 = new WeakMap();
});
//@ chunk-5xgkngpb.js:4784609-4784643 placement
/**
 * isWeakNotified：该消息是否在弱表里。
 */
function isWeakNotified(message) {
  return weakSet_9.has(message);
}
//@ chunk-5xgkngpb.js:4784643-4784683 placement
/**
 * collapsedRowOf：取折叠行。
 */
function collapsedRowOf(row) {
  return weakMap_21.get(row) ?? null;
}
//@ chunk-5xgkngpb.js:4784683-4784961 placement
/**
 * 把连续的可折叠通知（后台命令完成、代理完成、artifact 变更）合并成一行，其余原样保留。
 */
function collapseNotificationRuns(entries, summaryOf, collapseRun) {
  let out = [];
  let index = 0;
  while (index < entries.length) {
    let entry = entries[index];
    let summary = summaryOf(entry);
    let runEnd = index + 1;
    if (summary !== null && isCollapsibleNotification(summary))
      while (runEnd < entries.length) {
        let nextSummary = summaryOf(entries[runEnd]);
        if (nextSummary === null || !isCollapsibleNotification(nextSummary)) break;
        runEnd++;
      }
    let collapsed =
      runEnd - index === 1 || summary === null ? null : collapseRun(entries.slice(index, runEnd), summary);
    if (collapsed === null)
      for (let cursorIndex = index; cursorIndex < runEnd; cursorIndex++) out.push(entries[cursorIndex]);
    else out.push(collapsed);
    index = runEnd;
  }
  return out;
}
//@ chunk-5xgkngpb.js:4784961-4784999 placement
/**
 * collapseNotificationRunsIn：折叠连续通知。
 */
function collapseNotificationRunsIn(entries) {
  return collapseNotificationRuns(entries, getUserPromptText, collapsedNotificationRow);
}
//@ chunk-5xgkngpb.js:4784999-4785455 placement (2.1.88 match: buildTranscriptEntries, 0.824)
/**
 * 生成折叠通知对应的消息行（用户消息或排队命令附件），并缓存折叠关系。
 */
function collapsedNotificationRow(run, summary) {
  let first = run[0];
  let more = run.length - 1;
  let cached = weakMap_20.get(first);
  if (cached?.more === more) return cached.row;
  let collapsedNotification = buildCollapsedNotification(summary, more);
  let row;
  switch (first.type) {
    case "user":
      row = {
        ...first,
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
      if (first.attachment.type !== "queued_command") return null;
      row = {
        ...first,
        attachment: {
          ...first.attachment,
          prompt: collapsedNotification,
        },
      };
      break;
    default:
      return null;
  }
  if (run.every((entry) => completedCommandSummary(entry)?.startsWith(BACKGROUND_COMMAND_PREFIX)))
    weakMap_19.set(row, run.length);
  weakMap_20.set(first, {
    more,
    row,
  });
  weakSet_9.add(row);
  weakMap_21.set(row, run);
  return row;
}
//@ chunk-5xgkngpb.js:4785455-4785672 placement
function bareTaskNotification(text) {
  let trimmed = text.trimStart();
  if (!trimmed.startsWith(`<${TASK_NOTIFICATION}`)) return null;
  let closeTag = `</${TASK_NOTIFICATION}>`;
  let index = trimmed.indexOf(closeTag);
  if (index === -1) return null;
  let sliced = trimmed.slice(0, index + closeTag.length);
  return trimmed.slice(sliced.length).replace(regExp_3, "").trim() === "" ? sliced : null;
}
export {
  collapsedNotificationKind,
  isWeakNotified,
  collapseNotificationRunsIn,
  notificationKind,
  weakMap_19,
  collapsedRowOf,
  parseTaskNotification,
  buildCollapsedNotification,
  collapseNotificationRuns,
  processQueuedCommands_2,
};
