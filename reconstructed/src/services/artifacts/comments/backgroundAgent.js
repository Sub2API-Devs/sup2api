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
import { hqe } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { observationStamp, sourcelessObservation } from "../readObservation.js";
import { getTaskRunState } from "../../../utils/task/taskNotifications.js";
import { emitArtifactSummonStatus, registerSummonHandOff } from "../artifactNotices.js";
import { count } from "../../../utils/collections.js";
import { markAutoReactNoticePending } from "../shareEntries.js";
import { enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../../utils/confusables.js";
import { Fpn } from "../../../tools/ArtifactTool/artifactNotices.js";
import { buildMissedCommentPrompt } from "./threadPrompts.js";

//@ chunk-9tgt55am.js:15307-15348 placement
var TENGU_SORREL_TRELLIS_TENON = "tengu_sorrel_trellis_tenon",
  lr = 5;
//@ chunk-9tgt55am.js:15348-15384 placement
function KQe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_TENON, !1) === !0;
}
//@ chunk-9tgt55am.js:15384-15439 placement
class ur {
  byThread = new Map();
  spawning = new Map();
  watching = !1;
}
//@ chunk-9tgt55am.js:15439-15465 placement
var wi = new SessionRootSlot(() => new ur());
//@ chunk-9tgt55am.js:15465-15497 placement
function Kt() {
  return wi.of(getRootSession());
}
//@ chunk-9tgt55am.js:15497-15560 placement
function Yt(e, t) {
  return `${e.toLowerCase()}:${t.toLowerCase()}`;
}
//@ chunk-9tgt55am.js:15560-15593 placement
var Si = [
  AGENT,
  SENDMESSAGE,
  MONITOR,
  WORKFLOW_TOOL_NAME,
  SCHEDULE_WAKEUP_TOOL_NAME,
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  REMOTETRIGGER,
];
/**
 * 后台评论 agent 的权限包装：禁止其再派生后台任务等。
 */
//@ chunk-9tgt55am.js:15593-16153 placement
function makeBackgroundAgentPermissionGate(e) {
  return async (t, n, a, r, s, d) => {
    let h = t.mcpInfo === void 0,
      y =
        (toolMatchesName(t, BASH_TOOL_NAME) || toolMatchesName(t, POWERSHELL_TOOL_NAME)) &&
        coerceBooleanString(n.run_in_background) === !0;
    if (h && (y || Si.some((C) => toolMatchesName(t, C))))
      return {
        behavior: "deny",
        message:
          "As a background comment agent you cannot start subagents, monitors, background commands or scheduled work, or message other agents. This comment thread is your only job: do what it needs in this run, reply on the thread, report and stop. Anything else belongs to the main session.",
        decisionReason: { type: "other", reason: "artifact comment agent scope" },
      };
    return e(t, n, a, r, s, d);
  };
}
//@ chunk-9tgt55am.js:16153-16206 placement
function mr(e) {
  return useTeammateLifecycleNotification(e) || (isLocalAgent(e) && e.resuming === !0);
}
/**
 * 判断已完成的本地代理是否仍有存活理由：工作流、未跳过记录的 monitor 任务，或非技能 fork 的子代理在保活它。
 */
//@ chunk-9tgt55am.js:16206-16515 placement
function hasLiveKeepalive(e, t) {
  if (!isLocalAgent(e) || e.status !== "completed") return !1;
  for (let n of keepaliveReasons(e)) {
    if (n.startsWith("workflow:")) return !0;
    if (n.startsWith("monitor:")) {
      let a = t.get(n.slice(8));
      if (a === void 0 || !skipsTranscript(a)) return !0;
    }
    if (n.startsWith("agent:")) {
      let a = t.get(n.slice(6));
      if (isLocalAgent(a) && a.forkedSkillName === void 0) return !0;
    }
  }
  return !1;
}
/**
 * 取某评论线程对应的后台代理；代理已不在运行时移除记录并把挂着的评论标为 cancelled。
 */
//@ chunk-9tgt55am.js:16515-16678 placement
function getLiveThreadAgent(e, t) {
  let n = e.byThread.get(t);
  if (n === void 0) return;
  if (mr(n.taskRegistry.get(n.agentId))) return n;
  (e.byThread.delete(t), Xe(n.comments, "cancelled"));
  return;
}
/**
 * 判断某 artifact 是否有正在启动或运行的评论线程后台代理。
 */
//@ chunk-9tgt55am.js:16678-16877 placement
function hasThreadAgentForSlug(e) {
  let t = Kt(),
    n = `${e.toLowerCase()}:`;
  for (let a of t.spawning.keys()) if (a.startsWith(n)) return !0;
  for (let a of [...t.byThread.keys()]) if (a.startsWith(n) && getLiveThreadAgent(t, a) !== void 0) return !0;
  return !1;
}
//@ chunk-9tgt55am.js:16877-17027 placement
function countThreadAgents(e) {
  let t = 0;
  for (let n of e.spawning.keys()) if (!e.byThread.has(n)) t += 1;
  for (let n of [...e.byThread.keys()]) if (getLiveThreadAgent(e, n) !== void 0) t += 1;
  return t;
}
//@ chunk-9tgt55am.js:17027-17138 placement
async function canForkThreadAgent() {
  let { getLastCacheSafeParams: getLastCacheSafeParams } = await import("./chunk-qnggsbt9.js");
  return getLastCacheSafeParams() !== null && !isCoordinatorMode_2();
}
/**
 * 判断能否把评论线程交给后台代理：该线程已有在启动/运行的代理，或代理总数未达上限且可以 fork。
 */
//@ chunk-9tgt55am.js:17138-17258 placement
async function canHandToThreadAgent(e, t) {
  let n = Kt(),
    a = Yt(e, t);
  if (n.spawning.has(a) || getLiveThreadAgent(n, a) !== void 0) return !0;
  return countThreadAgents(n) < lr && (await canForkThreadAgent());
}
//@ chunk-9tgt55am.js:17258-17586 placement
async function spawnOrJoinThreadAgent(e) {
  let t = Kt(),
    n = Yt(e.slug, e.threadId);
  for (let s = t.spawning.get(n); s !== void 0; s = t.spawning.get(n)) {
    let d = await s;
    if (d.outcome === "fallback") return d;
  }
  let a = getLiveThreadAgent(t, n);
  if (a !== void 0) return joinThreadAgent(t, a, e);
  if (countThreadAgents(t) >= lr) return fallbackFromFork(e, "cap");
  let r = forkThreadAgent(t, n, e);
  t.spawning.set(n, r);
  try {
    return await r;
  } finally {
    t.spawning.delete(n);
  }
}
/**
 * 把新评论并入已在运行的线程代理：不是同一召唤时追加跟进消息并恢复代理；登记评论回调并打点 joined。
 */
//@ chunk-9tgt55am.js:17586-17964 placement
function joinThreadAgent(e, t, n) {
  let a = n.summon?.gestureAt;
  if (!(a !== void 0 && t.comments.some((comment) => comment.summon?.gestureAt === a)))
    (sendMessageToAgent(t.agentId, n.followUp, t.taskRegistry),
      t.followUps.add(n.followUp),
      resumeThreadAgent(e, t, n));
  return (
    t.comments.push({ summon: n.summon, onSettled: n.onSettled }),
    logFeatureOk("artifact_comments_autoreact", {
      handed_to_fork: !0,
      joined: !0,
      seeded: n.route === "seeded",
    }),
    { outcome: "joined", agentId: t.agentId }
  );
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
        ]),
        S = r();
      if (S === null || R() || b() || !hasPendingAgentMessages(t)) return;
      let [w, ...L] = drainPendingMessages(t.agentId, t.taskRegistry);
      if (w === void 0) return;
      ((a = w), queuePendingMessage(t.agentId, L, t.taskRegistry));
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
        if (
          (queuePendingMessage(
            t.agentId,
            [w, ...drainPendingMessages(t.agentId, t.taskRegistry)],
            t.taskRegistry,
          ),
          (a = void 0),
          error instanceof y || error instanceof C)
        ) {
          logFeatureSad("artifact_comments_autoreact", "fork_resume_parked_busy");
          return;
        }
        if (error instanceof h) {
          let G = Yt(n.slug, n.threadId);
          if (e.byThread.get(G) === t) e.byThread.delete(G);
          (logFeatureBad("artifact_comments_autoreact", "fork_resume_parked_refused"),
            notifyThreadAgentHandoff(t.request, t.comments));
          return;
        }
        throw error;
      }
      if (d(P)) ((a = void 0), dropDeniedResumeMessages(t.agentId, t.taskRegistry, [w, ...L], P));
    } catch (error) {
      if (a !== void 0) queuePendingMessage(t.agentId, [a], t.taskRegistry);
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
    t.resuming !== !0 &&
    t.pendingMessages.length > 0 &&
    useTeammateLifecycleNotification(t)
  );
}
//@ chunk-9tgt55am.js:19460-20499 placement
async function forkThreadAgent(e, t, n) {
  let a, r, s;
  try {
    let [{ getLastCacheSafeParams: d }, { spawnForkFromDirective: h }, { contextAfterTurn: y }] =
        await Promise.all([
          import("./chunk-qnggsbt9.js"),
          import("./chunk-7xjkha9c.js"),
          import("./chunk-bvy3yerb.js"),
        ]),
      C = d();
    if (C === null) return fallbackFromFork(n, "no_snapshot");
    ((a = { ...y(C.toolUseContext), messages: C.forkContextMessages, renderedSystemPrompt: C.systemPrompt }),
      (r = C.forkContextMessages),
      watchThreadAgents(e));
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
    comments: [{ summon: n.summon, onSettled: n.onSettled }],
    followUps: new Set(),
  });
  try {
    (propagateReadVersion(a, r, n.slug, s),
      a.appendSystemMessage?.(
        createInformationalSystemMessage(
          `Comment on ${n.artifactName}: handling it in a background agent`,
          "notice",
        ),
      ),
      logFeatureOk("artifact_comments_autoreact", { handed_to_fork: !0, seeded: n.route === "seeded" }));
  } catch (error) {
    logError(error);
  }
  return { outcome: "spawned", agentId: s };
}
//@ chunk-9tgt55am.js:20499-20772 placement
function propagateReadVersion(e, t, n, a) {
  let artifactReadObservation = e.getArtifactReadObservation(n),
    s = artifactReadObservation.observers?.main;
  if (artifactReadObservation.ver === void 0 || s === void 0) return;
  if (!(s === "" ? !hqe() : t.some((h) => h.type === "assistant" && h.message.id === s))) return;
  e.setArtifactReadVersion(
    n,
    artifactReadObservation.ver,
    observationStamp(
      a,
      s === "" ? void 0 : s,
      sourcelessObservation(void 0, n, artifactReadObservation.ver, s),
    ),
  );
}
//@ chunk-9tgt55am.js:20772-20928 placement
function fallbackFromFork(e, t) {
  return (
    (t === "fork_error" ? logFeatureBad : logFeatureSad)(
      "artifact_comments_autoreact",
      `fork_fallback_${t}`,
      { seeded: e.route === "seeded" },
    ),
    { outcome: "fallback", reason: t }
  );
}
//@ chunk-9tgt55am.js:20928-20999 placement
function Xe(e, t = "completed") {
  for (let n of e.splice(0)) n.onSettled?.(t);
}
/**
 * 只订阅一次后台代理的结束与恢复失败事件：结束时处理线程代理收尾，终止性恢复失败时交回主会话，消息无法投递时提示。
 */
//@ chunk-9tgt55am.js:20999-21248 placement
function watchThreadAgents(e) {
  if (e.watching) return;
  ((e.watching = !0),
    getTaskRunState().agentSettled.subscribe((t, n, a) => {
      try {
        onThreadAgentSettled(e, t, n, a?.stranded === !0);
      } catch (error) {
        logError(error);
      }
    }),
    getTaskRunState().agentResumeFailed.subscribe((t, n) => {
      try {
        if (n.terminal) handBackOnResumeFailure(e, t);
        else notifyResumeDenied(e, t, n.undeliverable);
      } catch (error) {
        logError(error);
      }
    }));
}
//@ chunk-9tgt55am.js:21248-21327 placement
function $n(e, t) {
  for (let [n, a] of e.byThread) if (a.agentId === t) return [n, a];
  return;
}
//@ chunk-9tgt55am.js:21327-21497 placement
function settleSummonStatuses(e, t) {
  let n =
    t === "failed"
      ? { status: "failed", reason: "post_failed" }
      : { status: "declined", reason: "auto_reply_off" };
  for (let a of e) if (a.summon !== void 0) emitArtifactSummonStatus(a.summon, n);
}
//@ chunk-9tgt55am.js:21497-22296 placement
function onThreadAgentSettled(e, t, n, a) {
  let r = $n(e, t);
  if (r === void 0) return;
  let [s, d] = r,
    h = d.taskRegistry.get(t),
    y =
      n === "completed" &&
      !a &&
      !(isLocalAgent(h) && h.quietlyParked === !0) &&
      hasLiveKeepalive(h, d.taskRegistry);
  if (n === "completed" && !y && (mr(h) || (a && !getIsNonInteractiveSession()))) {
    if (a) resumeThreadAgent(e, d, d.request);
    return;
  }
  if ((e.byThread.delete(s), n !== "completed")) {
    (settleSummonStatuses(d.comments, n), Xe(d.comments, "cancelled"));
    return;
  }
  if (isLocalAgent(h) && h.quietlyParked === !0) {
    (settleSummonStatuses(d.comments, "killed"), Xe(d.comments, "cancelled"));
    return;
  }
  let C = isLocalAgent(h) ? count(h.pendingMessages, (b) => d.followUps.has(b.text)) : 0,
    R = a ? d.comments.splice(Math.max(1, d.comments.length - C)) : [];
  if (R.length > 0) {
    let filtered = drainPendingMessages(t, d.taskRegistry).filter((N) => !d.followUps.has(N.text));
    (queuePendingMessage(t, filtered, d.taskRegistry), Xe(d.comments), rehandToThreadAgent(d.request, R));
    return;
  }
  if ((Xe(d.comments), y))
    (logFeatureBad("artifact_comments_autoreact", "fork_parked_on_refused_work"),
      killAsyncAgent(t, d.taskRegistry, "system"));
}
//@ chunk-9tgt55am.js:22296-22459 placement
function handBackOnResumeFailure(e, t) {
  let n = $n(e, t);
  if (n === void 0) return;
  let [a, r] = n;
  (e.byThread.delete(a),
    logFeatureBad("artifact_comments_autoreact", "fork_resume_failed"),
    notifyThreadAgentHandoff(r.request, r.comments));
}
//@ chunk-9tgt55am.js:22459-22659 placement
function notifyResumeDenied(e, t, n) {
  let a = $n(e, t)?.[1];
  if (a === void 0 || a.comments.length === 0 || !n.some((r) => a.followUps.has(r.text))) return;
  (logFeatureSad("artifact_comments_autoreact", "fork_resume_denied"),
    notifyThreadAgentHandoff(a.request, a.comments));
}
/**
 * 重新把评论交给线程代理；回退时打点（区分达到上限）并通知主会话接手，异常时把评论标为失败。
 */
//@ chunk-9tgt55am.js:22659-23007 placement
async function rehandToThreadAgent(e, t) {
  try {
    let n = await spawnOrJoinThreadAgent({ ...e, summon: void 0, onSettled: void 0 });
    if (n.outcome !== "fallback") {
      Kt()
        .byThread.get(Yt(e.slug, e.threadId))
        ?.comments.push(...t);
      return;
    }
    if (n.reason === "cap") logFeatureSad("artifact_comments_autoreact", "fork_rehand_fallback_cap");
    else logFeatureBad("artifact_comments_autoreact", "fork_rehand_fallback");
    notifyThreadAgentHandoff(e, t);
  } catch (error) {
    (logError(error), Xe(t));
  }
}
//@ chunk-9tgt55am.js:23007-23392 placement
function notifyThreadAgentHandoff(e, t) {
  let n = t.findLast((a) => a.summon !== void 0)?.summon;
  (markAutoReactNoticePending(e.slug),
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskType: "artifact-auto-react",
        summary: escapeXml(Fpn(e.artifactName)),
        body: `
${escapeXml(buildMissedCommentPrompt(e))}`,
      }),
      mode: "task-notification",
      origin: {
        kind: "task-notification",
        source: "artifact-auto-react",
        slug: e.slug,
        displayName: e.artifactName,
      },
      ...(n !== void 0 && { uuid: registerSummonHandOff(n) }),
      artifactCommentTurn: "handback",
      agentId: mainAgentId(),
    }),
    Xe(t));
}

export { KQe, hasThreadAgentForSlug, canHandToThreadAgent, spawnOrJoinThreadAgent };
