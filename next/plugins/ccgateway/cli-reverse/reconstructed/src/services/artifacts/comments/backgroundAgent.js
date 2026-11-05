/**
 * services/artifacts/comments/backgroundAgent.ts
 *
 * 2.1.316 新增：把评论线程交给后台 agent 处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (31)
 * attribution: placement 31
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { SessionRootSlot } from "../../../bootstrap/sessionSlices.js";
import { getRootSession, getIsNonInteractiveSession, mainAgentId } from "../../../bootstrap/state.js";
import { AGENT } from "../../../tools/AgentTool/constants.js";
import { SENDMESSAGE } from "../../../tools/SendMessageTool/constants.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../../tools/WorkflowTool/constants.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../../tools/ScheduleWakeupTool/prompt.js";
import { CRON_CREATE_TOOL_NAME, CRON_DELETE_TOOL_NAME } from "../../../tools/ScheduleCronTool/prompt.js";
import { REMOTETRIGGER } from "../../../tools/RemoteTriggerTool/prompt.js";
import { matchesToolName } from "../../../Tool.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { coerceBooleanString } from "../../../utils/spellcheck.js";
import { useTeammateLifecycleNotification } from "../../../hooks/notifs/useTeammateShutdownNotification.js";
import { isLocalAgent } from "../../../state/teammateViewHelpers.js";
import { keepaliveReasons, skipsTranscript } from "../../../tasks/taskKinds.js";
import { isCoordinatorMode_2 } from "../../../coordinator/coordinatorMode.js";
import {
  sendMessageToAgent,
  drainPendingMessages,
  dropDeniedResumeMessages,
} from "../../../tasks/LocalAgentTask/pendingMessages.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { queuePendingMessage, killAsyncAgent } from "../../../tasks/LocalAgentTask/LocalAgentTask.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { createInformationalSystemMessage } from "../../../utils/messages.js";
import { isForegroundBusy } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { observationStamp, sourcelessObservation } from "../readObservation.js";
import { getTaskRunState } from "../../../utils/task/taskNotifications.js";
import { emitArtifactSummonStatus, registerSummonHandOff } from "../artifactNotices.js";
import { countWhere } from "../../../utils/collections.js";
import { markAutoReactNoticePending } from "../shareEntries.js";
import { enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../../utils/confusables.js";
import { commentsWaitingNotice } from "../../../tools/ArtifactTool/artifactNotices.js";
import { buildMissedCommentPrompt } from "./threadPrompts.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c0pq6qyx.js:15421-15462 placement
/**
 * 后台评论 agent 的开关名与每个会话最多 5 个线程 agent 的上限。
 */
var TENGU_SORREL_TRELLIS_TENON = "tengu_sorrel_trellis_tenon";
var MAX_THREAD_AGENTS = 5;
//@ chunk-c0pq6qyx.js:15462-15498 placement
/**
 * 导出函数 `isThreadAgentEnabled`：返回 getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_TENON, !1) === !0。
 */
function isThreadAgentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_TENON, false) === true;
}
//@ chunk-c0pq6qyx.js:15498-15553 placement
class ThreadAgentState {
  byThread = new Map();
  spawning = new Map();
  watching = false;
}
//@ chunk-c0pq6qyx.js:15553-15579 placement
var threadAgentSlot; // deferred: uses SessionRootSlot (../../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c0pq6qyx.js:15553", () => {
  threadAgentSlot = new SessionRootSlot(() => new ThreadAgentState());
});
//@ chunk-c0pq6qyx.js:15579-15611 placement
function threadAgentState() {
  return threadAgentSlot.of(getRootSession());
}
//@ chunk-c0pq6qyx.js:15611-15674 placement
function threadKey(slug, threadId) {
  return `${slug.toLowerCase()}:${threadId.toLowerCase()}`;
}
//@ chunk-c0pq6qyx.js:15674-15707 placement
/**
 * 后台评论 agent 权限包装里禁止它再调用的工具（Agent、SendMessage、Monitor、workflow、定时任务等）。
 */
var FORBIDDEN_FROM_THREAD_AGENT; // deferred: uses AGENT (../../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c0pq6qyx.js:15674", () => {
  FORBIDDEN_FROM_THREAD_AGENT = [
    AGENT,
    SENDMESSAGE,
    MONITOR,
    WORKFLOW_TOOL_NAME,
    SCHEDULE_WAKEUP_TOOL_NAME,
    CRON_CREATE_TOOL_NAME,
    CRON_DELETE_TOOL_NAME,
    REMOTETRIGGER,
  ];
});
//@ chunk-c0pq6qyx.js:15707-16267 placement
/**
 * 后台评论 agent 的权限包装：禁止其再派生后台任务等。
 */
function makeBackgroundAgentPermissionGate(options) {
  return async (tool, input, toolUseContext, message, toolUseID, permissionResult) => {
    let isLocalTool = tool.mcpInfo === undefined;
    let forbidden =
      (matchesToolName(tool, BASH_TOOL_NAME) || matchesToolName(tool, POWERSHELL_TOOL_NAME)) &&
      coerceBooleanString(input.run_in_background) === true;
    if (isLocalTool && (forbidden || FORBIDDEN_FROM_THREAD_AGENT.some((name) => matchesToolName(tool, name))))
      return {
        behavior: "deny",
        message:
          "As a background comment agent you cannot start subagents, monitors, background commands or scheduled work, or message other agents. This comment thread is your only job: do what it needs in this run, reply on the thread, report and stop. Anything else belongs to the main session.",
        decisionReason: {
          type: "other",
          reason: "artifact comment agent scope",
        },
      };
    return options(tool, input, toolUseContext, message, toolUseID, permissionResult);
  };
}
//@ chunk-c0pq6qyx.js:16267-16320 placement
function keepsLocalAgentAlive(state) {
  return useTeammateLifecycleNotification(state) || (isLocalAgent(state) && state.resuming === true);
}
//@ chunk-c0pq6qyx.js:16320-16629 placement
/**
 * 判断已完成的本地代理是否仍有存活理由：工作流、未跳过记录的 monitor 任务，或非技能 fork 的子代理在保活它。
 */
function hasLiveKeepalive(state, taskRegistry) {
  if (!isLocalAgent(state) || state.status !== "completed") return false;
  for (let reason of keepaliveReasons(state)) {
    if (reason.startsWith("workflow:")) return true;
    if (reason.startsWith("monitor:")) {
      let taskId = taskRegistry.get(reason.slice(8));
      if (taskId === undefined || !skipsTranscript(taskId)) return true;
    }
    if (reason.startsWith("agent:")) {
      let taskId = taskRegistry.get(reason.slice(6));
      if (isLocalAgent(taskId) && taskId.forkedSkillName === undefined) return true;
    }
  }
  return false;
}
//@ chunk-c0pq6qyx.js:16629-16792 placement
/**
 * 取某评论线程对应的后台代理；代理已不在运行时移除记录并把挂着的评论标为 cancelled。
 */
function getLiveThreadAgent(state, threadId) {
  let entry = state.byThread.get(threadId);
  if (entry === undefined) return;
  if (keepsLocalAgentAlive(entry.taskRegistry.get(entry.agentId))) return entry;
  state.byThread.delete(threadId);
  settleComments(entry.comments, "cancelled");
  return;
}
//@ chunk-c0pq6qyx.js:16792-16991 placement
/**
 * 判断某 artifact 是否有正在启动或运行的评论线程后台代理。
 */
function hasThreadAgentForSlug(slug) {
  let state = threadAgentState();
  let prefix = `${slug.toLowerCase()}:`;
  for (let key of state.spawning.keys()) if (key.startsWith(prefix)) return true;
  for (let key of [...state.byThread.keys()])
    if (key.startsWith(prefix) && getLiveThreadAgent(state, key) !== undefined) return true;
  return false;
}
//@ chunk-c0pq6qyx.js:16991-17141 placement
function countThreadAgents(slug) {
  let count = 0;
  for (let key of slug.spawning.keys()) if (!slug.byThread.has(key)) count += 1;
  for (let key of [...slug.byThread.keys()]) if (getLiveThreadAgent(slug, key) !== undefined) count += 1;
  return count;
}
//@ chunk-c0pq6qyx.js:17141-17252 placement
async function canForkThreadAgent() {
  let { getLastCacheSafeParams } = await import("../../../utils/forkedAgent.js");
  return getLastCacheSafeParams() !== null && !isCoordinatorMode_2();
}
//@ chunk-c0pq6qyx.js:17252-17372 placement
/**
 * 判断能否把评论线程交给后台代理：该线程已有在启动/运行的代理，或代理总数未达上限且可以 fork。
 */
async function canHandToThreadAgent(slug, id) {
  let state = threadAgentState();
  let key = threadKey(slug, id);
  if (state.spawning.has(key) || getLiveThreadAgent(state, key) !== undefined) return true;
  return countThreadAgents(state) < MAX_THREAD_AGENTS && (await canForkThreadAgent());
}
//@ chunk-c0pq6qyx.js:17372-17700 placement
async function spawnOrJoinThreadAgent(request) {
  let state = threadAgentState();
  let key = threadKey(request.slug, request.threadId);
  for (let pending = state.spawning.get(key); pending !== undefined; pending = state.spawning.get(key)) {
    let agent = await pending;
    if (agent.outcome === "fallback") return agent;
  }
  let liveThreadAgent = getLiveThreadAgent(state, key);
  if (liveThreadAgent !== undefined) return joinThreadAgent(state, liveThreadAgent, request);
  if (countThreadAgents(state) >= MAX_THREAD_AGENTS) return fallbackFromFork(request, "cap");
  let entry = forkThreadAgent(state, key, request);
  state.spawning.set(key, entry);
  try {
    return await entry;
  } finally {
    state.spawning.delete(key);
  }
}
//@ chunk-c0pq6qyx.js:17700-18078 placement
/**
 * 把新评论并入已在运行的线程代理：不是同一召唤时追加跟进消息并恢复代理；登记评论回调并打点 joined。
 */
function joinThreadAgent(state, thread, key) {
  let gestureAt = key.summon?.gestureAt;
  if (!(
    gestureAt !== undefined && thread.comments.some((comment) => comment.summon?.gestureAt === gestureAt)
  )) {
    sendMessageToAgent(thread.agentId, key.followUp, thread.taskRegistry);
    thread.followUps.add(key.followUp);
    resumeThreadAgent(state, thread, key);
  }
  thread.comments.push({
    summon: key.summon,
    onSettled: key.onSettled,
  });
  logFeatureOk("artifact_comments_autoreact", {
    handed_to_fork: true,
    joined: true,
    seeded: key.route === "seeded",
  });
  return {
    outcome: "joined",
    agentId: thread.agentId,
  };
}
//@ chunk-c0pq6qyx.js:18078-19437 placement
function resumeThreadAgent(request, thread, threadState) {
  if (!getIsNonInteractiveSession() || !hasPendingAgentMessages(thread)) return;
  (async () => {
    let agent;
    try {
      let [
        { getLastCacheSafeParams: getCacheSafeParams },
        {
          resumeAgentBackground,
          isResumeDenied,
          ResumeAgentStateError,
          AgentResumeInProgressError,
          AgentResumeTransientError,
        },
        { isShuttingDown },
        { isTerminalShutdown },
        { contextAfterTurn },
      ] = await Promise.all([
        import("../../../utils/forkedAgent.js"),
        import("../../../tools/AgentTool/resumeAgent.js"),
        import("../../../utils/gracefulShutdown.js"),
        import("../../../utils/terminalShutdown.js"),
        import("../../../utils/permissions/applyContextLayers.lazy.js"),
      ]);
      let snapshot = getCacheSafeParams();
      if (snapshot === null || isShuttingDown() || isTerminalShutdown() || !hasPendingAgentMessages(thread))
        return;
      let [firstMessage, ...restMessages] = drainPendingMessages(thread.agentId, thread.taskRegistry);
      if (firstMessage === undefined) return;
      agent = firstMessage;
      queuePendingMessage(thread.agentId, restMessages, thread.taskRegistry);
      let resumed;
      try {
        resumed = await resumeAgentBackground({
          agentId: thread.agentId,
          prompt: firstMessage.text,
          promptOrigin: firstMessage.origin,
          promptToolsUsed: firstMessage.toolsUsed,
          promptIsMeta: firstMessage.isMeta,
          toolUseContext: contextAfterTurn(snapshot.toolUseContext),
          canUseTool: threadState.canUseTool,
        });
      } catch (error) {
        queuePendingMessage(
          thread.agentId,
          [firstMessage, ...drainPendingMessages(thread.agentId, thread.taskRegistry)],
          thread.taskRegistry,
        );
        agent = undefined;
        if (error instanceof AgentResumeInProgressError || error instanceof AgentResumeTransientError) {
          logFeatureSad("artifact_comments_autoreact", "fork_resume_parked_busy");
          return;
        }
        if (error instanceof ResumeAgentStateError) {
          let key = threadKey(threadState.slug, threadState.threadId);
          if (request.byThread.get(key) === thread) request.byThread.delete(key);
          logFeatureBad("artifact_comments_autoreact", "fork_resume_parked_refused");
          notifyThreadAgentHandoff(thread.request, thread.comments);
          return;
        }
        throw error;
      }
      if (isResumeDenied(resumed)) {
        agent = undefined;
        dropDeniedResumeMessages(
          thread.agentId,
          thread.taskRegistry,
          [firstMessage, ...restMessages],
          resumed,
        );
      }
    } catch (error) {
      if (agent !== undefined) queuePendingMessage(thread.agentId, [agent], thread.taskRegistry);
      if (!isAbortError(error)) logError(error);
      logFeatureBad("artifact_comments_autoreact", "fork_resume_parked_failed");
    }
  })();
}
//@ chunk-c0pq6qyx.js:19437-19576 placement
function hasPendingAgentMessages(state) {
  let task = state.taskRegistry.get(state.agentId);
  return (
    isLocalAgent(task) &&
    task.status !== "running" &&
    task.resuming !== true &&
    task.pendingMessages.length > 0 &&
    useTeammateLifecycleNotification(task)
  );
}
//@ chunk-c0pq6qyx.js:19576-20658 placement
async function forkThreadAgent(state, threadKey, request) {
  let context;
  let forkMessages;
  let extra;
  try {
    let [{ getLastCacheSafeParams: getCacheSafeParams }, { spawnForkFromDirective }, { contextAfterTurn }] =
      await Promise.all([
        import("../../../utils/forkedAgent.js"),
        import("../../../tools/AgentTool/forkDirective.js"),
        import("../../../utils/permissions/applyContextLayers.lazy.js"),
      ]);
    let snapshot = getCacheSafeParams();
    if (snapshot === null) return fallbackFromFork(request, "no_snapshot");
    context = {
      ...contextAfterTurn(snapshot.toolUseContext),
      messages: snapshot.forkContextMessages,
      renderedSystemPrompt: snapshot.systemPrompt,
    };
    forkMessages = snapshot.forkContextMessages;
    watchThreadAgents(state);
    let forked = await spawnForkFromDirective(request.directive, context, request.canUseTool, {
      nameHint: `comment ${request.slug.slice(0, 8)}`,
      nameHintHoldsNoUserContent: ARTIFACT_SLUG_RE.test(request.slug),
      description: `Comment on ${request.artifactName}`,
      narrowCanUseTool: makeBackgroundAgentPermissionGate,
    });
    if (forked === null) return fallbackFromFork(request, "fork_refused");
    extra = forked.agentId;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return fallbackFromFork(request, "fork_error");
  }
  state.byThread.set(threadKey, {
    agentId: extra,
    request,
    taskRegistry: context.taskRegistry,
    comments: [
      {
        summon: request.summon,
        onSettled: request.onSettled,
      },
    ],
    followUps: new Set(),
  });
  try {
    propagateReadVersion(context, forkMessages, request.slug, extra);
    context.appendSystemMessage?.(
      createInformationalSystemMessage(
        `Comment on ${request.artifactName}: handling it in a background agent`,
        "notice",
      ),
    );
    logFeatureOk("artifact_comments_autoreact", {
      handed_to_fork: true,
      seeded: request.route === "seeded",
    });
  } catch (error) {
    logError(error);
  }
  return {
    outcome: "spawned",
    agentId: extra,
  };
}
//@ chunk-c0pq6qyx.js:20658-20931 placement
function propagateReadVersion(agentContext, messages, slug, replyId) {
  let artifactReadObservation = agentContext.getArtifactReadObservation(slug);
  let main = artifactReadObservation.observers?.main;
  if (artifactReadObservation.ver === undefined || main === undefined) return;
  if (
    !(main === ""
      ? !isForegroundBusy()
      : messages.some((message) => message.type === "assistant" && message.message.id === main))
  )
    return;
  agentContext.setArtifactReadVersion(
    slug,
    artifactReadObservation.ver,
    observationStamp(
      replyId,
      main === "" ? undefined : main,
      sourcelessObservation(undefined, slug, artifactReadObservation.ver, main),
    ),
  );
}
//@ chunk-c0pq6qyx.js:20931-21087 placement
function fallbackFromFork(agentId, key) {
  (key === "fork_error" ? logFeatureBad : logFeatureSad)(
    "artifact_comments_autoreact",
    `fork_fallback_${key}`,
    {
      seeded: agentId.route === "seeded",
    },
  );
  return {
    outcome: "fallback",
    reason: key,
  };
}
//@ chunk-c0pq6qyx.js:21087-21158 placement
function settleComments(comments, outcome = "completed") {
  for (let comment of comments.splice(0)) comment.onSettled?.(outcome);
}
//@ chunk-c0pq6qyx.js:21158-21407 placement
/**
 * 只订阅一次后台代理的结束与恢复失败事件：结束时处理线程代理收尾，终止性恢复失败时交回主会话，消息无法投递时提示。
 */
function watchThreadAgents(host) {
  if (host.watching) return;
  host.watching = true;
  getTaskRunState().agentSettled.subscribe((agentId, threadKey, reason) => {
    try {
      onThreadAgentSettled(host, agentId, threadKey, reason?.stranded === true);
    } catch (error) {
      logError(error);
    }
  });
  getTaskRunState().agentResumeFailed.subscribe((agentId, error) => {
    try {
      if (error.terminal) handBackOnResumeFailure(host, agentId);
      else notifyResumeDenied(host, agentId, error.undeliverable);
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-c0pq6qyx.js:21407-21486 placement
function findThreadAgentByAgentId(state, agentId) {
  for (let [threadKey, entry] of state.byThread) if (entry.agentId === agentId) return [threadKey, entry];
  return;
}
//@ chunk-c0pq6qyx.js:21486-21656 placement
function settleSummonStatuses(comments, outcome) {
  let statuses =
    outcome === "failed"
      ? {
          status: "failed",
          reason: "post_failed",
        }
      : {
          status: "declined",
          reason: "auto_reply_off",
        };
  for (let comment of comments)
    if (comment.summon !== undefined) emitArtifactSummonStatus(comment.summon, statuses);
}
//@ chunk-c0pq6qyx.js:21656-22456 placement
function onThreadAgentSettled(request, agentId, taskRegistry, settledNormally) {
  let threadAgentByAgentId = findThreadAgentByAgentId(request, agentId);
  if (threadAgentByAgentId === undefined) return;
  let [threadAgent, threadState] = threadAgentByAgentId;
  let task = threadState.taskRegistry.get(agentId);
  let shown =
    taskRegistry === "completed" &&
    !settledNormally &&
    !(isLocalAgent(task) && task.quietlyParked === true) &&
    hasLiveKeepalive(task, threadState.taskRegistry);
  if (
    taskRegistry === "completed" &&
    !shown &&
    (keepsLocalAgentAlive(task) || (settledNormally && !getIsNonInteractiveSession()))
  ) {
    if (settledNormally) resumeThreadAgent(request, threadState, threadState.request);
    return;
  }
  request.byThread.delete(threadAgent);
  if (taskRegistry !== "completed") {
    settleSummonStatuses(threadState.comments, taskRegistry);
    settleComments(threadState.comments, "cancelled");
    return;
  }
  if (isLocalAgent(task) && task.quietlyParked === true) {
    settleSummonStatuses(threadState.comments, "killed");
    settleComments(threadState.comments, "cancelled");
    return;
  }
  let followUpCount = isLocalAgent(task)
    ? countWhere(task.pendingMessages, (message) => threadState.followUps.has(message.text))
    : 0;
  let dropped = settledNormally
    ? threadState.comments.splice(Math.max(1, threadState.comments.length - followUpCount))
    : [];
  if (dropped.length > 0) {
    let filtered = drainPendingMessages(agentId, threadState.taskRegistry).filter(
      (message) => !threadState.followUps.has(message.text),
    );
    queuePendingMessage(agentId, filtered, threadState.taskRegistry);
    settleComments(threadState.comments);
    rehandToThreadAgent(threadState.request, dropped);
    return;
  }
  settleComments(threadState.comments);
  if (shown) {
    logFeatureBad("artifact_comments_autoreact", "fork_parked_on_refused_work");
    killAsyncAgent(agentId, threadState.taskRegistry, "system");
  }
}
//@ chunk-c0pq6qyx.js:22456-22619 placement
function handBackOnResumeFailure(agentId, threadKey) {
  let threadAgentByAgentId = findThreadAgentByAgentId(agentId, threadKey);
  if (threadAgentByAgentId === undefined) return;
  let [agentIdArg, entry] = threadAgentByAgentId;
  agentId.byThread.delete(agentIdArg);
  logFeatureBad("artifact_comments_autoreact", "fork_resume_failed");
  notifyThreadAgentHandoff(entry.request, entry.comments);
}
//@ chunk-c0pq6qyx.js:22619-22819 placement
function notifyResumeDenied(agentId, threadKey, undeliverable) {
  let entry = findThreadAgentByAgentId(agentId, threadKey)?.[1];
  if (
    entry === undefined ||
    entry.comments.length === 0 ||
    !undeliverable.some((message) => entry.followUps.has(message.text))
  )
    return;
  logFeatureSad("artifact_comments_autoreact", "fork_resume_denied");
  notifyThreadAgentHandoff(entry.request, entry.comments);
}
//@ chunk-c0pq6qyx.js:22819-23167 placement
/**
 * 重新把评论交给线程代理；回退时打点（区分达到上限）并通知主会话接手，异常时把评论标为失败。
 */
async function rehandToThreadAgent(request, rehandRequest) {
  try {
    let agent = await spawnOrJoinThreadAgent({
      ...request,
      summon: undefined,
      onSettled: undefined,
    });
    if (agent.outcome !== "fallback") {
      threadAgentState()
        .byThread.get(threadKey(request.slug, request.threadId))
        ?.comments.push(...rehandRequest);
      return;
    }
    if (agent.reason === "cap") logFeatureSad("artifact_comments_autoreact", "fork_rehand_fallback_cap");
    else logFeatureBad("artifact_comments_autoreact", "fork_rehand_fallback");
    notifyThreadAgentHandoff(request, rehandRequest);
  } catch (error) {
    logError(error);
    settleComments(rehandRequest);
  }
}
//@ chunk-c0pq6qyx.js:23167-23552 placement
function notifyThreadAgentHandoff(request, comments) {
  let summon = comments.findLast((comment) => comment.summon !== undefined)?.summon;
  markAutoReactNoticePending(request.slug);
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: "artifact-auto-react",
      summary: escapeXml(commentsWaitingNotice(request.artifactName)),
      body: `
${escapeXml(buildMissedCommentPrompt(request))}`,
    }),
    mode: "task-notification",
    origin: {
      kind: "task-notification",
      source: "artifact-auto-react",
      slug: request.slug,
      displayName: request.artifactName,
    },
    ...(summon !== undefined && {
      uuid: registerSummonHandOff(summon),
    }),
    artifactCommentTurn: "handback",
    agentId: mainAgentId(),
  });
  settleComments(comments);
}
export { isThreadAgentEnabled, spawnOrJoinThreadAgent, hasThreadAgentForSlug, canHandToThreadAgent };
