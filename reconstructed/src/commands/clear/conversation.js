/**
 * commands/clear/conversation.ts
 *
 * clearConversation：/clear 的主体，结束后台任务、清空消息、生成新会话 ID 并保留旧会话可恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/conversation.ts
 * pieces: chunk-231n2j4w.js (9)
 * attribution: affinity 1, facade-exports 2, layout 6
 */
import { randomUUID } from "crypto";
import { resetObserverPairings } from "../../services/agentObserver/agentObserver.js";
import { kb, Oq, mg } from "../../utils/messageQueueManager.js";
import {
  retireConversationReplicas,
  disposeLiveState,
  resetNoticeBudgets,
  clearRefusedPublishBodies,
  resetForNewConversation,
} from "../../services/liveReplica/liveReplica.js";
import { executeSessionEndHooks, getSessionEndHookTimeoutMs } from "../../utils/hooks.js";
import { u3n } from "../../services/api/cacheKeepalive.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { notePendingConversationEdit } from "../../utils/shell/shellToolUtils.js";
import { setCurrentForKey } from "../../utils/currentRefByKey.js";
import { pXn } from "../../utils/attachments/totalTokensReminder.js";
import { tokenCountFromLastAPIResponse } from "../../utils/tokens.js";
import { AGENT_TASK_TYPES, isCompletedBackgroundAgent } from "../../tasks/taskKinds.js";
import { hasCompletedWithFindings, SKe } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { clearSessionCaches } from "./caches.js";
import { kAe } from "../../tools/BashTool/androidCommands.js";
import { kT, parseTaskNotificationToolUseId } from "../../services/tools/detachedToolCalls.js";
import { i6 } from "../../memdir/findRelevantMemories.js";
import { closeWebViews, resetArtifactReadState } from "../../state/artifactReadState.js";
import {
  getCurrentSessionTitle,
  getCurrentSessionAgentName,
  isConversationEgressTainted,
  pinSessionId,
  getMaterializedSessionFile,
  getTranscriptPath,
  isSessionHistorySuppressed,
  getCurrentSessionMemoryModeStamps,
  clearSessionMetadata,
  holdSessionHistorySuppression,
  markToolsUsedWritten,
  hasRemoteWorkerEventLog,
  queueLeafCheckpointWithdrawal,
  getAgentMetadataPath,
  cacheSessionTitle,
  resetSessionFilePointer,
  saveMemoryMode,
  dropSessionHistorySuppression,
  releasePrecautionarySuppressionFor,
  saveCustomTitle,
  saveAgentName,
  saveMode,
  saveWorktreeState,
  saveIsolationLatch,
  readAgentMetadataAtPath,
  writeAgentMetadata,
} from "../../utils/sessionStorage.js";
import {
  getSessionId,
  getConversationAtisLatch,
  getConversationToolsUsed,
  setMemoryToggledOff,
  setRestoredMemoryPause,
  setAutoMemoryOffThisSession,
  setRestoredAutoMemoryOff,
  setConversationAtisLatch,
  getIsNonInteractiveSession,
  isReplBridgeActive,
  saveSessionCostsForTransition,
  resetCostState,
  isDiskless,
  regenerateSessionId,
  getOriginalCwd,
  getProjectRoot,
} from "../../bootstrap/state.js";
import { GOAL_PROPOSAL_DIALOG } from "../../components/goal/goalProposalDialog.js";
import { retainPathLinks } from "../../services/artifacts/shareEntries.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { logError } from "../../utils/log.js";
import { evictTaskOutput } from "../../utils/task/diskOutput.js";
import { count } from "../../utils/collections.js";
import { isIdleCompletedAgent } from "../../tasks/LocalAgentTask/keepalive.js";
import { createEmptyAttributionState } from "../../utils/commitAttribution.js";
import { liveAgentNames } from "../../utils/agentNameRegistry.js";
import { logGoalCleared } from "../goal/goal.js";
import { aW } from "../../utils/sessionTagRefresh.js";
import { setMcpOnClose } from "../../services/mcp/mcpWireUtils.js";
import { clearAllPlanSlugs } from "../../utils/plans.js";
import { uLn } from "../../bootstrap/stateSlices.js";
import { isBridgeStateFramesEnabled } from "../../bridge/bridgeGates.js";
import { Vt, Mr } from "../../utils/agentId.js";
import { enqueueTaskNotification, getTaskRunState } from "../../utils/task/taskNotifications.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { devIntentTracker } from "../../services/projects/devIntent.js";
import { uC } from "../../utils/remoteEnvironment.js";
import { runBundledSkillSessionResets } from "../../skills/bundledSkills.js";
import { announcementStateByHost } from "../../services/announcements/announcementState.js";
import { ht } from "../../services/mcp/cliOwnedClients.js";
import { ccrSessionIdForRefs } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { env } from "../../utils/env.js";
import { syncJobResumeSessionId } from "../../services/daemon/jobState.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { processSessionStartHooks } from "../../utils/sessionStart.js";
import { isAbortError, toError, withTelemetryMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { hWr } from "../../services/compact/compactCarry.js";
import { mze } from "../../services/daemon/sessionCron.js";
import { UC } from "../../utils/agentMetadata.js";
import { setCwd } from "../../utils/Shell.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";

//@ chunk-231n2j4w.js:1904-1924 affinity
var pe = null,
  ge = null;
//@ chunk-231n2j4w.js:1924-6914 facade-exports = clearConversation (0.403)
async function* clearConversation({
  session: session,
  setMessages: setMessages,
  readFileState: readFileState,
  sessionEnvVars: sessionEnvVars,
  toolState: toolState,
  memorySelector: memorySelector,
  getAppState: getAppState,
  setAppState: setAppState,
  sessionHooksRegistry: sessionHooksRegistry,
  dialogStore: dialogStore,
  isolationLatch: isolationLatch,
  taskRegistry: taskRegistry,
  clearedSessionTitle: clearedSessionTitle,
  storageV5: storageV5,
  credentials: credentials,
  deferSessionStartHooks: deferSessionStartHooks,
  releaseDeferredSessionStartHooks: releaseDeferredSessionStartHooks,
  resetTrigger: resetTrigger,
  resetUserMessageUuid: resetUserMessageUuid,
  conversationOnly: conversationOnly,
}) {
  if (
    (resetObserverPairings(session),
    kb(Oq),
    retireConversationReplicas(),
    disposeLiveState(),
    resetNoticeBudgets(),
    conversationOnly)
  )
    (await conversationOnly.raiseSessionEnd(), sessionHooksRegistry.clear(session.id));
  else
    await executeSessionEndHooks(session, "clear", {
      sessionHooks: sessionHooksRegistry,
      getAppState: getAppState,
      signal: AbortSignal.timeout(getSessionEndHookTimeoutMs()),
      storageV5: storageV5,
      credentials: credentials,
    });
  u3n("conversation_clear");
  let h = new Set(),
    preservedAgentIds = new Map();
  if (getAppState && isolationLatch?.current != null) {
    let filtered = Object.values(getAppState().tasks).filter(
      (r) => !L(r) && (isLocalAgent(r) || isInProcessTeammateTask(r)),
    );
    if (filtered.every(canDropCompletedAgentOnClear)) {
      for (let r of filtered) if ((h.add(r.id), isLocalAgent(r))) preservedAgentIds.set(r.id, r.agentId);
    }
  }
  let shouldKillTask = (task) => L(task) || h.has(task.id),
    S = new Set(),
    M = [];
  if (getAppState)
    for (let task of Object.values(getAppState().tasks)) {
      if (shouldKillTask(task)) continue;
      if (isLocalAgent(task)) (S.add(task.agentId), M.push(task));
      else if (isInProcessTeammateTask(task)) S.add(task.identity.agentId);
    }
  (releaseDeferredSessionStartHooks?.(),
    notePendingConversationEdit("clear"),
    setCurrentForKey(session, void 0),
    setMessages((e) => (pXn.of(session).rollOverContext("main", tokenCountFromLastAPIResponse(e)), [])));
  let oe = getAppState
    ? Object.values(getAppState().tasks).some(
        (e) =>
          !shouldKillTask(e) &&
          AGENT_TASK_TYPES.has(e.type) &&
          (e.status === "running" || (isLocalAgent(e) && hasCompletedWithFindings(e))),
      )
    : !1;
  if ((clearSessionCaches(session, S, setAppState, toolState, storageV5, oe), !conversationOnly))
    restoreOriginalCwd();
  if (
    (readFileState.clear(),
    kAe.of(session.host).reset(),
    kT.of(session).discardAll(),
    kb(
      (e) =>
        e.mode === "task-notification" &&
        typeof e.value === "string" &&
        parseTaskNotificationToolUseId(e.value) !== null,
    ),
    sessionEnvVars?.clear(),
    i6(memorySelector),
    isolationLatch && S.size === 0 && h.size === 0)
  )
    isolationLatch.current = null;
  if (getAppState) closeWebViews(getAppState);
  let T = getCurrentSessionTitle(getSessionId()),
    G = getCurrentSessionAgentName(),
    E = !clearedSessionTitle && T !== void 0,
    re = E && isConversationEgressTainted(pinSessionId(getSessionId())),
    k,
    U;
  if ((clearRefusedPublishBodies(), setAppState)) {
    if (
      (dialogStore?.dismissKind(GOAL_PROPOSAL_DIALOG.kind),
      pe?.retireResponsePair(session),
      retainPathLinks(new Set()),
      setAppState((prev) => {
        let nextTasks = {},
          w = [];
        for (let [c, d] of Object.entries(prev.tasks)) {
          if (!shouldKillTask(d)) {
            nextTasks[c] =
              isLocalAgent(d) && d.waitingNoticeRecipient !== void 0
                ? { ...d, waitingNoticeRecipient: void 0 }
                : d;
            continue;
          }
          w.push(c);
          try {
            if (d.status === "running") {
              if (isLocalShellTask(d)) (d.shellCommand?.kill(), d.shellCommand?.cleanup());
              if ("abortController" in d) d.abortController?.abort();
            }
          } catch (error) {
            logError(error);
          }
          evictTaskOutput(c);
        }
        ((k = count(Object.values(nextTasks), (c) => !Ce.has(c.type) && !isIdleCompletedAgent(c))),
          (U = prev.activeGoal));
        let transcripts = prev.transcripts;
        if (transcripts && w.length > 0) {
          transcripts = { ...transcripts };
          for (let task of w) delete transcripts[task];
        }
        return {
          ...resetArtifactReadState(prev),
          tasks: nextTasks,
          ...(transcripts !== prev.transcripts && { transcripts: transcripts }),
          ...(prev.viewingAgentTaskId !== void 0 &&
            w.includes(prev.viewingAgentTaskId) && { viewingAgentTaskId: void 0, viewSelectionMode: "none" }),
          runningSubagents: k === 0 ? 0 : prev.runningSubagents,
          ...{ endedByModel: !1 },
          attribution: createEmptyAttributionState(),
          cacheBreakerPhrase: void 0,
          sendMessagePins: {},
          agentNameRegistry: liveAgentNames(prev.agentNameRegistry, nextTasks),
          frameUrls: {},
          standaloneAgentContext:
            E && prev.standaloneAgentContext?.name ? { name: prev.standaloneAgentContext.name } : void 0,
          fileHistory: { snapshots: [], trackedFiles: new Set(), snapshotSequence: 0 },
        };
      }),
      U !== void 0)
    )
      logGoalCleared(U, "session_clear");
    aW({});
  }
  if (
    isolationLatch &&
    S.size === 0 &&
    h.size > 0 &&
    getAppState &&
    ![...h].some(
      (e) => Object.hasOwn(getAppState().tasks, e) || hasPendingAgentWork(e, preservedAgentIds.get(e) ?? e),
    ) &&
    !Object.values(getAppState().tasks).some(
      (e) => isLocalAgent(e) && [...preservedAgentIds.values()].includes(e.agentId),
    )
  )
    isolationLatch.current = null;
  if (taskRegistry && k === 0) taskRegistry.resetWebSearchBudget();
  if (getAppState) {
    for (let client of getAppState().mcp.clients)
      if (client.name === "ide" && client.type === "connected") {
        setMcpOnClose(client, void 0);
        let { clearServerCache: clearServerCache } = require("./chunk-asne9cp8.js").mcpClientModule();
        await clearServerCache(client.name, client.config).catch(() => {});
      }
  }
  clearAllPlanSlugs();
  let se = getSessionId(),
    ie = clearedSessionTitle ? (getMaterializedSessionFile() ?? getTranscriptPath()) : void 0,
    ne = isSessionHistorySuppressed(),
    q = k === 0 && S.size === 0 ? void 0 : getConversationAtisLatch(),
    z = k === 0 && S.size === 0 ? void 0 : getConversationToolsUsed().names(),
    filtered = getConversationToolsUsed().names().filter(uLn),
    de = [...getCurrentSessionMemoryModeStamps()],
    me = !1,
    le = !1;
  if ((clearSessionMetadata(), ne)) holdSessionHistorySuppression();
  if (me) (setMemoryToggledOff(!0), setRestoredMemoryPause(!0));
  if (le) (setAutoMemoryOffThisSession(!0), setRestoredAutoMemoryOff(!0));
  if (q !== void 0) setConversationAtisLatch(q);
  if (z !== void 0) getConversationToolsUsed().replace(z);
  else (getConversationToolsUsed().replace(filtered), markToolsUsedWritten());
  let I = randomUUID();
  if (getIsNonInteractiveSession() || (isReplBridgeActive() && isBridgeStateFramesEnabled())) {
    let e = resetTrigger === "clear" ? Vt(resetUserMessageUuid) : null;
    (setCurrentForKey(session, I),
      enqueueTaskNotification({
        type: "conversation_reset",
        new_conversation_id: I,
        uuid: I,
        ...(resetTrigger !== void 0 && { trigger: resetTrigger }),
        ...(e !== null && { user_message_uuid: e }),
        timestamp: new Date().toISOString(),
      }),
      logFeatureOk("bridge_conversation_reset"));
  }
  if (
    (devIntentTracker.of(session.host).conversationReset(),
    yield { type: "conversation_reset", newConversationId: I },
    !conversationOnly)
  )
    (saveSessionCostsForTransition(storageV5), resetCostState());
  if (getIsNonInteractiveSession() && uC() && hasRemoteWorkerEventLog() && !isDiskless())
    queueLeafCheckpointWithdrawal();
  let W = pinSessionId(getSessionId()),
    he = re || (E && isConversationEgressTainted(W)),
    j = new Map();
  for (let e of M)
    if (e.forkedSkillName === void 0) {
      let r = Mr(e.agentId);
      j.set(r, getAgentMetadataPath(r));
    }
  if (
    (regenerateSessionId({ setCurrentAsParent: !0, next: conversationOnly?.nextSessionId }),
    E && T !== void 0)
  )
    cacheSessionTitle(T);
  let resolved = Promise.resolve(!0);
  if (
    (runBundledSkillSessionResets(),
    resetForNewConversation(),
    announcementStateByHost.of(session).reset(),
    ht().needsAuthNoticedThisSession.clear(),
    ccrSessionIdForRefs(session),
    env.CLAUDE_CODE_SESSION_ID && !conversationOnly)
  )
    process.env.CLAUDE_CODE_SESSION_ID = getSessionId();
  await resetSessionFilePointer();
  for (let e of ge?.pauseStampsCarriedAcrossClear(getAppState?.().mcp.clients, de) ?? [])
    saveMemoryMode({ ...e, afterUuid: null }, storageV5);
  if ((dropSessionHistorySuppression(), releasePrecautionarySuppressionFor(W), conversationOnly)) {
    await stopAgentsAndCarrySettings(M, j, storageV5);
    return;
  }
  if ((await syncJobResumeSessionId(getSessionId(), getTranscriptPath(), storageV5), isAgentSwarmsEnabled()))
    await (await import("./chunk-cpmshktc.js")).noteSessionTaskListAfterClear();
  if (clearedSessionTitle) await saveCustomTitle(se, clearedSessionTitle, ie, "user", storageV5);
  else if (T) {
    if ((await saveCustomTitle(getSessionId(), T, void 0, "user", storageV5), G))
      await saveAgentName(getSessionId(), G, void 0, "user", storageV5);
  }
  await stopAgentsAndCarrySettings(M, j, storageV5);
  let { isCoordinatorMode: isCoordinatorMode } = require("./chunk-yxywkh50.js");
  saveMode(isCoordinatorMode() ? "coordinator" : "normal");
  let worktreeSession = getCurrentWorktreeSession();
  if (worktreeSession) saveWorktreeState(worktreeSession, storageV5);
  if (isolationLatch?.current) saveIsolationLatch(isolationLatch.current, storageV5);
  if (deferSessionStartHooks) {
    if (
      (deferSessionStartHooks((e) =>
        processSessionStartHooks(session, "clear", {
          signal: e,
          storageV5: storageV5,
          credentials: credentials,
        }).catch((r) => {
          if (isAbortError(r))
            logForDebugging(`SessionStart hooks after /clear aborted: ${toError(r).message}`);
          else logError(withTelemetryMessage(toError(r), "SessionStart hooks after /clear threw"));
          return [];
        }),
      ),
      hWr())
    )
      setMessages(mze);
    return;
  }
  let Q = await processSessionStartHooks(session, "clear", {
    storageV5: storageV5,
    credentials: credentials,
  });
  if (Q.length > 0) setMessages(() => Q);
  if (hWr()) setMessages(mze);
}
/**
 * /clear 时停止运行中的后台代理，并把各代理的设置元数据写到新位置（失败只记日志）。
 */
//@ chunk-231n2j4w.js:6914-7185 layout
async function stopAgentsAndCarrySettings(tasks, metadataPaths, storage) {
  for (let f of tasks) if (f.status === "running") SKe(f.agentId);
  await Promise.all(
    Array.from(metadataPaths, async ([f, O]) => {
      try {
        let y = await readAgentMetadataAtPath(O, storage);
        if (y) await writeAgentMetadata(f, y, storage, !0);
      } catch (error) {
        logForDebugging(`/clear did not carry the settings file of agent ${f}: ${UC(error)}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-231n2j4w.js:7185-7328 layout
function restoreOriginalCwd() {
  let o = getOriginalCwd();
  try {
    setCwd(o);
  } catch {
    logForDebugging(`/clear: originalCwd "${o}" no longer exists; falling back`);
    let s = getProjectRoot();
    if (s !== o)
      try {
        setCwd(s);
      } catch {}
  }
}
//@ chunk-231n2j4w.js:7328-7392 layout
function L(o) {
  return "isBackgrounded" in o && o.isBackgrounded === !1;
}
//@ chunk-231n2j4w.js:7392-7554 layout
function canDropCompletedAgentOnClear(task) {
  return (
    isLocalAgent(task) &&
    isCompletedBackgroundAgent(task) &&
    (task.keepaliveReasons?.size ?? 0) === 0 &&
    task.finalizing !== !0 &&
    task.resuming !== !0 &&
    (task.pendingMessages?.length ?? 0) === 0 &&
    !hasPendingAgentWork(task.id, task.agentId)
  );
}
//@ chunk-231n2j4w.js:7554-7700 layout
function hasPendingAgentWork(taskId, agentId) {
  return (
    getTaskRunState().resumesInFlight.has(agentId) ||
    mg()
      .getCommandQueue()
      .some((m) => m.mode === "task-notification" && (m.taskId === taskId || m.agentId === agentId))
  );
}
//@ chunk-231n2j4w.js:7700-7788 layout
var Ce = new Set(["local_bash", "monitor_mcp", "monitor_ws", "mcp_task", "post_turn_memory"]);
//@ chunk-231n2j4w.js:7788-7877 facade-exports
function hasAgentTaskSurvivingClear(o) {
  return Object.values(o).some(
    (s) => !L(s) && AGENT_TASK_TYPES.has(s.type) && !isTerminalTaskStatus(s.status),
  );
}

export { clearConversation, hasAgentTaskSurvivingClear };
