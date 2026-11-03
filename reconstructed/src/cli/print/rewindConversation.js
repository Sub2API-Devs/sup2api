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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
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
  OB,
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
import { lse } from "../../services/api/promptPrefixLedger.js";
import { cronCarryAttachment } from "../../services/compact/compactCarry.js";
import { threadAskMarkerFor } from "../../services/projects/threadTranscript.js";
import { collectRewoundFileTrackingPaths } from "../../utils/queryHelpers.js";
import { i6 } from "../../memdir/findRelevantMemories.js";
import { markMemoryWriteCut } from "../../services/accountMemory/memoryContext.js";
import { setLastCacheSafeForkMessages } from "../../utils/forkedAgent.js";
import { restoreReadsAfterRewind } from "../../services/queuedNotifications/queuedNotifications.js";
import { logHandlerFailure } from "./dispatchControlRequest.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { isUnnotifiedTerminalTask } from "./backgroundWindDown.js";
import { claimTaskNotification } from "../../utils/task/framework.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { Vgt } from "../../utils/swarm/teammateAddressLookup.js";
import { logError } from "../../utils/log.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_FALLOW_LANTERN, pRe } from "../../services/api/withRetry.js";
import { im } from "../../utils/messageQueueManager.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { dD } from "../../services/lowPriority/lowPriorityMode.js";
import { env } from "../../utils/env.js";
import { getBareCheckModel } from "../../utils/model/smallFastModel.js";
import { preflightRateLimitCore } from "../../services/api/rateLimitPreflight.js";
import { sleep } from "../../utils/sleep.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { sessionIdBody, isSafeBridgeId } from "../../bridge/sessionIdCompat.js";

/**
 * 在对话中定位 rewind 目标（用户消息或可选的 assistant/已压缩目标），返回切点或拒绝原因。
 */
//@ chunk-tyg7f3ek.js:575930-578104 placement
function findRewindPoint(
  e,
  n,
  r,
  { rowsOffDisk: s, allowSummarizedTarget: h = !1, allowAssistantTarget: y = !1 } = {},
) {
  if (s !== void 0) {
    let He = findRewindPoint(e, n, r, { allowSummarizedTarget: h, allowAssistantTarget: y });
    if ("cut" in He && isRewindCutPersistable(e, He.cut, s)) return He;
    let lastIndex = e.findLastIndex(isCompactBoundaryMessage),
      We = lastIndex > 0 ? findRewindPoint(e.slice(lastIndex), n, r, { allowSummarizedTarget: h }) : void 0;
    if (We !== void 0 && "cut" in We) {
      let Lt = { ...We.cut, index: We.cut.index + lastIndex };
      if (isRewindCutPersistable(e, Lt, s)) return { cut: Lt };
    }
    if ("refuse" in He) return He;
    let wt = [He, We].some((Lt) => Lt !== void 0 && "cut" in Lt && Lt.cut.resolution !== void 0)
      ? "cut_rows_not_on_disk"
      : !He.cut.assistantTarget && We !== void 0 && "refuse" in We
        ? We.summarizedTargetMiss
        : void 0;
    return {
      refuse: "target_not_found",
      ...(wt !== void 0 && { summarizedTargetMiss: wt }),
      ...(He.cut.assistantTarget && { assistantTarget: !0 }),
    };
  }
  let S = findRewindTarget(e, n, { allowAssistantTarget: y }),
    R = S !== null && e[S.index]?.type === "assistant",
    w = R && !isAwaitingToolResultAnchor(e, S.index) ? null : S,
    P = R && w !== null,
    L = w === null && h ? checkRewindKeptRows(e, n) : void 0,
    q = L !== void 0 && "index" in L ? L : void 0,
    x = q !== void 0 ? { ...q, prefillText: null } : (w ?? findStandInTarget(e, n)),
    G = x ? x.index : -1,
    Z = typeof r === "string" ? r.slice(0, UUID_PREFIX_LENGTH) : null,
    re = (He, Xe) =>
      Xe !== null && getMessageIdentityUuids(He).some((We) => We.slice(0, UUID_PREFIX_LENGTH) === Xe),
    index = e.findIndex((He) => re(He, Z)),
    Ue =
      index >= 0
        ? index
        : e.findIndex((He) => getDroppedPromptUuids(He).some((Xe) => Xe.slice(0, UUID_PREFIX_LENGTH) === Z)),
    filtered = e.filter(
      (He, Xe) =>
        Xe > G &&
        Xe > Ue &&
        !re(He, Z) &&
        !re(He, n.slice(0, UUID_PREFIX_LENGTH)) &&
        isUserPromptAt(e, Xe, Z !== null),
    ),
    nt = filtered.length > 0 ? indexByUuidPrefix(e, Ue) : void 0,
    ie = nt !== void 0 && filtered.some((He) => !hasMatchingPrefill(nt, He));
  if (G < 0)
    return {
      refuse: "target_not_found",
      ...(L !== void 0 && "miss" in L && { summarizedTargetMiss: L.miss }),
    };
  if (ie) return rewindRefusal_2(Z === null ? "stale_target" : "unseen_later_turn", q !== void 0, P);
  if (countToolCallsSince(e, G)) return rewindRefusal_2("poll_tool_result_target", q !== void 0);
  if (hasCronToolUse(e, G)) return rewindRefusal_2("target_splits_tool_call", q !== void 0, P);
  if (hasPollEventsAttachmentSince(e, G))
    return rewindRefusal_2("delivered_poll_events_in_range", q !== void 0, P);
  let Se = e[G],
    me = w?.wordsNotKept || standInSourceUuid(Se) !== void 0 ? null : (x?.prefillText ?? ""),
    { persistAnchor: persistAnchor, precedingAssistantUuid: precedingAssistantUuid } = findPersistAnchor(
      e,
      G,
    );
  if (q !== void 0 && persistAnchor !== q.anchorUuid)
    return { refuse: "target_not_found", summarizedTargetMiss: "anchor_not_as_placed" };
  return {
    cut: {
      index: G,
      target: Se,
      echoUuid: x?.uuid ?? n,
      prefillText: me,
      persistAnchor: persistAnchor,
      precedingAssistantUuid: q !== void 0 ? null : precedingAssistantUuid,
      ...(q !== void 0 && { resolution: "after_summary", keptRows: q.keptRows }),
      ...(P && { assistantTarget: !0 }),
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
    let h = e.get(s.slice(0, UUID_PREFIX_LENGTH)),
      y = h === void 0 ? void 0 : rewindPrefillText(h);
    return r !== void 0 && y !== void 0 && y.text === r.text && y.otherBlocks === r.otherBlocks;
  });
}
//@ chunk-tyg7f3ek.js:578401-578693 placement
function rewindPrefillText(e) {
  let n =
      e.type === "user"
        ? e.message.content
        : e.type === "attachment" && e.attachment.type === "queued_command"
          ? e.attachment.prompt
          : void 0,
    r = n === void 0 ? void 0 : getContentText(n)?.trim();
  if (n === void 0 || r === void 0 || r === "") return;
  return { text: r, otherBlocks: typeof n === "string" ? 0 : count(n, (s) => s.type !== "text") };
}
//@ chunk-tyg7f3ek.js:578693-578845 placement
function rewindRefusal_2(e, n, r = !1) {
  return n
    ? { refuse: e === "target_splits_tool_call" ? "target_not_found" : e, summarizedTargetMiss: e }
    : { refuse: e, ...(r && { assistantTarget: !0 }) };
}
//@ chunk-tyg7f3ek.js:578845-579403 placement
function reportRewindRefusal(e, n) {
  if ("refuse" in e) {
    if (e.summarizedTargetMiss !== void 0) logFeatureSad("rewind_summarized_target", e.summarizedTargetMiss);
    if (e.assistantTarget) logFeatureSad("rewind_assistant_target", e.refuse);
  } else if (e.cut.assistantTarget)
    if (n === "rewound") logFeatureOk("rewind_assistant_target");
    else logFeatureSad("rewind_assistant_target", n);
  else if (e.cut.resolution !== void 0)
    if (n === "rewound") logFeatureOk("rewind_summarized_target", { kept_rows: e.cut.keptRows ?? 0 });
    else logFeatureSad("rewind_summarized_target", n);
  else if (n === "rewound" && standInSourceUuid(e.cut.target) !== void 0)
    (logFeatureOk("rewind_stand_in_served"), logForDiagnosticsNoPII("info", "cli_rewind_stand_in_served"));
}
//@ chunk-tyg7f3ek.js:579403-580030 placement
function isRewindCutPersistable(e, n, r) {
  if (r === void 0) return !0;
  let s = [],
    lastIndex = e.findLastIndex(
      (x, G) => G < n.index && isLoggableMessage(x) && isChainParticipant(x) && !OB(x.uuid),
    );
  if (lastIndex >= 0) s.push(lastIndex);
  let persistAnchor = n.persistAnchor,
    S = persistAnchor === null ? -1 : e.findLastIndex((x, G) => G < n.index && x.uuid === persistAnchor);
  if (S >= 0) s.push(S);
  let R = S >= 0 ? S : n.index,
    max = Math.max(
      0,
      e.findLastIndex((x, G) => G <= R && G < n.index && isCompactBoundaryMessage(x)),
    ),
    max_2 = Math.max(0, e.findLastIndex(isCompactBoundaryMessage));
  for (let x = max; x < Math.min(n.index, max_2); x++) s.push(x);
  if (s.some((x) => r.deleted.has(e[x].uuid))) return !1;
  if (!r.rewriting || s.length === 0) return !0;
  let { lastBoundary: lastBoundary } = r,
    q =
      lastBoundary === void 0
        ? e.findLastIndex(isCompactBoundaryMessage)
        : e.findLastIndex((x) => x.uuid === lastBoundary);
  if (lastBoundary !== void 0 && q < 0) return !1;
  return s.every((x) => x >= q);
}
//@ chunk-tyg7f3ek.js:580030-580104 placement
function queueStamp(e) {
  return { dequeues: e.dequeueCount(), length: e.messages.length };
}
//@ chunk-tyg7f3ek.js:580104-580598 placement
async function persistRewindCut({ persistAnchor: persistAnchor, target: target }, r, s) {
  let h = !0,
    y = { rewound: !0, ...(target !== void 0 && isFoamySpringEnabled() && { cutUuid: target.uuid }) };
  try {
    (await s.mirror(persistAnchor, y), await s.flushInternalEvents(), await s.persistLocal(persistAnchor, y));
  } catch (error) {
    ((h = !1), s.logFailure("persist", error));
  }
  if (!h)
    try {
      let last = r.messages.findLast((R) => (R.type === "user" || R.type === "assistant") && !OB(R.uuid));
      if (last !== void 0) (await s.mirror(last.uuid, void 0), await s.flushInternalEvents());
    } catch {
      logForDebugging("rewind persist-failure remote heal failed (persistence already degraded)");
    }
  return h;
}
//@ chunk-tyg7f3ek.js:580598-580766 placement
function rewindTargetMoved(e, n, r) {
  return (
    n.messages[r.index]?.uuid !== r.target?.uuid ||
    n.dequeueCount() !== e.dequeues ||
    n.messages.length !== e.length ||
    n.drainableMainThreadQueueLength() > 0
  );
}
//@ chunk-tyg7f3ek.js:580766-581207 placement
async function waitForRewindQuiet(e, n) {
  try {
    for (let r = 0; r < 3; r++) {
      let dequeueCount = e.dequeueCount(),
        h = e.messages.length,
        last = e.messages.findLast((S) => (S.type === "user" || S.type === "assistant") && !OB(S.uuid));
      if (last === void 0) break;
      if (
        (await n.persistLocal(last.uuid, void 0),
        await n.mirror(last.uuid, void 0),
        await n.flushInternalEvents(),
        e.dequeueCount() === dequeueCount && e.messages.length === h)
      )
        break;
    }
  } catch (error) {
    if (isAbortError(error)) logForDebugging("rewind-refusal heal aborted by stream teardown");
    else n.logFailure("heal", error);
  }
}
/**
 * 在内存中截断对话到切点，清理 thinking 范围与粘性 beta，并同步通知/任务状态。
 */
//@ chunk-tyg7f3ek.js:581207-582110 placement
function applyRewindCut(e, n) {
  let splice = e.messages.splice(n);
  lse(e.stickyBetas(), "rewind");
  try {
    let s = e.messages.some((message) => message.type === "assistant")
      ? computeThinkingStrippedScope(e.messages, splice)
      : void 0;
    if (s !== void 0) e.appendToConversation([createAttachmentMessage(s)]);
    if (
      e.messages.some((message) => message.type === "assistant") &&
      splice.some((h) => h.type === "attachment" && h.attachment.type === "advisor_stripped")
    )
      e.appendToConversation([createAttachmentMessage({ type: "advisor_stripped" })]);
  } catch (error) {
    e.logFailure("strip", error);
  }
  try {
    let s = cronCarryAttachment(e.messages, splice);
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
    let s = collectRewoundFileTrackingPaths(splice, void 0, e.toolAliases);
    for (let h of s.readFilePaths.concat(s.nestedMemoryPaths, s.spelledFilePaths)) e.readFileState.delete(h);
  } catch (error) {
    e.logFailure("evict", error);
  }
  i6(e.memorySelector);
  try {
    markMemoryWriteCut(e.host, splice);
  } catch (error) {
    e.logFailure("memory_cut_note", error);
  }
  return (setLastCacheSafeForkMessages([...e.messages]), splice);
}
//@ chunk-tyg7f3ek.js:582110-582292 placement
function rewindReadNotifications(e, { kept: kept, removed: removed, targetUuid: targetUuid }) {
  try {
    restoreReadsAfterRewind(e, {
      idsInKeptRows: () => collectReadNotificationsResultIds(kept),
      idsInRemovedRows: () => collectReadNotificationsResultIds(removed),
      targetUuid: targetUuid,
    });
  } catch (error) {
    logHandlerFailure(!0, "rewind_conversation: notifications", error);
  }
}
//@ chunk-tyg7f3ek.js:582292-583373 placement
function stopTeammatesAfterCut({
  taskRegistry: taskRegistry,
  setAppState: setAppState,
  storageV5: storageV5,
  messages: messages,
  cutIndex: cutIndex,
}) {
  let all = taskRegistry.all(),
    S = new Map();
  for (let w of Object.values(all))
    if (w.type === "in_process_teammate") {
      if ((S.set(w.identity.agentId, w), w.identity.resumableAgentId !== void 0))
        S.set(w.identity.resumableAgentId, w);
    }
  let R = (w) => {
    let P = new Set(),
      L = w,
      q = !1;
    for (;;) {
      let Z =
        "parentAgentId" in L && typeof L.parentAgentId === "string"
          ? L.parentAgentId
          : "ownerAgentId" in L && typeof L.ownerAgentId === "string"
            ? L.ownerAgentId
            : void 0;
      if (Z === void 0 || P.has(Z)) {
        if (
          Z === void 0 &&
          "spawnerAgentId" in L &&
          typeof L.spawnerAgentId === "string" &&
          S.has(L.spawnerAgentId)
        )
          q = !0;
        break;
      }
      P.add(Z);
      let re = all[Z] ?? S.get(Z);
      if (re === void 0) break;
      if (re.type === "in_process_teammate") {
        q = !0;
        break;
      }
      if (re.type !== "local_agent") break;
      L = re;
    }
    if (q) return !1;
    let toolUseId = L.toolUseId;
    if (toolUseId === void 0) return !0;
    let G = findMessageIndexByToolUseId(messages, toolUseId);
    return G < 0 || G >= cutIndex;
  };
  stopAllRunningTasks({
    taskRegistry: taskRegistry,
    setAppState: setAppState,
    shouldStop: R,
    storageV5: storageV5,
  });
  for (let w of Object.values(taskRegistry.all())) {
    if (!isUnnotifiedTerminalTask(w) || !R(w)) continue;
    (claimTaskNotification(w.id, taskRegistry),
      emitTaskNotification(w.id, w.status === "completed" || w.status === "failed" ? w.status : "stopped", {
        toolUseId: w.toolUseId,
        summary: w.description,
      }));
  }
}
//@ chunk-tyg7f3ek.js:583373-583746 placement
function stopMcpTasksAfterCut({
  taskRegistry: taskRegistry,
  setAppState: setAppState,
  storageV5: storageV5,
  messages: messages,
  cutIndex: cutIndex,
}) {
  try {
    let y = runningMcpTasksAfter(taskRegistry, messages, cutIndex);
    if (y.length === 0) return;
    let mapped = y.map(async (R) => {
      let w = Vgt("mcp_task");
      if (w === void 0) throw Error("no kill handler is registered for task type mcp_task");
      await w.kill(R, taskRegistry, setAppState, "system", storageV5);
    });
    Promise.allSettled(mapped).then(reportMcpTaskRewindStops);
  } catch (error) {
    reportMcpTaskRewindStops([{ status: "rejected", reason: error }], "choose_failed");
  }
}
//@ chunk-tyg7f3ek.js:583746-584146 placement
function withdrawDeferredAfterCut({
  endings: endings,
  queue: queue,
  messages: messages,
  cutIndex: cutIndex,
}) {
  try {
    let h = new Set(
      endings?.withdraw((y) => {
        let S = findMessageIndexByToolUseId(messages, y);
        return S >= 0 && S >= cutIndex;
      }),
    );
    if (h.size > 0)
      queue.removeByFilter((y) => y.mode === "task-notification" && y.taskId !== void 0 && h.has(y.taskId), {
        reason: "rewound",
      });
  } catch (error) {
    (logFeatureBad("mcp_task_rewind_drop", "drop_failed"),
      logError(
        withTelemetryMessage(
          toError(error),
          "rewind_conversation: withdrawing the saved endings of MCP tasks failed; the rewind went on",
        ),
      ));
  }
}
//@ chunk-tyg7f3ek.js:584146-584359 placement
function runningMcpTasksAfter(e, n, r) {
  let s = [];
  for (let h of Object.values(e.all())) {
    if (h.type !== "mcp_task" || h.status !== "running" || h.notified || h.toolUseId === void 0) continue;
    let y = findMessageIndexByToolUseId(n, h.toolUseId);
    if (y >= 0 && y >= r) s.push(h.id);
  }
  return s;
}
//@ chunk-tyg7f3ek.js:584359-584517 placement = countToolCallsSince (0.778)
function findMessageIndexByToolUseId(messages, sinceUuid) {
  return messages.findIndex(
    (r) =>
      r.type === "assistant" &&
      Array.isArray(r.message.content) &&
      r.message.content.some((block) => block?.type === "tool_use" && block.id === sinceUuid),
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
    for (let { reason: reason } of filtered)
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
    let filtered = e.messageQueue.getCommandQueueSnapshot().filter(_F);
    if (filtered.length === 0 || !isClaudeAiChatRemote()) return;
    let r = rerunDropVerdict(e, filtered);
    if (r !== void 0) {
      logFeatureSad("rewind_drops_own_rerun", r);
      return;
    }
    for (let { uuid: uuid } of e.messageQueue.removeByFilter(_F, { reason: "rewound" }))
      if (uuid !== void 0) e.io.onCommandLifecycle?.(uuid, "cancelled");
    logFeatureOk("rewind_drops_own_rerun");
  } catch (error) {
    (e.logFailure(error), logFeatureBad("rewind_drops_own_rerun", "threw"));
  }
}
//@ chunk-tyg7f3ek.js:585395-585956 placement
function rerunDropVerdict(
  {
    messageQueue: messageQueue,
    readSwitch: readSwitch,
    namedByTheRequest: namedByTheRequest,
    decide: decide,
  },
  h,
) {
  if (!h.every((w) => w.mode === "prompt")) return "not_a_prompt";
  let mapped = h.map((w) => w.resumedTurnUserMessageUuid);
  if (mapped.includes(void 0)) return "opener_unknown";
  let mapped_2 = namedByTheRequest.map((w) =>
    typeof w === "string" ? w.slice(0, UUID_PREFIX_LENGTH) : void 0,
  );
  if (!mapped.every((w) => mapped_2.includes(w?.slice(0, UUID_PREFIX_LENGTH)))) return "turn_unseen";
  if (h.some((w) => w.drainOnly === !0)) return "answers_for_others";
  if (messageQueue.getDrainableMainThreadQueueLength() !== h.length) return "others_queued";
  if (!("cut" in decide())) return "no_cut";
  let R = readSwitch();
  return R === "on" ? void 0 : `switch_${R}`;
}
//@ chunk-tyg7f3ek.js:585956-586009 placement
function _F(e) {
  return e.resumeReason !== void 0 && im(e);
}
//@ chunk-tyg7f3ek.js:586009-586050 placement
var TENGU_EBBING_TIDE = "tengu_ebbing_tide",
  WV = 5000,
  qV = 20;
//@ chunk-tyg7f3ek.js:586050-586283 placement
function isTurnAbortedForRewind({ drain: drain, messageQueue: messageQueue, prewaitLatch: prewaitLatch }) {
  if (drain.turnUnderWay) return drain.abortController?.signal.aborted === !0;
  return (
    prewaitLatch.parkedBatchStartsAborted() ||
    prewaitLatch.parkedMembers().every((s) => s.uuid !== void 0 && messageQueue.hasCancelPendingAcked(s.uuid))
  );
}
//@ chunk-tyg7f3ek.js:586283-586825 placement
function rewindLimitQuestionGate(e) {
  if (e.promptUpOrHeld()) return "skipped_prompt";
  if (e.busy()) return "skipped_busy";
  let runGoing = e.runGoing();
  if (runGoing && !e.interruptAsked) return "skipped_busy";
  let r = runGoing && e.dequeues() > 0;
  if (r) {
    if (!e.runEnding()) return "skipped_busy";
    let h = getRemoteFeatureGateState(TENGU_EBBING_TIDE);
    if (h !== "on") return h === "cold" ? "skipped_busy_flags_not_fetched" : "skipped_busy";
  }
  let decide = e.decide();
  if ("cut" in decide)
    return decide.cut.index < e.rowCount() ? { targetFound: !0, overAnEndingRun: r } : "skipped_no_cut";
  return decide.refuse === "target_not_found" && e.missingTargetAsked
    ? { targetFound: !1, overAnEndingRun: r }
    : "skipped_no_cut";
}
//@ chunk-tyg7f3ek.js:586825-587087 placement
function rewindLimitAccountGate() {
  if (!isClaudeAISubscriber() || getAPIProvider() !== "firstParty") return "skipped_account";
  if (dD()) return "skipped_low_priority";
  return pRe() &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS === void 0 &&
    env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS === void 0
    ? "skipped_retry_watchdog"
    : null;
}
//@ chunk-tyg7f3ek.js:587087-587207 placement
async function askRewindLimitQuestion(e) {
  try {
    return await runRewindLimitQuestion(e);
  } catch (error) {
    return (e.logFailure(error), logFeatureSad("rewind_limit_question", "threw"), "go_on");
  }
}
//@ chunk-tyg7f3ek.js:587207-588419 placement
async function runRewindLimitQuestion(e) {
  let n = {
      process_has_dequeued: e.dequeues() > 0,
      after_interrupt_branch: e.afterTheInterruptBranch,
      prompt_cache_relay_armed: env.CCR_SESSION_PROFILE,
    },
    r = rewindLimitQuestionGate(e);
  if (typeof r === "string") return (logFeatureSad("rewind_limit_question", r, n), "go_on");
  let dequeues = e.dequeues(),
    h = rewindLimitAccountGate();
  if (h !== null) return (logFeatureSad("rewind_limit_question", h, n), "go_on");
  let y = getBareCheckModel(),
    S = await preflightRateLimitCore({
      model: y,
      credentials: e.credentials,
      storageV5: e.storageV5,
      stop: e.stop,
      logFailure: e.logFailure,
    }),
    R = { ...n, waited_ms: S.waitedMs, asked_main_model: y === e.mainModel(), target_found: r.targetFound };
  if (e.ending()) return (logFeatureSad("rewind_limit_question", "stopped", R), "ending");
  if (S.answer === "admitted") return (logFeatureOk("rewind_limit_question", { ...R, refused: !1 }), "go_on");
  if (S.answer !== "refused") return (logFeatureSad("rewind_limit_question", S.answer, R), "go_on");
  if (r.overAnEndingRun && !(await waitForQueueQuiet(e, dequeues)))
    return (logFeatureSad("rewind_limit_question", "run_outlasted_wait", R), "turn_running");
  if (e.ending()) return (logFeatureSad("rewind_limit_question", "stopped", R), "ending");
  let w = rewindLimitQuestionGate(e);
  if (typeof w === "string" || w.overAnEndingRun || (r.targetFound && !w.targetFound))
    return (logFeatureSad("rewind_limit_question", "changed_in_wait", R), "go_on");
  return (
    logFeatureOk("rewind_limit_question", { ...R, refused: !0, target_found: w.targetFound }),
    { report: S.report, targetFound: w.targetFound }
  );
}
//@ chunk-tyg7f3ek.js:588419-588600 placement
async function waitForQueueQuiet(e, n) {
  let r = performance.now() + WV,
    s = () => !e.runWaitable() || e.dequeues() !== n || e.ending() || e.stop.aborted;
  while (!s() && performance.now() < r) await sleep(qV, e.stop);
  return s();
}
//@ chunk-tyg7f3ek.js:588785-588845 placement
function forkSeedsDir() {
  return join_6(getClaudeConfigDir(), "remote-control", "fork-seeds");
}
//@ chunk-tyg7f3ek.js:588845-588869 placement
var FORK_SEED_MAX_BYTES = 268435456,
  ZV = 100;
//@ chunk-tyg7f3ek.js:588869-588935 placement
function forkSeedPath(e) {
  let n = sessionIdBody(e);
  return isSafeBridgeId(n) ? join_6(forkSeedsDir(), `${n}.json`) : null;
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
  ZV,
};
