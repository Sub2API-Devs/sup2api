/**
 * cli/print/resumeMcpTasks.ts
 *
 * 2.1.316 新增：恢复时处理 MCP 任务的结束通知与迟到通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (12)
 * attribution: placement 12
 */
import { normalizeMessages } from "../../utils/messages.js";
import { MAX_LIST_ITEMS } from "../../bridge/controlRequests.js";
import { logEvent } from "../../services/analytics/index.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { logForDebugging } from "../../utils/debug.js";
import { getSessionId, mainAgentId } from "../../bootstrap/state.js";
import { removeQueuedByFilter, enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import {
  getMcpTaskProjectDir,
  listMcpTaskOutcomes,
  deleteMcpTaskMetadata,
  deleteTaskOutcome,
  taskProjectDirFor,
} from "../../services/mcp/mcpTasks.js";
import {
  forgetMcpTaskEnding,
  holdMcpTaskEnding,
  stickyPromptRunId,
  getTaskNotificationRunId,
} from "../../tasks/McpTask/mcpTaskEndings.js";
import { logDeliveryOk, logSavedEnding, logRewindDropOk } from "../../services/mcp/taskDelivery.js";
import { getMaxMcpOutputChars } from "../../utils/mcpValidation.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { recordToolUsed } from "../../services/compact/keptTools.js";
import { logError } from "../../utils/log.js";
import { isTaskIdOfType } from "../../Task.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";

//@ chunk-0sfjpx19.js:76977-77132 placement
/**
 * 判断某条消息是否被另一条声明 supersedesUuids 的消息取代（按 uuid 或规范化后的 uuid）。
 */
function supersedesMessage(e, n) {
  let supersedesUuids = e.supersedesUuids;
  if (supersedesUuids === undefined || supersedesUuids.length === 0) return false;
  if (supersedesUuids.includes(n.uuid)) return true;
  return normalizeMessages([n]).some((s) => supersedesUuids.includes(s.uuid));
}
//@ chunk-0sfjpx19.js:77132-77373 placement
function logBridgeDialogKindsDeclared(e, n, r, s) {
  let size = e.size;
  for (let y of n) {
    if (e.size >= MAX_LIST_ITEMS) break;
    e.add(y);
  }
  if (r === "restored" || e.size === size) return;
  logEvent("tengu_repl_bridge_dialog_kinds_declared", {
    kind_count: e.size,
    has_refusal_fallback: e.has("refusal_fallback_prompt"),
  });
  s();
}
//@ chunk-0sfjpx19.js:77373-77382 placement
var MAX_RESUME_TASK_NOTIFICATIONS = 8;
//@ chunk-0sfjpx19.js:77382-77547 placement
async function loadMcpTaskModule({ sessionId, conversation, ...r }) {
  if (!isMcpTasksEnabled()) return;
  await deliverMcpTaskEndings(sessionId, conversation, r);
  await require("./chunk-asne9cp8.js").mcpTaskWatcherModule().restoreMcpTasks(r);
}
//@ chunk-0sfjpx19.js:77547-79140 placement
/**
 * 列出并投递上次进程期间结束的 MCP 任务通知（列不出时等下次恢复）。
 */
async function deliverMcpTaskEndings(sessionId, conversation, { taskRegistry, storageV5 }) {
  let h = (y) => (_) =>
    logForDebugging(`MCP task endings: ${y}: ${String(_)}`, {
      level: "warn",
    });
  try {
    if (getSessionId() !== sessionId) return;
    removeQueuedByFilter(isMcpTaskNotification);
    let mcpTaskProjectDir = getMcpTaskProjectDir();
    let filtered = (
      (await listMcpTaskOutcomes(storageV5).catch(
        h("could not be listed, so they wait for the next resume"),
      )) ?? []
    ).filter((N) => N.sessionId === sessionId);
    if (filtered.length === 0) return;
    let k = taskNotificationRunKeys(conversation);
    let w = [];
    let S = 0;
    for (let N of filtered) {
      let registryId = N.registryId;
      await deleteMcpTaskMetadata(registryId, storageV5, sessionId, mcpTaskProjectDir).catch(
        h(`could not delete the resume record of ended task ${registryId}`),
      );
      if (k.has(`${registryId} ${N.runId}`)) {
        forgetMcpTaskEnding(registryId);
        await deleteTaskOutcome(registryId, storageV5, sessionId, mcpTaskProjectDir).then(
          () => {
            logDeliveryOk(N.code);
            S++;
          },
          h(`could not delete the saved ending of task ${registryId}`),
        );
      } else if (taskRegistry.get(registryId) === undefined) w.push(N);
    }
    w.sort((N, G) => G.endedAt - N.endedAt);
    let T = [];
    let maxMcpOutputChars = getMaxMcpOutputChars();
    let E = w.length;
    for (let N of w) {
      let G = formatLateNotificationPreamble(N);
      if (G !== undefined) {
        maxMcpOutputChars -= G.length;
        if (T.length === MAX_RESUME_TASK_NOTIFICATIONS || (T.length > 0 && maxMcpOutputChars < 0)) break;
        T.push({
          ending: N,
          value: G,
        });
      }
      E--;
    }
    if (getSessionId() !== sessionId) return;
    for (let [N, { ending: G, value: R }] of T.reverse().entries()) {
      let { registryId, runId, toolUseId, code } = G;
      logSavedEnding();
      holdMcpTaskEnding(
        registryId,
        {
          sessionId,
          runId,
          toolUseId,
        },
        (Q) =>
          void deleteTaskOutcome(
            registryId,
            storageV5,
            sessionId,
            taskProjectDirFor(sessionId, mcpTaskProjectDir),
          ).then(
            () => (Q ? logDeliveryOk : logRewindDropOk)(code),
            h(`could not delete the saved ending of task ${registryId}`),
          ),
      );
      let mcpToolName = buildMcpToolName(G.serverName, G.toolName);
      recordToolUsed(mcpToolName);
      enqueuePendingNotification({
        value:
          E > 0 && N === T.length - 1
            ? `${R} ${E} older saved notification(s) of finished tasks are not shown here; at most ${MAX_RESUME_TASK_NOTIFICATIONS} arrive each time this session is resumed.`
            : R,
        toolsUsed: [mcpToolName],
        mode: "task-notification",
        skipAttachments: true,
        priority: "next",
        agentId: mainAgentId(),
        taskId: registryId,
        runId,
        passive: true,
        unlogged: true,
      });
    }
    logForDebugging(
      `MCP task endings: ${filtered.length} saved, ${S} already in the conversation and deleted, ${T.length} queued for the next turn, ${filtered.length - S - T.length} passed over`,
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:79140-79268 placement
function isMcpTaskNotification(e) {
  return (
    e.mode === "task-notification" &&
    e.passive === true &&
    e.unlogged === true &&
    e.taskId !== undefined &&
    isTaskIdOfType("mcp_task", e.taskId)
  );
}
//@ chunk-0sfjpx19.js:79268-79601 placement
function formatLateNotificationPreamble(e) {
  try {
    let { buildSep2663EndingNotice } = require("./chunk-g25jqyhb.js");
    return `${buildSep2663EndingNotice(e)}
This notification was written at ${new Date(e.endedAt).toISOString()}. It is delivered now because this session was resumed and its conversation does not contain it. If you have already seen it, ignore this copy.`;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-0sfjpx19.js:79601-79706 placement
function taskNotificationRunKeys(e) {
  let n = new Set();
  for (let r of e) {
    let s = stickyPromptRunId(r);
    if (s !== undefined) n.add(`${s} ${getTaskNotificationRunId(r)}`);
  }
  return n;
}
//@ chunk-0sfjpx19.js:79743-79776 placement
/**
 * 恢复会话时通知的最大年龄 2 小时，以及仅含 BRIEF_TOOL_NAME 的集合（恢复时特别处理该工具）。
 */
var RESUME_NOTIFICATION_MAX_AGE_MS = 7200000;
var BRIEF_TOOL_NAME_SET = new Set([BRIEF_TOOL_NAME]);
//@ chunk-0sfjpx19.js:79776-79810 placement
function hasNonWhitespace(text) {
  return /\S/.test(text);
}
//@ chunk-0sfjpx19.js:79810-79911 placement
/**
 * 判断流事件是否为内容为标记文本的 text_delta。
 */
function isMarkerTextDelta(event) {
  return (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta" &&
    hasNonWhitespace(event.delta.text)
  );
}
//@ chunk-0sfjpx19.js:79911-79975 placement
function isRealAssistantReply(e) {
  return !e.isApiErrorMessage && e.message.model !== SYNTHETIC_MODEL;
}
export {
  isRealAssistantReply,
  hasNonWhitespace,
  RESUME_NOTIFICATION_MAX_AGE_MS,
  BRIEF_TOOL_NAME_SET,
  loadMcpTaskModule,
  supersedesMessage,
  logBridgeDialogKindsDeclared,
  isMarkerTextDelta,
};
