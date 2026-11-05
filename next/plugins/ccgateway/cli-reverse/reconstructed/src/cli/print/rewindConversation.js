/**
 * cli/print/rewindConversation.ts
 *
 * 2.1.316 新增：对话回退（定位回退点、截断、停止队友、持久化判定）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (33)
 * attribution: placement 33
 */
import { join } from "path";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import {
  findRewindTarget,
  checkRewindKeptRows,
  findStandInTarget,
  standInSourceUuid,
} from "./rewindStandIn.js";
import { isAwaitingToolResultAnchor, findPersistAnchor } from "./applyFlagSettings.js";
import {
  UUID_PREFIX_LENGTH,
  isUserPromptAt,
  getContentText,
  isReorderedRow,
  computeThinkingStrippedScope,
} from "../../utils/messages.js";
import { getMessageIdentityUuids, getDroppedPromptUuids } from "../queuedCommands.js";
import { isPollEventToolResultRow, hasPollEventsAttachmentSince } from "../../utils/pollEvents.js";
import { hasCronToolUse, collectReadNotificationsResultIds } from "./rateLimitForwarding.js";
import { countWhere } from "../../utils/collections.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isLoggableMessage, isChainParticipant } from "../../utils/sessionStorage.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { isAbortError, withTelemetryMessage, toError } from "../../utils/errors.js";
import { noopLedger } from "../../services/api/promptPrefixLedger.js";
import { cronCarryAttachment } from "../../services/compact/compactCarry.js";
import { threadAskMarkerFor } from "../../services/projects/threadTranscript.js";
import { collectRewoundFileTrackingPaths } from "../../utils/queryHelpers.js";
import { resetPickerState } from "../../memdir/findRelevantMemories.js";
import { markMemoryWriteCut } from "../../services/accountMemory/memoryContext.js";
import { setLastCacheSafeForkMessages } from "../../utils/forkedAgent.js";
import { restoreReadsAfterRewind } from "../../services/queuedNotifications/queuedNotifications.js";
import { logHandlerFailure } from "./dispatchControlRequest.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { isUnnotifiedTerminalTask } from "./backgroundWindDown.js";
import { claimTaskNotification } from "../../utils/task/framework.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { lookupTaskForStop } from "../../utils/swarm/teammateAddressLookup.js";
import { logError } from "../../utils/log.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_FALLOW_LANTERN, retryWatchdogEnv } from "../../services/api/withRetry.js";
import { isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isLowPriorityActive } from "../../services/lowPriority/lowPriorityMode.js";
import { env } from "../../utils/env.js";
import { getBareCheckModel } from "../../utils/model/smallFastModel.js";
import { preflightRateLimitCore } from "../../services/api/rateLimitPreflight.js";
import { sleep } from "../../utils/sleep.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { sessionIdBody, isSafeBridgeId } from "../../bridge/sessionIdCompat.js";

//@ chunk-0yw3taqg.js:617671-619851 placement
/**
 * 在对话中定位 rewind 目标（用户消息或可选的 assistant/已压缩目标），返回切点或拒绝原因。
 */
function findRewindPoint(
  messages,
  targetUuid,
  lastSeenUserMessageUuid,
  { rowsOffDisk, allowSummarizedTarget = false, allowAssistantTarget = false } = {},
) {
  if (rowsOffDisk !== undefined) {
    let rewindPoint = findRewindPoint(messages, targetUuid, lastSeenUserMessageUuid, {
      allowSummarizedTarget,
      allowAssistantTarget,
    });
    if ("cut" in rewindPoint && isRewindCutPersistable(messages, rewindPoint.cut, rowsOffDisk))
      return rewindPoint;
    let lastIndex = messages.findLastIndex(isCompactBoundaryMessage);
    let slicedPoint =
      lastIndex > 0
        ? findRewindPoint(messages.slice(lastIndex), targetUuid, lastSeenUserMessageUuid, {
            allowSummarizedTarget,
          })
        : undefined;
    if (slicedPoint !== undefined && "cut" in slicedPoint) {
      let shiftedCut = {
        ...slicedPoint.cut,
        index: slicedPoint.cut.index + lastIndex,
      };
      if (isRewindCutPersistable(messages, shiftedCut, rowsOffDisk))
        return {
          cut: shiftedCut,
        };
    }
    if ("refuse" in rewindPoint) return rewindPoint;
    let missReason = [rewindPoint, slicedPoint].some(
      (point) => point !== undefined && "cut" in point && point.cut.resolution !== undefined,
    )
      ? "cut_rows_not_on_disk"
      : !rewindPoint.cut.assistantTarget && slicedPoint !== undefined && "refuse" in slicedPoint
        ? slicedPoint.summarizedTargetMiss
        : undefined;
    return {
      refuse: "target_not_found",
      ...(missReason !== undefined && {
        summarizedTargetMiss: missReason,
      }),
      ...(rewindPoint.cut.assistantTarget && {
        assistantTarget: true,
      }),
    };
  }
  let rewindTarget = findRewindTarget(messages, targetUuid, {
    allowAssistantTarget,
  });
  let targetIsAssistant = rewindTarget !== null && messages[rewindTarget.index]?.type === "assistant";
  let point =
    targetIsAssistant && !isAwaitingToolResultAnchor(messages, rewindTarget.index) ? null : rewindTarget;
  let assistantTarget = targetIsAssistant && point !== null;
  let keptRowsCheck =
    point === null && allowSummarizedTarget ? checkRewindKeptRows(messages, targetUuid) : undefined;
  let summarizedResolution =
    keptRowsCheck !== undefined && "index" in keptRowsCheck ? keptRowsCheck : undefined;
  let target =
    summarizedResolution !== undefined
      ? {
          ...summarizedResolution,
          prefillText: null,
        }
      : (point ?? findStandInTarget(messages, targetUuid));
  let targetIndex = target ? target.index : -1;
  let lastSeenPrefix =
    typeof lastSeenUserMessageUuid === "string" ? lastSeenUserMessageUuid.slice(0, UUID_PREFIX_LENGTH) : null;
  let matchesLastSeen = (message, prefix) =>
    prefix !== null &&
    getMessageIdentityUuids(message).some((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === prefix);
  let index = messages.findIndex((message) => matchesLastSeen(message, lastSeenPrefix));
  let lastSeenIndex =
    index >= 0
      ? index
      : messages.findIndex((message) =>
          getDroppedPromptUuids(message).some((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === lastSeenPrefix),
        );
  let filtered = messages.filter(
    (message, index) =>
      index > targetIndex &&
      index > lastSeenIndex &&
      !matchesLastSeen(message, lastSeenPrefix) &&
      !matchesLastSeen(message, targetUuid.slice(0, UUID_PREFIX_LENGTH)) &&
      isUserPromptAt(messages, index, lastSeenPrefix !== null),
  );
  let indexByPrefix = filtered.length > 0 ? indexByUuidPrefix(messages, lastSeenIndex) : undefined;
  let unseenLaterTurn =
    indexByPrefix !== undefined && filtered.some((message) => !hasMatchingPrefill(indexByPrefix, message));
  if (targetIndex < 0)
    return {
      refuse: "target_not_found",
      ...(keptRowsCheck !== undefined &&
        "miss" in keptRowsCheck && {
          summarizedTargetMiss: keptRowsCheck.miss,
        }),
    };
  if (unseenLaterTurn)
    return rewindRefusal_2(
      lastSeenPrefix === null ? "stale_target" : "unseen_later_turn",
      summarizedResolution !== undefined,
      assistantTarget,
    );
  if (isPollEventToolResultRow(messages, targetIndex))
    return rewindRefusal_2("poll_tool_result_target", summarizedResolution !== undefined);
  if (hasCronToolUse(messages, targetIndex))
    return rewindRefusal_2("target_splits_tool_call", summarizedResolution !== undefined, assistantTarget);
  if (hasPollEventsAttachmentSince(messages, targetIndex))
    return rewindRefusal_2(
      "delivered_poll_events_in_range",
      summarizedResolution !== undefined,
      assistantTarget,
    );
  let targetMessage = messages[targetIndex];
  let prefillText =
    point?.wordsNotKept || standInSourceUuid(targetMessage) !== undefined
      ? null
      : (target?.prefillText ?? "");
  let { persistAnchor, precedingAssistantUuid } = findPersistAnchor(messages, targetIndex);
  if (summarizedResolution !== undefined && persistAnchor !== summarizedResolution.anchorUuid)
    return {
      refuse: "target_not_found",
      summarizedTargetMiss: "anchor_not_as_placed",
    };
  return {
    cut: {
      index: targetIndex,
      target: targetMessage,
      echoUuid: target?.uuid ?? targetUuid,
      prefillText,
      persistAnchor,
      precedingAssistantUuid: summarizedResolution !== undefined ? null : precedingAssistantUuid,
      ...(summarizedResolution !== undefined && {
        resolution: "after_summary",
        keptRows: summarizedResolution.keptRows,
      }),
      ...(assistantTarget && {
        assistantTarget: true,
      }),
    },
  };
}
//@ chunk-0yw3taqg.js:619851-619961 placement
function indexByUuidPrefix(messages, fromIndex) {
  let index = new Map();
  for (let cursor = fromIndex; cursor >= 0; cursor--)
    for (let uuid of getMessageIdentityUuids(messages[cursor]))
      index.set(uuid.slice(0, UUID_PREFIX_LENGTH), messages[cursor]);
  return index;
}
//@ chunk-0yw3taqg.js:619961-620148 placement
function hasMatchingPrefill(index, message) {
  let candidatePrefill = rewindPrefillText(message);
  return getMessageIdentityUuids(message).some((uuid) => {
    let indexedMessage = index.get(uuid.slice(0, UUID_PREFIX_LENGTH));
    let indexedPrefill = indexedMessage === undefined ? undefined : rewindPrefillText(indexedMessage);
    return (
      candidatePrefill !== undefined &&
      indexedPrefill !== undefined &&
      indexedPrefill.text === candidatePrefill.text &&
      indexedPrefill.otherBlocks === candidatePrefill.otherBlocks
    );
  });
}
//@ chunk-0yw3taqg.js:620148-620440 placement (2.1.88 match: buildTranscriptEntries, 0.766)
function rewindPrefillText(row) {
  let content =
    row.type === "user"
      ? row.message.content
      : row.type === "attachment" && row.attachment.type === "queued_command"
        ? row.attachment.prompt
        : undefined;
  let text = content === undefined ? undefined : getContentText(content)?.trim();
  if (content === undefined || text === undefined || text === "") return;
  return {
    text,
    otherBlocks: typeof content === "string" ? 0 : countWhere(content, (block) => block.type !== "text"),
  };
}
//@ chunk-0yw3taqg.js:620440-620592 placement
function rewindRefusal_2(reason, summarized, assistantTarget = false) {
  return summarized
    ? {
        refuse: reason === "target_splits_tool_call" ? "target_not_found" : reason,
        summarizedTargetMiss: reason,
      }
    : {
        refuse: reason,
        ...(assistantTarget && {
          assistantTarget: true,
        }),
      };
}
//@ chunk-0yw3taqg.js:620592-621150 placement
function reportRewindRefusal(point, outcome) {
  if ("refuse" in point) {
    if (point.summarizedTargetMiss !== undefined)
      logFeatureSad("rewind_summarized_target", point.summarizedTargetMiss);
    if (point.assistantTarget) logFeatureSad("rewind_assistant_target", point.refuse);
  } else if (point.cut.assistantTarget) {
    if (outcome === "rewound") logFeatureOk("rewind_assistant_target");
    else logFeatureSad("rewind_assistant_target", outcome);
  } else if (point.cut.resolution !== undefined) {
    if (outcome === "rewound")
      logFeatureOk("rewind_summarized_target", {
        kept_rows: point.cut.keptRows ?? 0,
      });
    else logFeatureSad("rewind_summarized_target", outcome);
  } else if (outcome === "rewound" && standInSourceUuid(point.cut.target) !== undefined) {
    logFeatureOk("rewind_stand_in_served");
    logForDiagnosticsNoPII("info", "cli_rewind_stand_in_served");
  }
}
//@ chunk-0yw3taqg.js:621150-621778 placement
function isRewindCutPersistable(messages, target, rowsOffDisk) {
  if (rowsOffDisk === undefined) return true;
  let indexes = [];
  let lastIndex = messages.findLastIndex(
    (message, index) =>
      index < target.index &&
      isLoggableMessage(message) &&
      isChainParticipant(message) &&
      !isReorderedRow(message.uuid),
  );
  if (lastIndex >= 0) indexes.push(lastIndex);
  let persistAnchor = target.persistAnchor;
  let anchorIndex =
    persistAnchor === null
      ? -1
      : messages.findLastIndex((message, index) => index < target.index && message.uuid === persistAnchor);
  if (anchorIndex >= 0) indexes.push(anchorIndex);
  let endIndex = anchorIndex >= 0 ? anchorIndex : target.index;
  let max = Math.max(
    0,
    messages.findLastIndex(
      (message, index) => index <= endIndex && index < target.index && isCompactBoundaryMessage(message),
    ),
  );
  let max_2 = Math.max(0, messages.findLastIndex(isCompactBoundaryMessage));
  for (let index = max; index < Math.min(target.index, max_2); index++) indexes.push(index);
  if (indexes.some((index) => rowsOffDisk.deleted.has(messages[index].uuid))) return false;
  if (!rowsOffDisk.rewriting || indexes.length === 0) return true;
  let { lastBoundary } = rowsOffDisk;
  let lastBoundaryIndex =
    lastBoundary === undefined
      ? messages.findLastIndex(isCompactBoundaryMessage)
      : messages.findLastIndex((message) => message.uuid === lastBoundary);
  if (lastBoundary !== undefined && lastBoundaryIndex < 0) return false;
  return indexes.every((index) => index >= lastBoundaryIndex);
}
//@ chunk-0yw3taqg.js:621778-621852 placement
function queueStamp(session) {
  return {
    dequeues: session.dequeueCount(),
    length: session.messages.length,
  };
}
//@ chunk-0yw3taqg.js:621852-622346 placement
async function persistRewindCut({ persistAnchor, target }, session, persistence) {
  let persisted = true;
  let marker = {
    rewound: true,
    ...(target !== undefined &&
      isFoamySpringEnabled() && {
        cutUuid: target.uuid,
      }),
  };
  try {
    await persistence.mirror(persistAnchor, marker);
    await persistence.flushInternalEvents();
    await persistence.persistLocal(persistAnchor, marker);
  } catch (error) {
    persisted = false;
    persistence.logFailure("persist", error);
  }
  if (!persisted)
    try {
      let last = session.messages.findLast(
        (message) =>
          (message.type === "user" || message.type === "assistant") && !isReorderedRow(message.uuid),
      );
      if (last !== undefined) {
        await persistence.mirror(last.uuid, undefined);
        await persistence.flushInternalEvents();
      }
    } catch {
      logForDebugging("rewind persist-failure remote heal failed (persistence already degraded)");
    }
  return persisted;
}
//@ chunk-0yw3taqg.js:622346-622514 placement
function rewindTargetMoved(prefix, session, target) {
  return (
    session.messages[target.index]?.uuid !== target.target?.uuid ||
    session.dequeueCount() !== prefix.dequeues ||
    session.messages.length !== prefix.length ||
    session.drainableMainThreadQueueLength() > 0
  );
}
//@ chunk-0yw3taqg.js:622514-622955 placement
async function waitForRewindQuiet(session, persistence) {
  try {
    for (let j = 0; j < 3; j++) {
      let dequeues = session.dequeueCount();
      let length = session.messages.length;
      let last = session.messages.findLast(
        (message) =>
          (message.type === "user" || message.type === "assistant") && !isReorderedRow(message.uuid),
      );
      if (last === undefined) break;
      await persistence.persistLocal(last.uuid, undefined);
      await persistence.mirror(last.uuid, undefined);
      await persistence.flushInternalEvents();
      if (session.dequeueCount() === dequeues && session.messages.length === length) break;
    }
  } catch (error) {
    if (isAbortError(error)) logForDebugging("rewind-refusal heal aborted by stream teardown");
    else persistence.logFailure("heal", error);
  }
}
//@ chunk-0yw3taqg.js:622955-623858 placement
/**
 * 在内存中截断对话到切点，清理 thinking 范围与粘性 beta，并同步通知/任务状态。
 */
function applyRewindCut(session, index) {
  let removed = session.messages.splice(index);
  noopLedger(session.stickyBetas(), "rewind");
  try {
    let strippedScope = session.messages.some((message) => message.type === "assistant")
      ? computeThinkingStrippedScope(session.messages, removed)
      : undefined;
    if (strippedScope !== undefined) session.appendToConversation([createAttachmentMessage(strippedScope)]);
    if (
      session.messages.some((message) => message.type === "assistant") &&
      removed.some(
        (message) => message.type === "attachment" && message.attachment.type === "advisor_stripped",
      )
    )
      session.appendToConversation([
        createAttachmentMessage({
          type: "advisor_stripped",
        }),
      ]);
  } catch (error) {
    session.logFailure("strip", error);
  }
  try {
    let carryAttachment = cronCarryAttachment(session.messages, removed);
    if (carryAttachment !== null) session.appendToConversation([carryAttachment]);
  } catch (error) {
    session.logFailure("crons", error);
  }
  try {
    let threadAskMarker = threadAskMarkerFor(session.messages);
    if (threadAskMarker !== null) session.appendToConversation([createAttachmentMessage(threadAskMarker)]);
  } catch (error) {
    session.logFailure("thread_ask", error);
  }
  try {
    let rewoundFileTrackingPaths = collectRewoundFileTrackingPaths(removed, undefined, session.toolAliases);
    for (let readFilePath of rewoundFileTrackingPaths.readFilePaths.concat(
      rewoundFileTrackingPaths.nestedMemoryPaths,
      rewoundFileTrackingPaths.spelledFilePaths,
    ))
      session.readFileState.delete(readFilePath);
  } catch (error) {
    session.logFailure("evict", error);
  }
  resetPickerState(session.memorySelector);
  try {
    markMemoryWriteCut(session.host, removed);
  } catch (error) {
    session.logFailure("memory_cut_note", error);
  }
  setLastCacheSafeForkMessages([...session.messages]);
  return removed;
}
//@ chunk-0yw3taqg.js:623858-624040 placement
function rewindReadNotifications(host, { kept, removed, targetUuid }) {
  try {
    restoreReadsAfterRewind(host, {
      idsInKeptRows: () => collectReadNotificationsResultIds(kept),
      idsInRemovedRows: () => collectReadNotificationsResultIds(removed),
      targetUuid,
    });
  } catch (error) {
    logHandlerFailure(true, "rewind_conversation: notifications", error);
  }
}
//@ chunk-0yw3taqg.js:624040-625128 placement
function stopTeammatesAfterCut({ taskRegistry, setAppState, storageV5, messages, cutIndex }) {
  let tasksById = taskRegistry.all();
  let teammatesById = new Map();
  for (let task of Object.values(tasksById))
    if (task.type === "in_process_teammate") {
      teammatesById.set(task.identity.agentId, task);
      if (task.identity.resumableAgentId !== undefined)
        teammatesById.set(task.identity.resumableAgentId, task);
    }
  let shouldStop = (task) => {
    let seenAgentIds = new Set();
    let current = task;
    let ownedByTeam = false;
    for (;;) {
      let ownerId =
        "parentAgentId" in current && typeof current.parentAgentId === "string"
          ? current.parentAgentId
          : "ownerAgentId" in current && typeof current.ownerAgentId === "string"
            ? current.ownerAgentId
            : undefined;
      if (ownerId === undefined || seenAgentIds.has(ownerId)) {
        if (
          ownerId === undefined &&
          "spawnerAgentId" in current &&
          typeof current.spawnerAgentId === "string" &&
          teammatesById.has(current.spawnerAgentId)
        )
          ownedByTeam = true;
        break;
      }
      seenAgentIds.add(ownerId);
      let owner = tasksById[ownerId] ?? teammatesById.get(ownerId);
      if (owner === undefined) break;
      if (owner.type === "in_process_teammate") {
        ownedByTeam = true;
        break;
      }
      if (owner.type !== "local_agent") break;
      current = owner;
    }
    if (ownedByTeam) return false;
    let toolUseId = current.toolUseId;
    if (toolUseId === undefined) return true;
    let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, toolUseId);
    return messageIndexByToolUseId < 0 || messageIndexByToolUseId >= cutIndex;
  };
  stopAllRunningTasks({
    taskRegistry,
    setAppState,
    shouldStop,
    storageV5,
  });
  for (let task of Object.values(taskRegistry.all())) {
    if (!isUnnotifiedTerminalTask(task) || !shouldStop(task)) continue;
    claimTaskNotification(task.id, taskRegistry);
    emitTaskNotification(
      task.id,
      task.status === "completed" || task.status === "failed" ? task.status : "stopped",
      {
        toolUseId: task.toolUseId,
        summary: task.description,
      },
    );
  }
}
//@ chunk-0yw3taqg.js:625128-625501 placement
function stopMcpTasksAfterCut({ taskRegistry, setAppState, storageV5, messages, cutIndex }) {
  try {
    let runningTasks = runningMcpTasksAfter(taskRegistry, messages, cutIndex);
    if (runningTasks.length === 0) return;
    let mapped = runningTasks.map(async (task) => {
      let taskForStop = lookupTaskForStop("mcp_task");
      if (taskForStop === undefined) throw Error("no kill handler is registered for task type mcp_task");
      await taskForStop.kill(task, taskRegistry, setAppState, "system", storageV5);
    });
    Promise.allSettled(mapped).then(reportMcpTaskRewindStops);
  } catch (error) {
    reportMcpTaskRewindStops(
      [
        {
          status: "rejected",
          reason: error,
        },
      ],
      "choose_failed",
    );
  }
}
//@ chunk-0yw3taqg.js:625501-625901 placement
function withdrawDeferredAfterCut({ endings, queue, messages, cutIndex }) {
  try {
    let withdrawnTaskIds = new Set(
      endings?.withdraw((taskId) => {
        let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, taskId);
        return messageIndexByToolUseId >= 0 && messageIndexByToolUseId >= cutIndex;
      }),
    );
    if (withdrawnTaskIds.size > 0)
      queue.removeByFilter(
        (message) =>
          message.mode === "task-notification" &&
          message.taskId !== undefined &&
          withdrawnTaskIds.has(message.taskId),
        {
          reason: "rewound",
        },
      );
  } catch (error) {
    logFeatureBad("mcp_task_rewind_drop", "drop_failed");
    logError(
      withTelemetryMessage(
        toError(error),
        "rewind_conversation: withdrawing the saved endings of MCP tasks failed; the rewind went on",
      ),
    );
  }
}
//@ chunk-0yw3taqg.js:625901-626114 placement
function runningMcpTasksAfter(taskRegistry, messages, cutIndex) {
  let taskIds = [];
  for (let task of Object.values(taskRegistry.all())) {
    if (
      task.type !== "mcp_task" ||
      task.status !== "running" ||
      task.notified ||
      task.toolUseId === undefined
    )
      continue;
    let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, task.toolUseId);
    if (messageIndexByToolUseId >= 0 && messageIndexByToolUseId >= cutIndex) taskIds.push(task.id);
  }
  return taskIds;
}
//@ chunk-0yw3taqg.js:626114-626272 placement
function findMessageIndexByToolUseId(messages, targetToolUseId) {
  return messages.findIndex(
    (message) =>
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (contentBlock) => contentBlock?.type === "tool_use" && contentBlock.id === targetToolUseId,
      ),
  );
}
//@ chunk-0yw3taqg.js:626272-626719 placement
function reportMcpTaskRewindStops(settled, failureReason = "stop_failed") {
  try {
    let filtered = settled.filter((result) => result.status === "rejected");
    if (filtered.length === 0) {
      logFeatureOk("mcp_task_rewind_stop");
      return;
    }
    if (filtered.length === settled.length) logFeatureBad("mcp_task_rewind_stop", failureReason);
    else logFeatureSad("mcp_task_rewind_stop", failureReason);
    for (let { reason } of filtered)
      logError(
        withTelemetryMessage(
          toError(reason),
          failureReason === "choose_failed"
            ? "rewind_conversation: choosing the MCP tasks to stop failed; none was stopped and the rewind went on"
            : "rewind_conversation: stopping an MCP task failed; the rewind went on",
        ),
      );
  } catch {}
}
//@ chunk-0yw3taqg.js:626719-626759 placement
function rewindRerunMode() {
  return isClaudeAiChatRemote() ? getRemoteFeatureGateState(TENGU_FALLOW_LANTERN) : "off";
}
//@ chunk-0yw3taqg.js:626759-627148 placement
function dropOwnRerunOnRewind(queue) {
  try {
    let queued = queue.messageQueue.getCommandQueueSnapshot().filter(isResumedQueuedCommand);
    if (queued.length === 0 || !isClaudeAiChatRemote()) return;
    let verdict = rerunDropVerdict(queue, queued);
    if (verdict !== undefined) {
      logFeatureSad("rewind_drops_own_rerun", verdict);
      return;
    }
    for (let { uuid } of queue.messageQueue.removeByFilter(isResumedQueuedCommand, {
      reason: "rewound",
    }))
      if (uuid !== undefined) queue.io.onCommandLifecycle?.(uuid, "cancelled");
    logFeatureOk("rewind_drops_own_rerun");
  } catch (error) {
    queue.logFailure(error);
    logFeatureBad("rewind_drops_own_rerun", "threw");
  }
}
//@ chunk-0yw3taqg.js:627148-627709 placement
function rerunDropVerdict({ messageQueue, readSwitch, namedByTheRequest, decide }, queued) {
  if (!queued.every((queued) => queued.mode === "prompt")) return "not_a_prompt";
  let mapped = queued.map((queued) => queued.resumedTurnUserMessageUuid);
  if (mapped.includes(undefined)) return "opener_unknown";
  let mapped_2 = namedByTheRequest.map((message) =>
    typeof message === "string" ? message.slice(0, UUID_PREFIX_LENGTH) : undefined,
  );
  if (!mapped.every((openerUuid) => mapped_2.includes(openerUuid?.slice(0, UUID_PREFIX_LENGTH))))
    return "turn_unseen";
  if (queued.some((queued) => queued.drainOnly === true)) return "answers_for_others";
  if (messageQueue.getDrainableMainThreadQueueLength() !== queued.length) return "others_queued";
  if (!("cut" in decide())) return "no_cut";
  let switchState = readSwitch();
  return switchState === "on" ? undefined : `switch_${switchState}`;
}
//@ chunk-0yw3taqg.js:627709-627762 placement
function isResumedQueuedCommand(command) {
  return command.resumeReason !== undefined && isDrainableMainThreadCommand(command);
}
//@ chunk-0yw3taqg.js:627762-627803 placement
var TENGU_EBBING_TIDE = "tengu_ebbing_tide";
var REWIND_QUIET_WAIT_MS = 5000;
var REWIND_QUIET_POLL_MS = 20;
//@ chunk-0yw3taqg.js:627803-628036 placement
function isTurnAbortedForRewind({ drain, messageQueue, prewaitLatch }) {
  if (drain.turnUnderWay) return drain.abortController?.signal.aborted === true;
  return (
    prewaitLatch.parkedBatchStartsAborted() ||
    prewaitLatch
      .parkedMembers()
      .every((command) => command.uuid !== undefined && messageQueue.hasCancelPendingAcked(command.uuid))
  );
}
//@ chunk-0yw3taqg.js:628036-628578 placement
function rewindLimitQuestionGate(host) {
  if (host.promptUpOrHeld()) return "skipped_prompt";
  if (host.busy()) return "skipped_busy";
  let runGoing = host.runGoing();
  if (runGoing && !host.interruptAsked) return "skipped_busy";
  let overEndingRun = runGoing && host.dequeues() > 0;
  if (overEndingRun) {
    if (!host.runEnding()) return "skipped_busy";
    let remoteFeatureGateState = getRemoteFeatureGateState(TENGU_EBBING_TIDE);
    if (remoteFeatureGateState !== "on")
      return remoteFeatureGateState === "cold" ? "skipped_busy_flags_not_fetched" : "skipped_busy";
  }
  let decision = host.decide();
  if ("cut" in decision)
    return decision.cut.index < host.rowCount()
      ? {
          targetFound: true,
          overAnEndingRun: overEndingRun,
        }
      : "skipped_no_cut";
  return decision.refuse === "target_not_found" && host.missingTargetAsked
    ? {
        targetFound: false,
        overAnEndingRun: overEndingRun,
      }
    : "skipped_no_cut";
}
//@ chunk-0yw3taqg.js:628578-628840 placement
function rewindLimitAccountGate() {
  if (!isClaudeAISubscriber() || getAPIProvider() !== "firstParty") return "skipped_account";
  if (isLowPriorityActive()) return "skipped_low_priority";
  return retryWatchdogEnv() &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS === undefined &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS === undefined
    ? "skipped_retry_watchdog"
    : null;
}
//@ chunk-0yw3taqg.js:628840-628960 placement
async function askRewindLimitQuestion(host) {
  try {
    return await runRewindLimitQuestion(host);
  } catch (error) {
    host.logFailure(error);
    logFeatureSad("rewind_limit_question", "threw");
    return "go_on";
  }
}
//@ chunk-0yw3taqg.js:628960-630172 placement
async function runRewindLimitQuestion(host) {
  let fields = {
    process_has_dequeued: host.dequeues() > 0,
    after_interrupt_branch: host.afterTheInterruptBranch,
    prompt_cache_relay_armed: env.CCR_SESSION_PROFILE,
  };
  let gate = rewindLimitQuestionGate(host);
  if (typeof gate === "string") {
    logFeatureSad("rewind_limit_question", gate, fields);
    return "go_on";
  }
  let dequeues = host.dequeues();
  let accountGate = rewindLimitAccountGate();
  if (accountGate !== null) {
    logFeatureSad("rewind_limit_question", accountGate, fields);
    return "go_on";
  }
  let bareCheckModel = getBareCheckModel();
  let check = await preflightRateLimitCore({
    model: bareCheckModel,
    credentials: host.credentials,
    storageV5: host.storageV5,
    stop: host.stop,
    logFailure: host.logFailure,
  });
  let reportFields = {
    ...fields,
    waited_ms: check.waitedMs,
    asked_main_model: bareCheckModel === host.mainModel(),
    target_found: gate.targetFound,
  };
  if (host.ending()) {
    logFeatureSad("rewind_limit_question", "stopped", reportFields);
    return "ending";
  }
  if (check.answer === "admitted") {
    logFeatureOk("rewind_limit_question", {
      ...reportFields,
      refused: false,
    });
    return "go_on";
  }
  if (check.answer !== "refused") {
    logFeatureSad("rewind_limit_question", check.answer, reportFields);
    return "go_on";
  }
  if (gate.overAnEndingRun && !(await waitForQueueQuiet(host, dequeues))) {
    logFeatureSad("rewind_limit_question", "run_outlasted_wait", reportFields);
    return "turn_running";
  }
  if (host.ending()) {
    logFeatureSad("rewind_limit_question", "stopped", reportFields);
    return "ending";
  }
  let gateAfterWait = rewindLimitQuestionGate(host);
  if (
    typeof gateAfterWait === "string" ||
    gateAfterWait.overAnEndingRun ||
    (gate.targetFound && !gateAfterWait.targetFound)
  ) {
    logFeatureSad("rewind_limit_question", "changed_in_wait", reportFields);
    return "go_on";
  }
  logFeatureOk("rewind_limit_question", {
    ...reportFields,
    refused: true,
    target_found: gateAfterWait.targetFound,
  });
  return {
    report: check.report,
    targetFound: gateAfterWait.targetFound,
  };
}
//@ chunk-0yw3taqg.js:630172-630353 placement
async function waitForQueueQuiet(host, dequeues) {
  let deadline = performance.now() + REWIND_QUIET_WAIT_MS;
  let isQuiet = () =>
    !host.runWaitable() || host.dequeues() !== dequeues || host.ending() || host.stop.aborted;
  while (!isQuiet() && performance.now() < deadline) await sleep(REWIND_QUIET_POLL_MS, host.stop);
  return isQuiet();
}
//@ chunk-0yw3taqg.js:630538-630598 placement
function forkSeedsDir() {
  return join(getClaudeConfigDir(), "remote-control", "fork-seeds");
}
//@ chunk-0yw3taqg.js:630598-630622 placement
var FORK_SEED_MAX_BYTES = 268435456;
var FORK_SEED_UNLINK_RETRY_MS = 100;
//@ chunk-0yw3taqg.js:630622-630688 placement (2.1.88 match: NATIVE_HOST_MANIFEST_NAME, 1)
function forkSeedPath(sessionId) {
  let body = sessionIdBody(sessionId);
  return isSafeBridgeId(body) ? join(forkSeedsDir(), `${body}.json`) : null;
}
export {
  findRewindPoint,
  rewindRerunMode,
  dropOwnRerunOnRewind,
  askRewindLimitQuestion,
  isTurnAbortedForRewind,
  reportRewindRefusal,
  stopTeammatesAfterCut,
  queueStamp,
  persistRewindCut,
  rewindTargetMoved,
  isRewindCutPersistable,
  waitForRewindQuiet,
  stopMcpTasksAfterCut,
  withdrawDeferredAfterCut,
  applyRewindCut,
  rewindReadNotifications,
  FORK_SEED_MAX_BYTES,
  forkSeedPath,
  forkSeedsDir,
  FORK_SEED_UNLINK_RETRY_MS,
};
