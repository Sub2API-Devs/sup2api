/**
 * cli/print/rewindConversation.ts
 *
 * 2.1.316 新增：对话回退（定位回退点、截断、停止队友、持久化判定）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (33)
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
import { countToolCallsSince, hasPollEventsAttachmentSince } from "../../utils/pollEvents.js";
import { hasCronToolUse, collectReadNotificationsResultIds } from "./rateLimitForwarding.js";
import { count } from "../../utils/collections.js";
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
import { isActiveMainAgentCommand } from "../../utils/messageQueueManager.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isLowPriorityActive } from "../../services/lowPriority/lowPriorityMode.js";
import { env } from "../../utils/env.js";
import { getBareCheckModel } from "../../utils/model/smallFastModel.js";
import { preflightRateLimitCore } from "../../services/api/rateLimitPreflight.js";
import { sleep } from "../../utils/sleep.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { sessionIdBody, isSafeBridgeId } from "../../bridge/sessionIdCompat.js";

//@ chunk-tyg7f3ek.js:575930-578104 placement
/**
 * 在对话中定位 rewind 目标（用户消息或可选的 assistant/已压缩目标），返回切点或拒绝原因。
 */
function findRewindPoint(
  messages,
  targetMessageUuid,
  lastSeenUserMessageUuid,
  { rowsOffDisk: s, allowSummarizedTarget: h = false, allowAssistantTarget: y = false } = {},
) {
  if (s !== undefined) {
    let rewindPoint = findRewindPoint(messages, targetMessageUuid, lastSeenUserMessageUuid, {
      allowSummarizedTarget: h,
      allowAssistantTarget: y,
    });
    if ("cut" in rewindPoint && isRewindCutPersistable(messages, rewindPoint.cut, s)) return rewindPoint;
    let lastIndex = messages.findLastIndex(isCompactBoundaryMessage);
    let We =
      lastIndex > 0
        ? findRewindPoint(messages.slice(lastIndex), targetMessageUuid, lastSeenUserMessageUuid, {
            allowSummarizedTarget: h,
          })
        : undefined;
    if (We !== undefined && "cut" in We) {
      let Lt = {
        ...We.cut,
        index: We.cut.index + lastIndex,
      };
      if (isRewindCutPersistable(messages, Lt, s))
        return {
          cut: Lt,
        };
    }
    if ("refuse" in rewindPoint) return rewindPoint;
    let wt = [rewindPoint, We].some(
      (Lt) => Lt !== undefined && "cut" in Lt && Lt.cut.resolution !== undefined,
    )
      ? "cut_rows_not_on_disk"
      : !rewindPoint.cut.assistantTarget && We !== undefined && "refuse" in We
        ? We.summarizedTargetMiss
        : undefined;
    return {
      refuse: "target_not_found",
      ...(wt !== undefined && {
        summarizedTargetMiss: wt,
      }),
      ...(rewindPoint.cut.assistantTarget && {
        assistantTarget: true,
      }),
    };
  }
  let rewindTarget = findRewindTarget(messages, targetMessageUuid, {
    allowAssistantTarget: y,
  });
  let R = rewindTarget !== null && messages[rewindTarget.index]?.type === "assistant";
  let w = R && !isAwaitingToolResultAnchor(messages, rewindTarget.index) ? null : rewindTarget;
  let P = R && w !== null;
  let L = w === null && h ? checkRewindKeptRows(messages, targetMessageUuid) : undefined;
  let q = L !== undefined && "index" in L ? L : undefined;
  let x =
    q !== undefined
      ? {
          ...q,
          prefillText: null,
        }
      : (w ?? findStandInTarget(messages, targetMessageUuid));
  let G = x ? x.index : -1;
  let Z =
    typeof lastSeenUserMessageUuid === "string" ? lastSeenUserMessageUuid.slice(0, UUID_PREFIX_LENGTH) : null;
  let re = (He, Xe) =>
    Xe !== null && getMessageIdentityUuids(He).some((We) => We.slice(0, UUID_PREFIX_LENGTH) === Xe);
  let index = messages.findIndex((He) => re(He, Z));
  let Ue =
    index >= 0
      ? index
      : messages.findIndex((He) =>
          getDroppedPromptUuids(He).some((Xe) => Xe.slice(0, UUID_PREFIX_LENGTH) === Z),
        );
  let filtered = messages.filter(
    (He, Xe) =>
      Xe > G &&
      Xe > Ue &&
      !re(He, Z) &&
      !re(He, targetMessageUuid.slice(0, UUID_PREFIX_LENGTH)) &&
      isUserPromptAt(messages, Xe, Z !== null),
  );
  let nt = filtered.length > 0 ? indexByUuidPrefix(messages, Ue) : undefined;
  let ie = nt !== undefined && filtered.some((He) => !hasMatchingPrefill(nt, He));
  if (G < 0)
    return {
      refuse: "target_not_found",
      ...(L !== undefined &&
        "miss" in L && {
          summarizedTargetMiss: L.miss,
        }),
    };
  if (ie) return rewindRefusal_2(Z === null ? "stale_target" : "unseen_later_turn", q !== undefined, P);
  if (countToolCallsSince(messages, G)) return rewindRefusal_2("poll_tool_result_target", q !== undefined);
  if (hasCronToolUse(messages, G)) return rewindRefusal_2("target_splits_tool_call", q !== undefined, P);
  if (hasPollEventsAttachmentSince(messages, G))
    return rewindRefusal_2("delivered_poll_events_in_range", q !== undefined, P);
  let Se = messages[G];
  let prefillText = w?.wordsNotKept || standInSourceUuid(Se) !== undefined ? null : (x?.prefillText ?? "");
  let { persistAnchor, precedingAssistantUuid } = findPersistAnchor(messages, G);
  if (q !== undefined && persistAnchor !== q.anchorUuid)
    return {
      refuse: "target_not_found",
      summarizedTargetMiss: "anchor_not_as_placed",
    };
  return {
    cut: {
      index: G,
      target: Se,
      echoUuid: x?.uuid ?? targetMessageUuid,
      prefillText,
      persistAnchor,
      precedingAssistantUuid: q !== undefined ? null : precedingAssistantUuid,
      ...(q !== undefined && {
        resolution: "after_summary",
        keptRows: q.keptRows,
      }),
      ...(P && {
        assistantTarget: true,
      }),
    },
  };
}
//@ chunk-tyg7f3ek.js:578104-578214 placement
function indexByUuidPrefix(e, n) {
  let r = new Map();
  for (let s = n; s >= 0; s--)
    for (let h of getMessageIdentityUuids(e[s])) r.set(h.slice(0, UUID_PREFIX_LENGTH), e[s]);
  return r;
}
//@ chunk-tyg7f3ek.js:578214-578401 placement
function hasMatchingPrefill(e, n) {
  let r = rewindPrefillText(n);
  return getMessageIdentityUuids(n).some((s) => {
    let h = e.get(s.slice(0, UUID_PREFIX_LENGTH));
    let y = h === undefined ? undefined : rewindPrefillText(h);
    return r !== undefined && y !== undefined && y.text === r.text && y.otherBlocks === r.otherBlocks;
  });
}
//@ chunk-tyg7f3ek.js:578401-578693 placement
function rewindPrefillText(e) {
  let n =
    e.type === "user"
      ? e.message.content
      : e.type === "attachment" && e.attachment.type === "queued_command"
        ? e.attachment.prompt
        : undefined;
  let r = n === undefined ? undefined : getContentText(n)?.trim();
  if (n === undefined || r === undefined || r === "") return;
  return {
    text: r,
    otherBlocks: typeof n === "string" ? 0 : count(n, (s) => s.type !== "text"),
  };
}
//@ chunk-tyg7f3ek.js:578693-578845 placement
function rewindRefusal_2(e, n, r = false) {
  return n
    ? {
        refuse: e === "target_splits_tool_call" ? "target_not_found" : e,
        summarizedTargetMiss: e,
      }
    : {
        refuse: e,
        ...(r && {
          assistantTarget: true,
        }),
      };
}
//@ chunk-tyg7f3ek.js:578845-579403 placement
function reportRewindRefusal(e, n) {
  if ("refuse" in e) {
    if (e.summarizedTargetMiss !== undefined)
      logFeatureSad("rewind_summarized_target", e.summarizedTargetMiss);
    if (e.assistantTarget) logFeatureSad("rewind_assistant_target", e.refuse);
  } else if (e.cut.assistantTarget) {
    if (n === "rewound") logFeatureOk("rewind_assistant_target");
    else logFeatureSad("rewind_assistant_target", n);
  } else if (e.cut.resolution !== undefined) {
    if (n === "rewound")
      logFeatureOk("rewind_summarized_target", {
        kept_rows: e.cut.keptRows ?? 0,
      });
    else logFeatureSad("rewind_summarized_target", n);
  } else if (n === "rewound" && standInSourceUuid(e.cut.target) !== undefined) {
    logFeatureOk("rewind_stand_in_served");
    logForDiagnosticsNoPII("info", "cli_rewind_stand_in_served");
  }
}
//@ chunk-tyg7f3ek.js:579403-580030 placement
function isRewindCutPersistable(e, n, r) {
  if (r === undefined) return true;
  let s = [];
  let lastIndex = e.findLastIndex(
    (x, G) => G < n.index && isLoggableMessage(x) && isChainParticipant(x) && !isReorderedRow(x.uuid),
  );
  if (lastIndex >= 0) s.push(lastIndex);
  let persistAnchor = n.persistAnchor;
  let S = persistAnchor === null ? -1 : e.findLastIndex((x, G) => G < n.index && x.uuid === persistAnchor);
  if (S >= 0) s.push(S);
  let R = S >= 0 ? S : n.index;
  let max = Math.max(
    0,
    e.findLastIndex((x, G) => G <= R && G < n.index && isCompactBoundaryMessage(x)),
  );
  let max_2 = Math.max(0, e.findLastIndex(isCompactBoundaryMessage));
  for (let x = max; x < Math.min(n.index, max_2); x++) s.push(x);
  if (s.some((x) => r.deleted.has(e[x].uuid))) return false;
  if (!r.rewriting || s.length === 0) return true;
  let { lastBoundary } = r;
  let q =
    lastBoundary === undefined
      ? e.findLastIndex(isCompactBoundaryMessage)
      : e.findLastIndex((x) => x.uuid === lastBoundary);
  if (lastBoundary !== undefined && q < 0) return false;
  return s.every((x) => x >= q);
}
//@ chunk-tyg7f3ek.js:580030-580104 placement
function queueStamp(e) {
  return {
    dequeues: e.dequeueCount(),
    length: e.messages.length,
  };
}
//@ chunk-tyg7f3ek.js:580104-580598 placement
async function persistRewindCut({ persistAnchor, target }, r, s) {
  let h = true;
  let y = {
    rewound: true,
    ...(target !== undefined &&
      isFoamySpringEnabled() && {
        cutUuid: target.uuid,
      }),
  };
  try {
    await s.mirror(persistAnchor, y);
    await s.flushInternalEvents();
    await s.persistLocal(persistAnchor, y);
  } catch (error) {
    h = false;
    s.logFailure("persist", error);
  }
  if (!h)
    try {
      let last = r.messages.findLast(
        (message) =>
          (message.type === "user" || message.type === "assistant") && !isReorderedRow(message.uuid),
      );
      if (last !== undefined) {
        await s.mirror(last.uuid, undefined);
        await s.flushInternalEvents();
      }
    } catch {
      logForDebugging("rewind persist-failure remote heal failed (persistence already degraded)");
    }
  return h;
}
//@ chunk-tyg7f3ek.js:580598-580766 placement
function rewindTargetMoved(prefix, n, r) {
  return (
    n.messages[r.index]?.uuid !== r.target?.uuid ||
    n.dequeueCount() !== prefix.dequeues ||
    n.messages.length !== prefix.length ||
    n.drainableMainThreadQueueLength() > 0
  );
}
//@ chunk-tyg7f3ek.js:580766-581207 placement
async function waitForRewindQuiet(e, n) {
  try {
    for (let j = 0; j < 3; j++) {
      let s = e.dequeueCount();
      let h = e.messages.length;
      let last = e.messages.findLast(
        (message) =>
          (message.type === "user" || message.type === "assistant") && !isReorderedRow(message.uuid),
      );
      if (last === undefined) break;
      await n.persistLocal(last.uuid, undefined);
      await n.mirror(last.uuid, undefined);
      await n.flushInternalEvents();
      if (e.dequeueCount() === s && e.messages.length === h) break;
    }
  } catch (error) {
    if (isAbortError(error)) logForDebugging("rewind-refusal heal aborted by stream teardown");
    else n.logFailure("heal", error);
  }
}
//@ chunk-tyg7f3ek.js:581207-582110 placement
/**
 * 在内存中截断对话到切点，清理 thinking 范围与粘性 beta，并同步通知/任务状态。
 */
function applyRewindCut(e, index) {
  let r = e.messages.splice(index);
  noopLedger(e.stickyBetas(), "rewind");
  try {
    let s = e.messages.some((message) => message.type === "assistant")
      ? computeThinkingStrippedScope(e.messages, r)
      : undefined;
    if (s !== undefined) e.appendToConversation([createAttachmentMessage(s)]);
    if (
      e.messages.some((message) => message.type === "assistant") &&
      r.some((h) => h.type === "attachment" && h.attachment.type === "advisor_stripped")
    )
      e.appendToConversation([
        createAttachmentMessage({
          type: "advisor_stripped",
        }),
      ]);
  } catch (error) {
    e.logFailure("strip", error);
  }
  try {
    let s = cronCarryAttachment(e.messages, r);
    if (s !== null) e.appendToConversation([s]);
  } catch (error) {
    e.logFailure("crons", error);
  }
  try {
    let s = threadAskMarkerFor(e.messages);
    if (s !== null) e.appendToConversation([createAttachmentMessage(s)]);
  } catch (error) {
    e.logFailure("thread_ask", error);
  }
  try {
    let rewoundFileTrackingPaths = collectRewoundFileTrackingPaths(r, undefined, e.toolAliases);
    for (let readFilePath of rewoundFileTrackingPaths.readFilePaths.concat(
      rewoundFileTrackingPaths.nestedMemoryPaths,
      rewoundFileTrackingPaths.spelledFilePaths,
    ))
      e.readFileState.delete(readFilePath);
  } catch (error) {
    e.logFailure("evict", error);
  }
  resetPickerState(e.memorySelector);
  try {
    markMemoryWriteCut(e.host, r);
  } catch (error) {
    e.logFailure("memory_cut_note", error);
  }
  setLastCacheSafeForkMessages([...e.messages]);
  return r;
}
//@ chunk-tyg7f3ek.js:582110-582292 placement
function rewindReadNotifications(e, { kept, removed, targetUuid }) {
  try {
    restoreReadsAfterRewind(e, {
      idsInKeptRows: () => collectReadNotificationsResultIds(kept),
      idsInRemovedRows: () => collectReadNotificationsResultIds(removed),
      targetUuid,
    });
  } catch (error) {
    logHandlerFailure(true, "rewind_conversation: notifications", error);
  }
}
//@ chunk-tyg7f3ek.js:582292-583373 placement
function stopTeammatesAfterCut({ taskRegistry, setAppState, storageV5, messages, cutIndex }) {
  let y = taskRegistry.all();
  let S = new Map();
  for (let w of Object.values(y))
    if (w.type === "in_process_teammate") {
      S.set(w.identity.agentId, w);
      if (w.identity.resumableAgentId !== undefined) S.set(w.identity.resumableAgentId, w);
    }
  let R = (w) => {
    let P = new Set();
    let L = w;
    let q = false;
    for (;;) {
      let Z =
        "parentAgentId" in L && typeof L.parentAgentId === "string"
          ? L.parentAgentId
          : "ownerAgentId" in L && typeof L.ownerAgentId === "string"
            ? L.ownerAgentId
            : undefined;
      if (Z === undefined || P.has(Z)) {
        if (
          Z === undefined &&
          "spawnerAgentId" in L &&
          typeof L.spawnerAgentId === "string" &&
          S.has(L.spawnerAgentId)
        )
          q = true;
        break;
      }
      P.add(Z);
      let re = y[Z] ?? S.get(Z);
      if (re === undefined) break;
      if (re.type === "in_process_teammate") {
        q = true;
        break;
      }
      if (re.type !== "local_agent") break;
      L = re;
    }
    if (q) return false;
    let toolUseId = L.toolUseId;
    if (toolUseId === undefined) return true;
    let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, toolUseId);
    return messageIndexByToolUseId < 0 || messageIndexByToolUseId >= cutIndex;
  };
  stopAllRunningTasks({
    taskRegistry,
    setAppState,
    shouldStop: R,
    storageV5,
  });
  for (let w of Object.values(taskRegistry.all())) {
    if (!isUnnotifiedTerminalTask(w) || !R(w)) continue;
    claimTaskNotification(w.id, taskRegistry);
    emitTaskNotification(w.id, w.status === "completed" || w.status === "failed" ? w.status : "stopped", {
      toolUseId: w.toolUseId,
      summary: w.description,
    });
  }
}
//@ chunk-tyg7f3ek.js:583373-583746 placement
function stopMcpTasksAfterCut({ taskRegistry, setAppState, storageV5, messages, cutIndex }) {
  try {
    let y = runningMcpTasksAfter(taskRegistry, messages, cutIndex);
    if (y.length === 0) return;
    let mapped = y.map(async (R) => {
      let taskForStop = lookupTaskForStop("mcp_task");
      if (taskForStop === undefined) throw Error("no kill handler is registered for task type mcp_task");
      await taskForStop.kill(R, taskRegistry, setAppState, "system", storageV5);
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
//@ chunk-tyg7f3ek.js:583746-584146 placement
function withdrawDeferredAfterCut({ endings, queue, messages, cutIndex }) {
  try {
    let h = new Set(
      endings?.withdraw((sinceUuid) => {
        let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, sinceUuid);
        return messageIndexByToolUseId >= 0 && messageIndexByToolUseId >= cutIndex;
      }),
    );
    if (h.size > 0)
      queue.removeByFilter(
        (y) => y.mode === "task-notification" && y.taskId !== undefined && h.has(y.taskId),
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
//@ chunk-tyg7f3ek.js:584146-584359 placement
function runningMcpTasksAfter(taskRegistry, messages, cutIndex) {
  let s = [];
  for (let h of Object.values(taskRegistry.all())) {
    if (h.type !== "mcp_task" || h.status !== "running" || h.notified || h.toolUseId === undefined) continue;
    let messageIndexByToolUseId = findMessageIndexByToolUseId(messages, h.toolUseId);
    if (messageIndexByToolUseId >= 0 && messageIndexByToolUseId >= cutIndex) s.push(h.id);
  }
  return s;
}
//@ chunk-tyg7f3ek.js:584359-584517 placement = countToolCallsSince (0.778)
function findMessageIndexByToolUseId(messages, sinceUuid) {
  return messages.findIndex(
    (message) =>
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some((block) => block?.type === "tool_use" && block.id === sinceUuid),
  );
}
//@ chunk-tyg7f3ek.js:584517-584964 placement
function reportMcpTaskRewindStops(e, n = "stop_failed") {
  try {
    let filtered = e.filter((s) => s.status === "rejected");
    if (filtered.length === 0) {
      logFeatureOk("mcp_task_rewind_stop");
      return;
    }
    if (filtered.length === e.length) logFeatureBad("mcp_task_rewind_stop", n);
    else logFeatureSad("mcp_task_rewind_stop", n);
    for (let { reason } of filtered)
      logError(
        withTelemetryMessage(
          toError(reason),
          n === "choose_failed"
            ? "rewind_conversation: choosing the MCP tasks to stop failed; none was stopped and the rewind went on"
            : "rewind_conversation: stopping an MCP task failed; the rewind went on",
        ),
      );
  } catch {}
}
//@ chunk-tyg7f3ek.js:584964-585005 placement
function rewindRerunMode() {
  return isClaudeAiChatRemote() ? getRemoteFeatureGateState(TENGU_FALLOW_LANTERN) : "off";
}
//@ chunk-tyg7f3ek.js:585005-585395 placement
function dropOwnRerunOnRewind(e) {
  try {
    let filtered = e.messageQueue.getCommandQueueSnapshot().filter(isResumedQueuedCommand);
    if (filtered.length === 0 || !isClaudeAiChatRemote()) return;
    let r = rerunDropVerdict(e, filtered);
    if (r !== undefined) {
      logFeatureSad("rewind_drops_own_rerun", r);
      return;
    }
    for (let { uuid } of e.messageQueue.removeByFilter(isResumedQueuedCommand, {
      reason: "rewound",
    }))
      if (uuid !== undefined) e.io.onCommandLifecycle?.(uuid, "cancelled");
    logFeatureOk("rewind_drops_own_rerun");
  } catch (error) {
    e.logFailure(error);
    logFeatureBad("rewind_drops_own_rerun", "threw");
  }
}
//@ chunk-tyg7f3ek.js:585395-585956 placement
function rerunDropVerdict({ messageQueue, readSwitch, namedByTheRequest, decide }, h) {
  if (!h.every((w) => w.mode === "prompt")) return "not_a_prompt";
  let mapped = h.map((w) => w.resumedTurnUserMessageUuid);
  if (mapped.includes(undefined)) return "opener_unknown";
  let mapped_2 = namedByTheRequest.map((w) =>
    typeof w === "string" ? w.slice(0, UUID_PREFIX_LENGTH) : undefined,
  );
  if (!mapped.every((w) => mapped_2.includes(w?.slice(0, UUID_PREFIX_LENGTH)))) return "turn_unseen";
  if (h.some((w) => w.drainOnly === true)) return "answers_for_others";
  if (messageQueue.getDrainableMainThreadQueueLength() !== h.length) return "others_queued";
  if (!("cut" in decide())) return "no_cut";
  let R = readSwitch();
  return R === "on" ? undefined : `switch_${R}`;
}
//@ chunk-tyg7f3ek.js:585956-586009 placement
function isResumedQueuedCommand(e) {
  return e.resumeReason !== undefined && isActiveMainAgentCommand(e);
}
//@ chunk-tyg7f3ek.js:586009-586050 placement
var TENGU_EBBING_TIDE = "tengu_ebbing_tide";
var REWIND_QUIET_WAIT_MS = 5000;
var REWIND_QUIET_POLL_MS = 20;
//@ chunk-tyg7f3ek.js:586050-586283 placement
function isTurnAbortedForRewind({ drain, messageQueue, prewaitLatch }) {
  if (drain.turnUnderWay) return drain.abortController?.signal.aborted === true;
  return (
    prewaitLatch.parkedBatchStartsAborted() ||
    prewaitLatch
      .parkedMembers()
      .every((s) => s.uuid !== undefined && messageQueue.hasCancelPendingAcked(s.uuid))
  );
}
//@ chunk-tyg7f3ek.js:586283-586825 placement
function rewindLimitQuestionGate(e) {
  if (e.promptUpOrHeld()) return "skipped_prompt";
  if (e.busy()) return "skipped_busy";
  let n = e.runGoing();
  if (n && !e.interruptAsked) return "skipped_busy";
  let r = n && e.dequeues() > 0;
  if (r) {
    if (!e.runEnding()) return "skipped_busy";
    let remoteFeatureGateState = getRemoteFeatureGateState(TENGU_EBBING_TIDE);
    if (remoteFeatureGateState !== "on")
      return remoteFeatureGateState === "cold" ? "skipped_busy_flags_not_fetched" : "skipped_busy";
  }
  let s = e.decide();
  if ("cut" in s)
    return s.cut.index < e.rowCount()
      ? {
          targetFound: true,
          overAnEndingRun: r,
        }
      : "skipped_no_cut";
  return s.refuse === "target_not_found" && e.missingTargetAsked
    ? {
        targetFound: false,
        overAnEndingRun: r,
      }
    : "skipped_no_cut";
}
//@ chunk-tyg7f3ek.js:586825-587087 placement
function rewindLimitAccountGate() {
  if (!isClaudeAISubscriber() || getAPIProvider() !== "firstParty") return "skipped_account";
  if (isLowPriorityActive()) return "skipped_low_priority";
  return retryWatchdogEnv() &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS === undefined &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS === undefined
    ? "skipped_retry_watchdog"
    : null;
}
//@ chunk-tyg7f3ek.js:587087-587207 placement
async function askRewindLimitQuestion(e) {
  try {
    return await runRewindLimitQuestion(e);
  } catch (error) {
    e.logFailure(error);
    logFeatureSad("rewind_limit_question", "threw");
    return "go_on";
  }
}
//@ chunk-tyg7f3ek.js:587207-588419 placement
async function runRewindLimitQuestion(e) {
  let n = {
    process_has_dequeued: e.dequeues() > 0,
    after_interrupt_branch: e.afterTheInterruptBranch,
    prompt_cache_relay_armed: env.CCR_SESSION_PROFILE,
  };
  let r = rewindLimitQuestionGate(e);
  if (typeof r === "string") {
    logFeatureSad("rewind_limit_question", r, n);
    return "go_on";
  }
  let s = e.dequeues();
  let h = rewindLimitAccountGate();
  if (h !== null) {
    logFeatureSad("rewind_limit_question", h, n);
    return "go_on";
  }
  let bareCheckModel = getBareCheckModel();
  let S = await preflightRateLimitCore({
    model: bareCheckModel,
    credentials: e.credentials,
    storageV5: e.storageV5,
    stop: e.stop,
    logFailure: e.logFailure,
  });
  let R = {
    ...n,
    waited_ms: S.waitedMs,
    asked_main_model: bareCheckModel === e.mainModel(),
    target_found: r.targetFound,
  };
  if (e.ending()) {
    logFeatureSad("rewind_limit_question", "stopped", R);
    return "ending";
  }
  if (S.answer === "admitted") {
    logFeatureOk("rewind_limit_question", {
      ...R,
      refused: false,
    });
    return "go_on";
  }
  if (S.answer !== "refused") {
    logFeatureSad("rewind_limit_question", S.answer, R);
    return "go_on";
  }
  if (r.overAnEndingRun && !(await waitForQueueQuiet(e, s))) {
    logFeatureSad("rewind_limit_question", "run_outlasted_wait", R);
    return "turn_running";
  }
  if (e.ending()) {
    logFeatureSad("rewind_limit_question", "stopped", R);
    return "ending";
  }
  let w = rewindLimitQuestionGate(e);
  if (typeof w === "string" || w.overAnEndingRun || (r.targetFound && !w.targetFound)) {
    logFeatureSad("rewind_limit_question", "changed_in_wait", R);
    return "go_on";
  }
  logFeatureOk("rewind_limit_question", {
    ...R,
    refused: true,
    target_found: w.targetFound,
  });
  return {
    report: S.report,
    targetFound: w.targetFound,
  };
}
//@ chunk-tyg7f3ek.js:588419-588600 placement
async function waitForQueueQuiet(e, n) {
  let r = performance.now() + REWIND_QUIET_WAIT_MS;
  let s = () => !e.runWaitable() || e.dequeues() !== n || e.ending() || e.stop.aborted;
  while (!s() && performance.now() < r) await sleep(REWIND_QUIET_POLL_MS, e.stop);
  return s();
}
//@ chunk-tyg7f3ek.js:588785-588845 placement
function forkSeedsDir() {
  return join(getClaudeConfigDir(), "remote-control", "fork-seeds");
}
//@ chunk-tyg7f3ek.js:588845-588869 placement
var FORK_SEED_MAX_BYTES = 268435456;
var FORK_SEED_UNLINK_RETRY_MS = 100;
//@ chunk-tyg7f3ek.js:588869-588935 placement
function forkSeedPath(e) {
  let n = sessionIdBody(e);
  return isSafeBridgeId(n) ? join(forkSeedsDir(), `${n}.json`) : null;
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
