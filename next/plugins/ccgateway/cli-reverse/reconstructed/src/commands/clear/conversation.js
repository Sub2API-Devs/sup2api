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
import {
  removeQueuedByFilter,
  isPassiveMainAgentCommand,
  commandQueueManager,
} from "../../utils/messageQueueManager.js";
import {
  retireConversationReplicas,
  disposeLiveState,
  resetNoticeBudgets,
  clearRefusedPublishBodies,
  resetForNewConversation,
} from "../../services/liveReplica/liveReplica.js";
import { executeSessionEndHooks, getSessionEndHookTimeoutMs } from "../../utils/hooks.js";
import { endMaintenanceAndForget } from "../../services/api/cacheKeepalive.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { notePendingConversationEdit } from "../../utils/shell/shellToolUtils.js";
import { setCurrentForKey } from "../../utils/currentRefByKey.js";
import { totalTokensReminderByRoot } from "../../utils/attachments/totalTokensReminder.js";
import { tokenCountFromLastAPIResponse } from "../../utils/tokens.js";
import { AGENT_TASK_TYPES, isCompletedBackgroundAgent } from "../../tasks/taskKinds.js";
import {
  hasCompletedWithFindings,
  initAgentOutputSymlink,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { clearSessionCaches } from "./caches.js";
import { androidEvidenceByHost } from "../../tools/BashTool/androidCommands.js";
import { detachedCallSlots, parseTaskNotificationToolUseId } from "../../services/tools/detachedToolCalls.js";
import { resetPickerState } from "../../memdir/findRelevantMemories.js";
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
import { persistBridgeArtifactFrames } from "../../utils/sessionTagRefresh.js";
import { setMcpOnClose } from "../../services/mcp/mcpWireUtils.js";
import { clearAllPlanSlugs } from "../../utils/plans.js";
import { isGmailAttachmentTool } from "../../bootstrap/stateSlices.js";
import { isBridgeStateFramesEnabled } from "../../bridge/bridgeGates.js";
import { normalizeUuidOrNull, identityAgentId2 } from "../../utils/agentId.js";
import { enqueueTaskNotification, getTaskRunState } from "../../utils/task/taskNotifications.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { devIntentTracker } from "../../services/projects/devIntent.js";
import { isRemoteEnvironmentAny } from "../../utils/remoteEnvironment.js";
import { runBundledSkillSessionResets } from "../../skills/bundledSkills.js";
import { announcementStateByHost } from "../../services/announcements/announcementState.js";
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import { ccrSessionIdForRefs } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { env } from "../../utils/env.js";
import { syncJobResumeSessionId } from "../../services/daemon/jobState.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { processSessionStartHooks } from "../../utils/sessionStart.js";
import { isAbortError, toError, withTelemetryMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasCarriableCron } from "../../services/compact/compactCarry.js";
import { withCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { describeStorageError } from "../../utils/agentMetadata.js";
import { setCwd } from "../../utils/Shell.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";

//@ chunk-231n2j4w.js:1904-1924 affinity
var RESPONSE_PAIR_RETIREMENT_HOOK = null;
var PAUSE_STAMPS_CARRY_HOOK = null;
//@ chunk-231n2j4w.js:1924-6914 facade-exports (2.1.88 match: clearConversation, 0.403)
async function* clearConversation({
  session,
  setMessages,
  readFileState,
  sessionEnvVars,
  toolState,
  memorySelector,
  getAppState,
  setAppState,
  sessionHooksRegistry,
  dialogStore,
  isolationLatch,
  taskRegistry,
  clearedSessionTitle,
  storageV5,
  credentials,
  deferSessionStartHooks,
  releaseDeferredSessionStartHooks,
  resetTrigger,
  resetUserMessageUuid,
  conversationOnly,
}) {
  resetObserverPairings(session);
  removeQueuedByFilter(isPassiveMainAgentCommand);
  retireConversationReplicas();
  disposeLiveState();
  resetNoticeBudgets();
  if (conversationOnly) {
    await conversationOnly.raiseSessionEnd();
    sessionHooksRegistry.clear(session.id);
  } else
    await executeSessionEndHooks(session, "clear", {
      sessionHooks: sessionHooksRegistry,
      getAppState,
      signal: AbortSignal.timeout(getSessionEndHookTimeoutMs()),
      storageV5,
      credentials,
    });
  endMaintenanceAndForget("conversation_clear");
  let killedIds = new Set();
  let preservedAgentIds = new Map();
  if (getAppState && isolationLatch?.current != null) {
    let filtered = Object.values(getAppState().tasks).filter(
      (task) => !isBackgroundTask(task) && (isLocalAgent(task) || isInProcessTeammateTask(task)),
    );
    if (filtered.every(canDropCompletedAgentOnClear)) {
      for (let task of filtered) {
        killedIds.add(task.id);
        if (isLocalAgent(task)) preservedAgentIds.set(task.id, task.agentId);
      }
    }
  }
  let shouldKillTask = (task) => isBackgroundTask(task) || killedIds.has(task.id);
  let keptAgentIds = new Set();
  let tasks = [];
  if (getAppState)
    for (let task of Object.values(getAppState().tasks)) {
      if (shouldKillTask(task)) continue;
      if (isLocalAgent(task)) {
        keptAgentIds.add(task.agentId);
        tasks.push(task);
      } else if (isInProcessTeammateTask(task)) keptAgentIds.add(task.identity.agentId);
    }
  releaseDeferredSessionStartHooks?.();
  notePendingConversationEdit("clear");
  setCurrentForKey(session, undefined);
  setMessages((messages) => {
    totalTokensReminderByRoot.of(session).rollOverContext("main", tokenCountFromLastAPIResponse(messages));
    return [];
  });
  let hasLiveAgents = getAppState
    ? Object.values(getAppState().tasks).some(
        (task) =>
          !shouldKillTask(task) &&
          AGENT_TASK_TYPES.has(task.type) &&
          (task.status === "running" || (isLocalAgent(task) && hasCompletedWithFindings(task))),
      )
    : false;
  clearSessionCaches(session, keptAgentIds, setAppState, toolState, storageV5, hasLiveAgents);
  if (!conversationOnly) restoreOriginalCwd();
  readFileState.clear();
  androidEvidenceByHost.of(session.host).reset();
  detachedCallSlots.of(session).discardAll();
  removeQueuedByFilter(
    (queued) =>
      queued.mode === "task-notification" &&
      typeof queued.value === "string" &&
      parseTaskNotificationToolUseId(queued.value) !== null,
  );
  sessionEnvVars?.clear();
  resetPickerState(memorySelector);
  if (isolationLatch && keptAgentIds.size === 0 && killedIds.size === 0) isolationLatch.current = null;
  if (getAppState) closeWebViews(getAppState);
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  let currentSessionAgentName = getCurrentSessionAgentName();
  let titleToKeep = !clearedSessionTitle && currentSessionTitle !== undefined;
  let tainted = titleToKeep && isConversationEgressTainted(pinSessionId(getSessionId()));
  let runningAgents;
  let goal;
  clearRefusedPublishBodies();
  if (setAppState) {
    dialogStore?.dismissKind(GOAL_PROPOSAL_DIALOG.kind);
    RESPONSE_PAIR_RETIREMENT_HOOK?.retireResponsePair(session);
    retainPathLinks(new Set());
    setAppState((prev) => {
      let nextTasks = {};
      let killedKeys = [];
      for (let [key, value] of Object.entries(prev.tasks)) {
        if (!shouldKillTask(value)) {
          nextTasks[key] =
            isLocalAgent(value) && value.waitingNoticeRecipient !== undefined
              ? {
                  ...value,
                  waitingNoticeRecipient: undefined,
                }
              : value;
          continue;
        }
        killedKeys.push(key);
        try {
          if (value.status === "running") {
            if (isLocalShellTask(value)) {
              value.shellCommand?.kill();
              value.shellCommand?.cleanup();
            }
            if ("abortController" in value) value.abortController?.abort();
          }
        } catch (error) {
          logError(error);
        }
        evictTaskOutput(key);
      }
      runningAgents = count(
        Object.values(nextTasks),
        (task) => !NON_AGENT_TASK_TYPES.has(task.type) && !isIdleCompletedAgent(task),
      );
      goal = prev.activeGoal;
      let transcripts = prev.transcripts;
      if (transcripts && killedKeys.length > 0) {
        transcripts = {
          ...transcripts,
        };
        for (let task of killedKeys) delete transcripts[task];
      }
      return {
        ...resetArtifactReadState(prev),
        tasks: nextTasks,
        ...(transcripts !== prev.transcripts && {
          transcripts,
        }),
        ...(prev.viewingAgentTaskId !== undefined &&
          killedKeys.includes(prev.viewingAgentTaskId) && {
            viewingAgentTaskId: undefined,
            viewSelectionMode: "none",
          }),
        runningSubagents: runningAgents === 0 ? 0 : prev.runningSubagents,
        ...{
          endedByModel: false,
        },
        attribution: createEmptyAttributionState(),
        cacheBreakerPhrase: undefined,
        sendMessagePins: {},
        agentNameRegistry: liveAgentNames(prev.agentNameRegistry, nextTasks),
        frameUrls: {},
        standaloneAgentContext:
          titleToKeep && prev.standaloneAgentContext?.name
            ? {
                name: prev.standaloneAgentContext.name,
              }
            : undefined,
        fileHistory: {
          snapshots: [],
          trackedFiles: new Set(),
          snapshotSequence: 0,
        },
      };
    });
    if (goal !== undefined) logGoalCleared(goal, "session_clear");
    persistBridgeArtifactFrames({});
  }
  if (
    isolationLatch &&
    keptAgentIds.size === 0 &&
    killedIds.size > 0 &&
    getAppState &&
    ![...killedIds].some(
      (id) =>
        Object.hasOwn(getAppState().tasks, id) || hasPendingAgentWork(id, preservedAgentIds.get(id) ?? id),
    ) &&
    !Object.values(getAppState().tasks).some(
      (task) => isLocalAgent(task) && [...preservedAgentIds.values()].includes(task.agentId),
    )
  )
    isolationLatch.current = null;
  if (taskRegistry && runningAgents === 0) taskRegistry.resetWebSearchBudget();
  if (getAppState) {
    for (let client of getAppState().mcp.clients)
      if (client.name === "ide" && client.type === "connected") {
        setMcpOnClose(client, undefined);
        let { clearServerCache } = require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
        await clearServerCache(client.name, client.config).catch(() => {});
      }
  }
  clearAllPlanSlugs();
  let sessionId = getSessionId();
  let titlePath = clearedSessionTitle ? (getMaterializedSessionFile() ?? getTranscriptPath()) : undefined;
  let suppressed = isSessionHistorySuppressed();
  let atisLatch = runningAgents === 0 && keptAgentIds.size === 0 ? undefined : getConversationAtisLatch();
  let toolsUsed =
    runningAgents === 0 && keptAgentIds.size === 0 ? undefined : getConversationToolsUsed().names();
  let filtered = getConversationToolsUsed().names().filter(isGmailAttachmentTool);
  let stamps = [...getCurrentSessionMemoryModeStamps()];
  let memoryOff = false;
  let autoMemoryOff = false;
  clearSessionMetadata();
  if (suppressed) holdSessionHistorySuppression();
  if (memoryOff) {
    setMemoryToggledOff(true);
    setRestoredMemoryPause(true);
  }
  if (autoMemoryOff) {
    setAutoMemoryOffThisSession(true);
    setRestoredAutoMemoryOff(true);
  }
  if (atisLatch !== undefined) setConversationAtisLatch(atisLatch);
  if (toolsUsed !== undefined) getConversationToolsUsed().replace(toolsUsed);
  else {
    getConversationToolsUsed().replace(filtered);
    markToolsUsedWritten();
  }
  let newConversationId = randomUUID();
  if (getIsNonInteractiveSession() || (isReplBridgeActive() && isBridgeStateFramesEnabled())) {
    let userUuid = resetTrigger === "clear" ? normalizeUuidOrNull(resetUserMessageUuid) : null;
    setCurrentForKey(session, newConversationId);
    enqueueTaskNotification({
      type: "conversation_reset",
      new_conversation_id: newConversationId,
      uuid: newConversationId,
      ...(resetTrigger !== undefined && {
        trigger: resetTrigger,
      }),
      ...(userUuid !== null && {
        user_message_uuid: userUuid,
      }),
      timestamp: new Date().toISOString(),
    });
    logFeatureOk("bridge_conversation_reset");
  }
  devIntentTracker.of(session.host).conversationReset();
  yield {
    type: "conversation_reset",
    newConversationId,
  };
  if (!conversationOnly) {
    saveSessionCostsForTransition(storageV5);
    resetCostState();
  }
  if (getIsNonInteractiveSession() && isRemoteEnvironmentAny() && hasRemoteWorkerEventLog() && !isDiskless())
    queueLeafCheckpointWithdrawal();
  let pinnedSessionId = pinSessionId(getSessionId());
  let taintedNow = tainted || (titleToKeep && isConversationEgressTainted(pinnedSessionId));
  let metadataPaths = new Map();
  for (let task of tasks)
    if (task.forkedSkillName === undefined) {
      let agentId = identityAgentId2(task.agentId);
      metadataPaths.set(agentId, getAgentMetadataPath(agentId));
    }
  regenerateSessionId({
    setCurrentAsParent: true,
    next: conversationOnly?.nextSessionId,
  });
  if (titleToKeep && currentSessionTitle !== undefined) cacheSessionTitle(currentSessionTitle);
  let resolved = Promise.resolve(true);
  runBundledSkillSessionResets();
  resetForNewConversation();
  announcementStateByHost.of(session).reset();
  getCliOwnedState().needsAuthNoticedThisSession.clear();
  ccrSessionIdForRefs(session);
  if (env.CLAUDE_CODE_SESSION_ID && !conversationOnly) process.env.CLAUDE_CODE_SESSION_ID = getSessionId();
  await resetSessionFilePointer();
  for (let stamp of PAUSE_STAMPS_CARRY_HOOK?.pauseStampsCarriedAcrossClear(
    getAppState?.().mcp.clients,
    stamps,
  ) ?? [])
    saveMemoryMode(
      {
        ...stamp,
        afterUuid: null,
      },
      storageV5,
    );
  dropSessionHistorySuppression();
  releasePrecautionarySuppressionFor(pinnedSessionId);
  if (conversationOnly) {
    await stopAgentsAndCarrySettings(tasks, metadataPaths, storageV5);
    return;
  }
  await syncJobResumeSessionId(getSessionId(), getTranscriptPath(), storageV5);
  if (isAgentSwarmsEnabled())
    await (await import("../../utils/swarm/sessionTaskList.js")).noteSessionTaskListAfterClear();
  if (clearedSessionTitle)
    await saveCustomTitle(sessionId, clearedSessionTitle, titlePath, "user", storageV5);
  else if (currentSessionTitle) {
    await saveCustomTitle(getSessionId(), currentSessionTitle, undefined, "user", storageV5);
    if (currentSessionAgentName)
      await saveAgentName(getSessionId(), currentSessionAgentName, undefined, "user", storageV5);
  }
  await stopAgentsAndCarrySettings(tasks, metadataPaths, storageV5);
  let { isCoordinatorMode } = require("../../coordinator/coordinatorMode.js");
  saveMode(isCoordinatorMode() ? "coordinator" : "normal");
  let worktreeSession = getCurrentWorktreeSession();
  if (worktreeSession) saveWorktreeState(worktreeSession, storageV5);
  if (isolationLatch?.current) saveIsolationLatch(isolationLatch.current, storageV5);
  if (deferSessionStartHooks) {
    deferSessionStartHooks((signal) =>
      processSessionStartHooks(session, "clear", {
        signal,
        storageV5,
        credentials,
      }).catch((error) => {
        if (isAbortError(error))
          logForDebugging(`SessionStart hooks after /clear aborted: ${toError(error).message}`);
        else logError(withTelemetryMessage(toError(error), "SessionStart hooks after /clear threw"));
        return [];
      }),
    );
    if (hasCarriableCron()) setMessages(withCronCarryAttachment);
    return;
  }
  let hookRows = await processSessionStartHooks(session, "clear", {
    storageV5,
    credentials,
  });
  if (hookRows.length > 0) setMessages(() => hookRows);
  if (hasCarriableCron()) setMessages(withCronCarryAttachment);
}
//@ chunk-231n2j4w.js:6914-7185 layout
/**
 * /clear 时停止运行中的后台代理，并把各代理的设置元数据写到新位置（失败只记日志）。
 */
async function stopAgentsAndCarrySettings(tasks, metadataPaths, storage) {
  for (let task of tasks) if (task.status === "running") initAgentOutputSymlink(task.agentId);
  await Promise.all(
    Array.from(metadataPaths, async ([agentId, path]) => {
      try {
        let agentMetadataAtPath = await readAgentMetadataAtPath(path, storage);
        if (agentMetadataAtPath) await writeAgentMetadata(agentId, agentMetadataAtPath, storage, true);
      } catch (error) {
        logForDebugging(
          `/clear did not carry the settings file of agent ${agentId}: ${describeStorageError(error)}`,
          {
            level: "error",
          },
        );
      }
    }),
  );
}
//@ chunk-231n2j4w.js:7185-7328 layout
function restoreOriginalCwd() {
  let originalCwd = getOriginalCwd();
  try {
    setCwd(originalCwd);
  } catch {
    logForDebugging(`/clear: originalCwd "${originalCwd}" no longer exists; falling back`);
    let projectRoot = getProjectRoot();
    if (projectRoot !== originalCwd)
      try {
        setCwd(projectRoot);
      } catch {}
  }
}
//@ chunk-231n2j4w.js:7328-7392 layout
function isBackgroundTask(task) {
  return "isBackgrounded" in task && task.isBackgrounded === false;
}
//@ chunk-231n2j4w.js:7392-7554 layout
function canDropCompletedAgentOnClear(task) {
  return (
    isLocalAgent(task) &&
    isCompletedBackgroundAgent(task) &&
    (task.keepaliveReasons?.size ?? 0) === 0 &&
    task.finalizing !== true &&
    task.resuming !== true &&
    (task.pendingMessages?.length ?? 0) === 0 &&
    !hasPendingAgentWork(task.id, task.agentId)
  );
}
//@ chunk-231n2j4w.js:7554-7700 layout
function hasPendingAgentWork(taskId, agentId) {
  return (
    getTaskRunState().resumesInFlight.has(agentId) ||
    commandQueueManager()
      .getCommandQueue()
      .some(
        (queued) =>
          queued.mode === "task-notification" && (queued.taskId === taskId || queued.agentId === agentId),
      )
  );
}
//@ chunk-231n2j4w.js:7700-7788 layout
var NON_AGENT_TASK_TYPES = new Set([
  "local_bash",
  "monitor_mcp",
  "monitor_ws",
  "mcp_task",
  "post_turn_memory",
]);
//@ chunk-231n2j4w.js:7788-7877 facade-exports
function hasAgentTaskSurvivingClear(tasks) {
  return Object.values(tasks).some(
    (task) =>
      !isBackgroundTask(task) && AGENT_TASK_TYPES.has(task.type) && !isTerminalTaskStatus(task.status),
  );
}
export { clearConversation, hasAgentTaskSurvivingClear };
