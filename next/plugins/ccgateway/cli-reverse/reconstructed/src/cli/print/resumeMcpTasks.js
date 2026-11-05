/**
 * cli/print/resumeMcpTasks.ts
 *
 * 2.1.316 新增：恢复时处理 MCP 任务的结束通知与迟到通知
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeMessages, SYNTHETIC_MODEL } from "../../utils/messages.js";
import { MAX_LIST_ITEMS } from "../../bridge/controlRequests.js";
import { logEvent } from "../../services/analytics/index.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { logForDebugging } from "../../utils/debug.js";
import { getSessionId, mainAgentId } from "../../bootstrap/state.js";
import { removeByFilter, enqueuePendingNotification } from "../../utils/messageQueueManager.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nh1pvp1m.js:69739-69894 placement
/**
 * 判断某条消息是否被另一条声明 supersedesUuids 的消息取代（按 uuid 或规范化后的 uuid）。
 */
function supersedesMessage(message, base) {
  let supersedesUuids = message.supersedesUuids;
  if (supersedesUuids === undefined || supersedesUuids.length === 0) return false;
  if (supersedesUuids.includes(base.uuid)) return true;
  return normalizeMessages([base]).some((message) => supersedesUuids.includes(message.uuid));
}
//@ chunk-nh1pvp1m.js:69894-70135 placement
function logBridgeDialogKindsDeclared(kinds, next, source, onChanged) {
  let size = kinds.size;
  for (let kind of next) {
    if (kinds.size >= MAX_LIST_ITEMS) break;
    kinds.add(kind);
  }
  if (source === "restored" || kinds.size === size) return;
  logEvent("tengu_repl_bridge_dialog_kinds_declared", {
    kind_count: kinds.size,
    has_refusal_fallback: kinds.has("refusal_fallback_prompt"),
  });
  onChanged();
}
//@ chunk-nh1pvp1m.js:70135-70144 placement
var MAX_RESUME_TASK_NOTIFICATIONS = 8;
//@ chunk-nh1pvp1m.js:70144-70309 placement
async function loadMcpTaskModule({ sessionId, conversation, ...options }) {
  if (!isMcpTasksEnabled()) return;
  await deliverMcpTaskEndings(sessionId, conversation, options);
  await require("../../services/mcp/emitTripwireEvent.lazy.js")
    .mcpTaskWatcherModule()
    .restoreMcpTasks(options);
}
//@ chunk-nh1pvp1m.js:70309-71899 placement
/**
 * 列出并投递上次进程期间结束的 MCP 任务通知（列不出时等下次恢复）。
 */
async function deliverMcpTaskEndings(sessionId, messages, { taskRegistry, storageV5 }) {
  let logFailure = (what) => (value) =>
    logForDebugging(`MCP task endings: ${what}: ${String(value)}`, {
      level: "warn",
    });
  try {
    if (getSessionId() !== sessionId) return;
    removeByFilter(isMcpTaskNotification);
    let mcpTaskProjectDir = getMcpTaskProjectDir();
    let filtered = (
      (await listMcpTaskOutcomes(storageV5).catch(
        logFailure("could not be listed, so they wait for the next resume"),
      )) ?? []
    ).filter((outcome) => outcome.sessionId === sessionId);
    if (filtered.length === 0) return;
    let seenKeys = taskNotificationRunKeys(messages);
    let pending = [];
    let deletedCount = 0;
    for (let outcome of filtered) {
      let registryId = outcome.registryId;
      await deleteMcpTaskMetadata(registryId, storageV5, sessionId, mcpTaskProjectDir).catch(
        logFailure(`could not delete the resume record of ended task ${registryId}`),
      );
      if (seenKeys.has(`${registryId} ${outcome.runId}`)) {
        forgetMcpTaskEnding(registryId);
        await deleteTaskOutcome(registryId, storageV5, sessionId, mcpTaskProjectDir).then(
          () => {
            logDeliveryOk(outcome.code);
            deletedCount++;
          },
          logFailure(`could not delete the saved ending of task ${registryId}`),
        );
      } else if (taskRegistry.get(registryId) === undefined) pending.push(outcome);
    }
    pending.sort((a, b) => b.endedAt - a.endedAt);
    let notices = [];
    let maxMcpOutputChars = getMaxMcpOutputChars();
    let remaining = pending.length;
    for (let outcome of pending) {
      let value = formatLateNotificationPreamble(outcome);
      if (value !== undefined) {
        maxMcpOutputChars -= value.length;
        if (notices.length === MAX_RESUME_TASK_NOTIFICATIONS || (notices.length > 0 && maxMcpOutputChars < 0))
          break;
        notices.push({
          ending: outcome,
          value,
        });
      }
      remaining--;
    }
    if (getSessionId() !== sessionId) return;
    for (let [index, { ending, value }] of notices.reverse().entries()) {
      let { registryId, runId, toolUseId, code } = ending;
      logSavedEnding();
      holdMcpTaskEnding(
        registryId,
        {
          sessionId,
          runId,
          toolUseId,
        },
        (ok) =>
          void deleteTaskOutcome(
            registryId,
            storageV5,
            sessionId,
            taskProjectDirFor(sessionId, mcpTaskProjectDir),
          ).then(
            () => (ok ? logDeliveryOk : logRewindDropOk)(code),
            logFailure(`could not delete the saved ending of task ${registryId}`),
          ),
      );
      let mcpToolName = buildMcpToolName(ending.serverName, ending.toolName);
      recordToolUsed(mcpToolName);
      enqueuePendingNotification({
        value:
          remaining > 0 && index === notices.length - 1
            ? `${value} ${remaining} older saved notification(s) of finished tasks are not shown here; at most ${MAX_RESUME_TASK_NOTIFICATIONS} arrive each time this session is resumed.`
            : value,
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
      `MCP task endings: ${filtered.length} saved, ${deletedCount} already in the conversation and deleted, ${notices.length} queued for the next turn, ${filtered.length - deletedCount - notices.length} passed over`,
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-nh1pvp1m.js:71899-72027 placement
function isMcpTaskNotification(queued) {
  return (
    queued.mode === "task-notification" &&
    queued.passive === true &&
    queued.unlogged === true &&
    queued.taskId !== undefined &&
    isTaskIdOfType("mcp_task", queued.taskId)
  );
}
//@ chunk-nh1pvp1m.js:72027-72360 placement
function formatLateNotificationPreamble(outcome) {
  try {
    let { buildSep2663EndingNotice } = require("../../services/mcp/buildSep2663EndingNotice.lazy.js");
    return `${buildSep2663EndingNotice(outcome)}
This notification was written at ${new Date(outcome.endedAt).toISOString()}. It is delivered now because this session was resumed and its conversation does not contain it. If you have already seen it, ignore this copy.`;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-nh1pvp1m.js:72360-72465 placement
function taskNotificationRunKeys(messages) {
  let keys = new Set();
  for (let message of messages) {
    let runId = stickyPromptRunId(message);
    if (runId !== undefined) keys.add(`${runId} ${getTaskNotificationRunId(message)}`);
  }
  return keys;
}
//@ chunk-nh1pvp1m.js:72502-72535 placement
/**
 * 恢复会话时通知的最大年龄 2 小时，以及仅含 BRIEF_TOOL_NAME 的集合（恢复时特别处理该工具）。
 */
var RESUME_NOTIFICATION_MAX_AGE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BRIEF_TOOL_NAME_SET;
deferInit("chunk-nh1pvp1m.js:72502", () => {
  RESUME_NOTIFICATION_MAX_AGE_MS = 7200000;
  BRIEF_TOOL_NAME_SET = new Set([BRIEF_TOOL_NAME]);
});
//@ chunk-nh1pvp1m.js:72535-72569 placement
function hasNonWhitespace(text) {
  return /\S/.test(text);
}
//@ chunk-nh1pvp1m.js:72569-72670 placement
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
//@ chunk-nh1pvp1m.js:72670-72734 placement
function isRealAssistantReply(message) {
  return !message.isApiErrorMessage && message.message.model !== SYNTHETIC_MODEL;
}
export {
  loadMcpTaskModule,
  supersedesMessage,
  logBridgeDialogKindsDeclared,
  isMarkerTextDelta,
  BRIEF_TOOL_NAME_SET,
  isRealAssistantReply,
  hasNonWhitespace,
  RESUME_NOTIFICATION_MAX_AGE_MS,
};
