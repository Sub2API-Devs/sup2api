/**
 * services/artifacts/comments/backgroundAgent.ts
 *
 * 2.1.316 新增：把评论线程交给后台 agent 处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (31)
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
import { toolMatchesName } from "../../../Tool.js";
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
import { createInformationalSystemMessage } from "../../../utils/messages.js";
import { isForegroundBusy } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { observationStamp, sourcelessObservation } from "../readObservation.js";
import { getTaskRunState } from "../../../utils/task/taskNotifications.js";
import { emitArtifactSummonStatus, registerSummonHandOff } from "../artifactNotices.js";
import { count } from "../../../utils/collections.js";
import { markAutoReactNoticePending } from "../shareEntries.js";
import { enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../../utils/confusables.js";
import { commentsWaitingNotice } from "../../../tools/ArtifactTool/artifactNotices.js";
import { buildMissedCommentPrompt } from "./threadPrompts.js";

//@ chunk-9tgt55am.js:15307-15348 placement
/**
 * 后台评论 agent 的开关名与每个会话最多 5 个线程 agent 的上限。
 */
var TENGU_SORREL_TRELLIS_TENON = "tengu_sorrel_trellis_tenon";
var MAX_THREAD_AGENTS = 5;
//@ chunk-9tgt55am.js:15348-15384 placement
/**
 * 导出函数 `isThreadAgentEnabled`：返回 getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_TENON, !1) === !0。
 */
function isThreadAgentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_TENON, false) === true;
}
//@ chunk-9tgt55am.js:15384-15439 placement
class ThreadAgentState {
  byThread = new Map();
  spawning = new Map();
  watching = false;
}
//@ chunk-9tgt55am.js:15439-15465 placement
var threadAgentSlot = new SessionRootSlot(() => new ThreadAgentState());
//@ chunk-9tgt55am.js:15465-15497 placement
function threadAgentState() {
  return threadAgentSlot.of(getRootSession());
}
//@ chunk-9tgt55am.js:15497-15560 placement
function threadKey(slug, threadId) {
  return `${slug.toLowerCase()}:${threadId.toLowerCase()}`;
}
//@ chunk-9tgt55am.js:15560-15593 placement
/**
 * 后台评论 agent 权限包装里禁止它再调用的工具（Agent、SendMessage、Monitor、workflow、定时任务等）。
 */
var FORBIDDEN_FROM_THREAD_AGENT = [
  AGENT,
  SENDMESSAGE,
  MONITOR,
  WORKFLOW_TOOL_NAME,
  SCHEDULE_WAKEUP_TOOL_NAME,
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  REMOTETRIGGER,
];
//@ chunk-9tgt55am.js:15593-16153 placement
/**
 * 后台评论 agent 的权限包装：禁止其再派生后台任务等。
 */
function makeBackgroundAgentPermissionGate(e) {
  return async (t, n, a, r, s, d) => {
    let h = t.mcpInfo === undefined;
    let y =
      (toolMatchesName(t, BASH_TOOL_NAME) || toolMatchesName(t, POWERSHELL_TOOL_NAME)) &&
      coerceBooleanString(n.run_in_background) === true;
    if (h && (y || FORBIDDEN_FROM_THREAD_AGENT.some((C) => toolMatchesName(t, C))))
      return {
        behavior: "deny",
        message:
          "As a background comment agent you cannot start subagents, monitors, background commands or scheduled work, or message other agents. This comment thread is your only job: do what it needs in this run, reply on the thread, report and stop. Anything else belongs to the main session.",
        decisionReason: {
          type: "other",
          reason: "artifact comment agent scope",
        },
      };
    return e(t, n, a, r, s, d);
  };
}
//@ chunk-9tgt55am.js:16153-16206 placement
function keepsLocalAgentAlive(e) {
  return useTeammateLifecycleNotification(e) || (isLocalAgent(e) && e.resuming === true);
}
//@ chunk-9tgt55am.js:16206-16515 placement
/**
 * 判断已完成的本地代理是否仍有存活理由：工作流、未跳过记录的 monitor 任务，或非技能 fork 的子代理在保活它。
 */
function hasLiveKeepalive(e, taskRegistry) {
  if (!isLocalAgent(e) || e.status !== "completed") return false;
  for (let n of keepaliveReasons(e)) {
    if (n.startsWith("workflow:")) return true;
    if (n.startsWith("monitor:")) {
      let a = taskRegistry.get(n.slice(8));
      if (a === undefined || !skipsTranscript(a)) return true;
    }
    if (n.startsWith("agent:")) {
      let a = taskRegistry.get(n.slice(6));
      if (isLocalAgent(a) && a.forkedSkillName === undefined) return true;
    }
  }
  return false;
}
//@ chunk-9tgt55am.js:16515-16678 placement
/**
 * 取某评论线程对应的后台代理；代理已不在运行时移除记录并把挂着的评论标为 cancelled。
 */
function getLiveThreadAgent(e, t) {
  let n = e.byThread.get(t);
  if (n === undefined) return;
  if (keepsLocalAgentAlive(n.taskRegistry.get(n.agentId))) return n;
  e.byThread.delete(t);
  settleComments(n.comments, "cancelled");
  return;
}
//@ chunk-9tgt55am.js:16678-16877 placement
/**
 * 判断某 artifact 是否有正在启动或运行的评论线程后台代理。
 */
function hasThreadAgentForSlug(e) {
  let t = threadAgentState();
  let n = `${e.toLowerCase()}:`;
  for (let key of t.spawning.keys()) if (key.startsWith(n)) return true;
  for (let key of [...t.byThread.keys()])
    if (key.startsWith(n) && getLiveThreadAgent(t, key) !== undefined) return true;
  return false;
}
//@ chunk-9tgt55am.js:16877-17027 placement
function countThreadAgents(e) {
  let t = 0;
  for (let key of e.spawning.keys()) if (!e.byThread.has(key)) t += 1;
  for (let key of [...e.byThread.keys()]) if (getLiveThreadAgent(e, key) !== undefined) t += 1;
  return t;
}
//@ chunk-9tgt55am.js:17027-17138 placement
async function canForkThreadAgent() {
  let { getLastCacheSafeParams } = await import("./chunk-qnggsbt9.js");
  return getLastCacheSafeParams() !== null && !isCoordinatorMode_2();
}
//@ chunk-9tgt55am.js:17138-17258 placement
/**
 * 判断能否把评论线程交给后台代理：该线程已有在启动/运行的代理，或代理总数未达上限且可以 fork。
 */
async function canHandToThreadAgent(slug, id) {
  let n = threadAgentState();
  let a = threadKey(slug, id);
  if (n.spawning.has(a) || getLiveThreadAgent(n, a) !== undefined) return true;
  return countThreadAgents(n) < MAX_THREAD_AGENTS && (await canForkThreadAgent());
}
//@ chunk-9tgt55am.js:17258-17586 placement
async function spawnOrJoinThreadAgent(e) {
  let t = threadAgentState();
  let n = threadKey(e.slug, e.threadId);
  for (let s = t.spawning.get(n); s !== undefined; s = t.spawning.get(n)) {
    let d = await s;
    if (d.outcome === "fallback") return d;
  }
  let liveThreadAgent = getLiveThreadAgent(t, n);
  if (liveThreadAgent !== undefined) return joinThreadAgent(t, liveThreadAgent, e);
  if (countThreadAgents(t) >= MAX_THREAD_AGENTS) return fallbackFromFork(e, "cap");
  let r = forkThreadAgent(t, n, e);
  t.spawning.set(n, r);
  try {
    return await r;
  } finally {
    t.spawning.delete(n);
  }
}
//@ chunk-9tgt55am.js:17586-17964 placement
/**
 * 把新评论并入已在运行的线程代理：不是同一召唤时追加跟进消息并恢复代理；登记评论回调并打点 joined。
 */
function joinThreadAgent(e, liveThreadAgent, n) {
  let gestureAt = n.summon?.gestureAt;
  if (!(
    gestureAt !== undefined &&
    liveThreadAgent.comments.some((comment) => comment.summon?.gestureAt === gestureAt)
  )) {
    sendMessageToAgent(liveThreadAgent.agentId, n.followUp, liveThreadAgent.taskRegistry);
    liveThreadAgent.followUps.add(n.followUp);
    resumeThreadAgent(e, liveThreadAgent, n);
  }
  liveThreadAgent.comments.push({
    summon: n.summon,
    onSettled: n.onSettled,
  });
  logFeatureOk("artifact_comments_autoreact", {
    handed_to_fork: true,
    joined: true,
    seeded: n.route === "seeded",
  });
  return {
    outcome: "joined",
    agentId: liveThreadAgent.agentId,
  };
}
//@ chunk-9tgt55am.js:17964-19321 placement
function resumeThreadAgent(e, t, n) {
  if (!getIsNonInteractiveSession() || !hasPendingAgentMessages(t)) return;
  (async () => {
    let a;
    try {
      let [
        { getLastCacheSafeParams: r },
        {
          resumeAgentBackground: s,
          isResumeDenied: d,
          ResumeAgentStateError: h,
          AgentResumeInProgressError: y,
          AgentResumeTransientError: C,
        },
        { isShuttingDown: R },
        { isTerminalShutdown: b },
        { contextAfterTurn: N },
      ] = await Promise.all([
        import("./chunk-qnggsbt9.js"),
        import("./chunk-sz4rbr30.js"),
        import("./chunk-r3wdn2dp.js"),
        import("./chunk-7wcekf6q.js"),
        import("./chunk-bvy3yerb.js"),
      ]);
      let S = r();
      if (S === null || R() || b() || !hasPendingAgentMessages(t)) return;
      let [w, ...L] = drainPendingMessages(t.agentId, t.taskRegistry);
      if (w === undefined) return;
      a = w;
      queuePendingMessage(t.agentId, L, t.taskRegistry);
      let P;
      try {
        P = await s({
          agentId: t.agentId,
          prompt: w.text,
          promptOrigin: w.origin,
          promptToolsUsed: w.toolsUsed,
          promptIsMeta: w.isMeta,
          toolUseContext: N(S.toolUseContext),
          canUseTool: n.canUseTool,
        });
      } catch (error) {
        queuePendingMessage(
          t.agentId,
          [w, ...drainPendingMessages(t.agentId, t.taskRegistry)],
          t.taskRegistry,
        );
        a = undefined;
        if (error instanceof y || error instanceof C) {
          logFeatureSad("artifact_comments_autoreact", "fork_resume_parked_busy");
          return;
        }
        if (error instanceof h) {
          let G = threadKey(n.slug, n.threadId);
          if (e.byThread.get(G) === t) e.byThread.delete(G);
          logFeatureBad("artifact_comments_autoreact", "fork_resume_parked_refused");
          notifyThreadAgentHandoff(t.request, t.comments);
          return;
        }
        throw error;
      }
      if (d(P)) {
        a = undefined;
        dropDeniedResumeMessages(t.agentId, t.taskRegistry, [w, ...L], P);
      }
    } catch (error) {
      if (a !== undefined) queuePendingMessage(t.agentId, [a], t.taskRegistry);
      if (!isAbortError(error)) logError(error);
      logFeatureBad("artifact_comments_autoreact", "fork_resume_parked_failed");
    }
  })();
}
//@ chunk-9tgt55am.js:19321-19460 placement
function hasPendingAgentMessages(e) {
  let t = e.taskRegistry.get(e.agentId);
  return (
    isLocalAgent(t) &&
    t.status !== "running" &&
    t.resuming !== true &&
    t.pendingMessages.length > 0 &&
    useTeammateLifecycleNotification(t)
  );
}
//@ chunk-9tgt55am.js:19460-20499 placement
async function forkThreadAgent(e, t, n) {
  let a;
  let r;
  let s;
  try {
    let [{ getLastCacheSafeParams: d }, { spawnForkFromDirective: h }, { contextAfterTurn: y }] =
      await Promise.all([
        import("./chunk-qnggsbt9.js"),
        import("./chunk-7xjkha9c.js"),
        import("./chunk-bvy3yerb.js"),
      ]);
    let C = d();
    if (C === null) return fallbackFromFork(n, "no_snapshot");
    a = {
      ...y(C.toolUseContext),
      messages: C.forkContextMessages,
      renderedSystemPrompt: C.systemPrompt,
    };
    r = C.forkContextMessages;
    watchThreadAgents(e);
    let R = await h(n.directive, a, n.canUseTool, {
      nameHint: `comment ${n.slug.slice(0, 8)}`,
      description: `Comment on ${n.artifactName}`,
      narrowCanUseTool: makeBackgroundAgentPermissionGate,
    });
    if (R === null) return fallbackFromFork(n, "fork_refused");
    s = R.agentId;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return fallbackFromFork(n, "fork_error");
  }
  e.byThread.set(t, {
    agentId: s,
    request: n,
    taskRegistry: a.taskRegistry,
    comments: [
      {
        summon: n.summon,
        onSettled: n.onSettled,
      },
    ],
    followUps: new Set(),
  });
  try {
    propagateReadVersion(a, r, n.slug, s);
    a.appendSystemMessage?.(
      createInformationalSystemMessage(
        `Comment on ${n.artifactName}: handling it in a background agent`,
        "notice",
      ),
    );
    logFeatureOk("artifact_comments_autoreact", {
      handed_to_fork: true,
      seeded: n.route === "seeded",
    });
  } catch (error) {
    logError(error);
  }
  return {
    outcome: "spawned",
    agentId: s,
  };
}
//@ chunk-9tgt55am.js:20499-20772 placement
function propagateReadVersion(e, t, slug, a) {
  let artifactReadObservation = e.getArtifactReadObservation(slug);
  let main = artifactReadObservation.observers?.main;
  if (artifactReadObservation.ver === undefined || main === undefined) return;
  if (!(main === "" ? !isForegroundBusy() : t.some((h) => h.type === "assistant" && h.message.id === main)))
    return;
  e.setArtifactReadVersion(
    slug,
    artifactReadObservation.ver,
    observationStamp(
      a,
      main === "" ? undefined : main,
      sourcelessObservation(undefined, slug, artifactReadObservation.ver, main),
    ),
  );
}
//@ chunk-9tgt55am.js:20772-20928 placement
function fallbackFromFork(e, t) {
  (t === "fork_error" ? logFeatureBad : logFeatureSad)("artifact_comments_autoreact", `fork_fallback_${t}`, {
    seeded: e.route === "seeded",
  });
  return {
    outcome: "fallback",
    reason: t,
  };
}
//@ chunk-9tgt55am.js:20928-20999 placement
function settleComments(comments, t = "completed") {
  for (let n of comments.splice(0)) n.onSettled?.(t);
}
//@ chunk-9tgt55am.js:20999-21248 placement
/**
 * 只订阅一次后台代理的结束与恢复失败事件：结束时处理线程代理收尾，终止性恢复失败时交回主会话，消息无法投递时提示。
 */
function watchThreadAgents(e) {
  if (e.watching) return;
  e.watching = true;
  getTaskRunState().agentSettled.subscribe((t, n, a) => {
    try {
      onThreadAgentSettled(e, t, n, a?.stranded === true);
    } catch (error) {
      logError(error);
    }
  });
  getTaskRunState().agentResumeFailed.subscribe((t, n) => {
    try {
      if (n.terminal) handBackOnResumeFailure(e, t);
      else notifyResumeDenied(e, t, n.undeliverable);
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-9tgt55am.js:21248-21327 placement
function findThreadAgentByAgentId(e, t) {
  for (let [n, a] of e.byThread) if (a.agentId === t) return [n, a];
  return;
}
//@ chunk-9tgt55am.js:21327-21497 placement
function settleSummonStatuses(comments, t) {
  let n =
    t === "failed"
      ? {
          status: "failed",
          reason: "post_failed",
        }
      : {
          status: "declined",
          reason: "auto_reply_off",
        };
  for (let a of comments) if (a.summon !== undefined) emitArtifactSummonStatus(a.summon, n);
}
//@ chunk-9tgt55am.js:21497-22296 placement
function onThreadAgentSettled(e, t, n, a) {
  let threadAgentByAgentId = findThreadAgentByAgentId(e, t);
  if (threadAgentByAgentId === undefined) return;
  let [s, d] = threadAgentByAgentId;
  let h = d.taskRegistry.get(t);
  let y =
    n === "completed" &&
    !a &&
    !(isLocalAgent(h) && h.quietlyParked === true) &&
    hasLiveKeepalive(h, d.taskRegistry);
  if (n === "completed" && !y && (keepsLocalAgentAlive(h) || (a && !getIsNonInteractiveSession()))) {
    if (a) resumeThreadAgent(e, d, d.request);
    return;
  }
  e.byThread.delete(s);
  if (n !== "completed") {
    settleSummonStatuses(d.comments, n);
    settleComments(d.comments, "cancelled");
    return;
  }
  if (isLocalAgent(h) && h.quietlyParked === true) {
    settleSummonStatuses(d.comments, "killed");
    settleComments(d.comments, "cancelled");
    return;
  }
  let C = isLocalAgent(h) ? count(h.pendingMessages, (b) => d.followUps.has(b.text)) : 0;
  let R = a ? d.comments.splice(Math.max(1, d.comments.length - C)) : [];
  if (R.length > 0) {
    let filtered = drainPendingMessages(t, d.taskRegistry).filter((N) => !d.followUps.has(N.text));
    queuePendingMessage(t, filtered, d.taskRegistry);
    settleComments(d.comments);
    rehandToThreadAgent(d.request, R);
    return;
  }
  settleComments(d.comments);
  if (y) {
    logFeatureBad("artifact_comments_autoreact", "fork_parked_on_refused_work");
    killAsyncAgent(t, d.taskRegistry, "system");
  }
}
//@ chunk-9tgt55am.js:22296-22459 placement
function handBackOnResumeFailure(e, t) {
  let threadAgentByAgentId = findThreadAgentByAgentId(e, t);
  if (threadAgentByAgentId === undefined) return;
  let [a, r] = threadAgentByAgentId;
  e.byThread.delete(a);
  logFeatureBad("artifact_comments_autoreact", "fork_resume_failed");
  notifyThreadAgentHandoff(r.request, r.comments);
}
//@ chunk-9tgt55am.js:22459-22659 placement
function notifyResumeDenied(e, t, undeliverable) {
  let a = findThreadAgentByAgentId(e, t)?.[1];
  if (a === undefined || a.comments.length === 0 || !undeliverable.some((r) => a.followUps.has(r.text)))
    return;
  logFeatureSad("artifact_comments_autoreact", "fork_resume_denied");
  notifyThreadAgentHandoff(a.request, a.comments);
}
//@ chunk-9tgt55am.js:22659-23007 placement
/**
 * 重新把评论交给线程代理；回退时打点（区分达到上限）并通知主会话接手，异常时把评论标为失败。
 */
async function rehandToThreadAgent(request, t) {
  try {
    let n = await spawnOrJoinThreadAgent({
      ...request,
      summon: undefined,
      onSettled: undefined,
    });
    if (n.outcome !== "fallback") {
      threadAgentState()
        .byThread.get(threadKey(request.slug, request.threadId))
        ?.comments.push(...t);
      return;
    }
    if (n.reason === "cap") logFeatureSad("artifact_comments_autoreact", "fork_rehand_fallback_cap");
    else logFeatureBad("artifact_comments_autoreact", "fork_rehand_fallback");
    notifyThreadAgentHandoff(request, t);
  } catch (error) {
    logError(error);
    settleComments(t);
  }
}
//@ chunk-9tgt55am.js:23007-23392 placement
function notifyThreadAgentHandoff(request, comments) {
  let summon = comments.findLast((a) => a.summon !== undefined)?.summon;
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
export { isThreadAgentEnabled, hasThreadAgentForSlug, canHandToThreadAgent, spawnOrJoinThreadAgent };
