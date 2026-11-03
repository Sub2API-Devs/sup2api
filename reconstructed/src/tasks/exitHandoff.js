/**
 * tasks/exitHandoff.ts
 *
 * 2.1.316 新增：会话退出时把后台 shell、workflow、代理与评论监视同意交接给下一次唤醒（adopt.json）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qvytv6sj.js (7)
 * attribution: placement 7
 */
import {
  drainUnattendedReplies,
  oyt,
  stopArtifactSupervisors,
} from "../services/artifactComments/autoReplyNotices.js";
import { loe } from "../utils/lastResumeRecord.js";
import { getRootSession } from "../bootstrap/state.js";
import { getBgTakeover, isActingAsBgJob, getBgJobDir } from "../utils/concurrentSessions.js";
import { nkn, normalizeFilePath, Sx } from "../utils/tempDirRealpaths.js";
import { getLiveState } from "../services/liveReplica/liveReplica.js";
import { uniq } from "../utils/collections.js";
import { env } from "../utils/env.js";
import {
  drainUnresumedFrameLive,
  computeAdoptability,
  isAdoptableWorkflowTask,
  isAdoptableAgentTask,
  drainUnresumedAdopt,
  dedupFrameLiveNewest,
  collectFrameLiveConsent,
  takeExitRetryFrameLive,
  isAdoptableShellTask,
  isCarriedFrameLiveWatch,
  serializeAdoptAgent,
  detachAndSerializeShell,
  serializeAdoptWorkflow,
  writeAdoptJson,
  recordExitRetryFrameLive,
} from "../utils/background/adopt.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isSlugStoppedAnywhere } from "../services/artifacts/summonArms.js";
import { getAgentTranscriptPath, flushSessionStorage } from "../utils/sessionStorage.js";
import { Mr } from "../utils/agentId.js";
import { Iz } from "../services/workflow/snapshots.js";
import { userAbortReason } from "../utils/abortController.js";
import { withTimeout } from "../utils/sleep.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { DVs } from "../utils/shutdown/pendingWrites.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import { evictTaskOutput } from "../utils/task/diskOutput.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { emitTaskNotification } from "../utils/task/taskNotifications.js";
import { skipsTranscript } from "./taskKinds.js";
import { logError } from "../utils/log.js";

//@ chunk-qvytv6sj.js:1177-1359 placement
function carryUnattendedReplies(r) {
  let { bySlug: bySlug } = drainUnattendedReplies();
  if (bySlug.size === 0) return r;
  return r.map((o) => {
    let min = Math.min((bySlug.get(o.slug) ?? 0) + (o.unattendedReplies ?? 0), oyt);
    return min > 0 ? { ...o, unattendedReplies: min } : o;
  });
}
//@ chunk-qvytv6sj.js:1359-1407 placement
var F = 2000,
  R = "exit-handoff agent flush timeout";
//@ chunk-qvytv6sj.js:1407-1560 placement
function getAdoptReadRoots() {
  let last = loe.of(getRootSession().host).last;
  return [
    ...(getBgTakeover()?.adoptShellOutputReadRoot ? [getBgTakeover().adoptShellOutputReadRoot] : []),
    ...(last ? [nkn(normalizeFilePath(last.worktreePath))] : []),
  ];
}
/**
 * 收集退出时需要交接的项目（监视 WebSocket、Artifact 实时订阅、后台任务）。
 */
//@ chunk-qvytv6sj.js:1560-3438 placement
function collectHandoffItems(r) {
  let n = isActingAsBgJob() ? getBgJobDir() : void 0,
    o =
      n && getLiveState().builtInArtifactHiddenForMcp
        ? uniq([
            ...Array.from(getLiveState().live.supervisors.values())
              .filter((e) => e.autoReactWiring !== void 0)
              .map((e) => e.slug),
            ...Object.values(r).flatMap((e) =>
              e.type === "monitor_ws" &&
              e.status === "running" &&
              e.autoReactArmed === !0 &&
              e.frameLive !== void 0
                ? [e.frameLive.slug]
                : [],
            ),
          ])
        : [];
  if (!n || env.CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF) {
    if (n) {
      let live = getLiveState().live;
      if ((drainUnresumedFrameLive(n), live.bootingWiredArms.size > 0))
        logFeatureSad("artifact_live_subscribe", "booting_consent_uncarried");
      stopArtifactSupervisors(new Set([...live.inFlightSubscribes, ...o]));
    }
    return {
      shells: [],
      workflows: [],
      agents: [],
      unresumedAgents: [],
      unresumedWorkflows: [],
      frameLive: [],
      frameLiveTaskIds: [],
      wakeOnlyFrameLiveSlugs: o,
      jobDir: void 0,
      agentTranscriptPaths: {},
      workflowTranscriptDirs: {},
      projectTempDir: getBgTakeover()?.adoptShellOutputRoot ?? Sx(),
      mergeShellOutputReadRoots: getAdoptReadRoots(),
    };
  }
  let d = computeAdoptability(r),
    values = Object.values(r),
    filtered = values.filter((e) => isAdoptableWorkflowTask(e, d)),
    filtered_2 = values.filter((e) => isAdoptableAgentTask(e, d)),
    S = drainUnresumedAdopt(n),
    T = (e) => !getLiveState().autoReact.userDisarmed && !isSlugStoppedAnywhere(e.slug),
    b = drainUnresumedFrameLive(n),
    v = carryUnattendedReplies(
      dedupFrameLiveNewest([
        { entries: collectFrameLiveConsent(r), fallbackBasis: Date.now() },
        { entries: b.filter(T), fallbackBasis: Date.now() },
        { entries: takeExitRetryFrameLive(n).filter(T), fallbackBasis: Date.now() },
      ]),
    ),
    k = new Set(v.map((e) => e.slug)),
    live = getLiveState().live;
  if ([...live.bootingWiredArms.keys()].some((e) => !k.has(e)))
    logFeatureSad("artifact_live_subscribe", "booting_consent_uncarried");
  return (
    stopArtifactSupervisors(new Set([...k, ...live.inFlightSubscribes, ...o])),
    {
      shells: values.filter((e) => isAdoptableShellTask(e, d) && e.agentId === void 0),
      workflows: filtered,
      agents: filtered_2,
      unresumedAgents: S.agents,
      unresumedWorkflows: S.workflows,
      frameLive: v,
      frameLiveTaskIds: Object.values(r)
        .filter((e) => isCarriedFrameLiveWatch(e) && e.frameLive !== void 0 && k.has(e.frameLive.slug))
        .map((e) => e.id),
      wakeOnlyFrameLiveSlugs: o,
      jobDir: n,
      agentTranscriptPaths: Object.fromEntries(
        filtered_2.map((e) => [e.agentId, getAgentTranscriptPath(Mr(e.agentId))]),
      ),
      workflowTranscriptDirs: Object.fromEntries(filtered.map((e) => [e.workflowRunId, Iz(e.workflowRunId)])),
      projectTempDir: getBgTakeover()?.adoptShellOutputRoot ?? Sx(),
      mergeShellOutputReadRoots: getAdoptReadRoots(),
    }
  );
}
/**
 * 退出时刷写代理转录并写 adopt.json，记录交接的任务数。
 */
//@ chunk-qvytv6sj.js:3438-5443 placement
function writeExitHandoff(
  {
    shells: shells,
    workflows: workflows,
    agents: agents,
    unresumedAgents: unresumedAgents,
    unresumedWorkflows: unresumedWorkflows,
    frameLive: frameLive,
    jobDir: jobDir,
    agentTranscriptPaths: agentTranscriptPaths,
    workflowTranscriptDirs: workflowTranscriptDirs,
    projectTempDir: projectTempDir,
    mergeShellOutputReadRoots: mergeShellOutputReadRoots,
  },
  k,
) {
  for (let e of workflows) e.abortController?.abort(userAbortReason("background"));
  for (let e of agents) e.abortController?.abort(userAbortReason("background"));
  let h = (async () => {
    let e = [];
    if (agents.length > 0) {
      try {
        await withTimeout(
          (async () => {
            (await yieldToEventLoop(), await flushSessionStorage());
          })(),
          F,
          R,
        );
      } catch (error) {
        let A = error instanceof Error && error.message === R;
        (logFeatureSad("task_local_agent_exit_handoff", A ? "flush_timeout" : "flush_failed"),
          logForDebugging(`exit handoff: agent transcript flush failed: ${error}`, { level: "warn" }));
      }
      e = await Promise.all(
        agents.map((s) => serializeAdoptAgent(s, { derivedTranscriptPath: agentTranscriptPaths[s.agentId] })),
      );
    }
    e.push(...unresumedAgents);
    let filtered = (
        await Promise.all(shells.map((s) => detachAndSerializeShell(s, { rerootOutputsTo: projectTempDir })))
      ).filter((s) => s !== null),
      _ = [
        ...(await Promise.all(
          workflows.map((s) =>
            serializeAdoptWorkflow(s, { derivedTranscriptDir: workflowTranscriptDirs[s.workflowRunId] }),
          ),
        )),
        ...unresumedWorkflows,
      ];
    if ((filtered.length === 0 && _.length === 0 && e.length === 0 && frameLive.length === 0) || !jobDir)
      return;
    try {
      if (
        (await writeAdoptJson(
          jobDir,
          {
            writtenAtMs: Date.now(),
            origin: "exit",
            shells: filtered,
            cron: [],
            workflows: _,
            agents: e,
            ...(frameLive.length > 0 && { frameLive: frameLive }),
          },
          { mergeShellOutputRoot: [projectTempDir, ...(mergeShellOutputReadRoots ?? [])] },
          k,
        ),
        logEvent("tengu_adopt_exit_handoff", {
          adopted_shells: filtered.length,
          adopted_workflows: _.length,
          adopted_agents: e.length,
          adopted_frame_live: frameLive.length,
        }),
        filtered.length > 0)
      )
        logFeatureOk("task_local_shell_exit_handoff");
      if (_.length > 0) logFeatureOk("task_local_workflow_exit_handoff");
      if (e.length > 0) logFeatureOk("task_local_agent_exit_handoff");
      logForDebugging(
        `exit handoff: ${filtered.length} background shell(s), ${_.length} workflow(s), ${e.length} agent(s), and ${frameLive.length} comment-monitoring consent record(s) handed to the next wake of this session`,
      );
    } catch (error) {
      for (let A of shells)
        try {
          A.shellCommand?.kill();
        } catch {}
      if (shells.length > 0) logFeatureBad("task_local_shell_exit_handoff", "write_failed");
      if (workflows.length > 0) logFeatureBad("task_local_workflow_exit_handoff", "write_failed");
      if (e.length > 0) logFeatureBad("task_local_agent_exit_handoff", "write_failed");
      if (frameLive.length > 0 && jobDir !== void 0)
        (recordExitRetryFrameLive(jobDir, frameLive),
          logFeatureBad("artifact_live_subscribe", "consent_exit_write_failed"));
      logForDebugging(`exit handoff: adopt.json write failed: ${error}`, { level: "warn" });
    }
  })();
  return (DVs(h), h);
}
//@ chunk-qvytv6sj.js:5443-5713 placement
function hasPendingHandoff(r, n) {
  let o = collectHandoffItems(r),
    d =
      o.shells.length > 0 ||
      o.workflows.length > 0 ||
      o.agents.length > 0 ||
      o.unresumedAgents.length > 0 ||
      o.unresumedWorkflows.length > 0 ||
      o.frameLive.length > 0
        ? writeExitHandoff(o, n)
        : void 0,
    c = new Set([...o.shells, ...o.workflows, ...o.agents].map((p) => p.id));
  return (markRunningTasksForHandoff(r, c), d);
}
//@ chunk-qvytv6sj.js:5713-6103 placement
function markRunningTasksForHandoff(r, n = new Set()) {
  for (let o of Object.values(r)) {
    if (o.status !== "running" || n.has(o.id)) continue;
    try {
      if (isLocalShellTask(o)) (o.shellCommand?.kill({ cause: "session_exit" }), o.shellCommand?.cleanup());
      else if (isTerminalShutdown()) {
        evictTaskOutput(o.id);
        continue;
      } else if ("abortController" in o) o.abortController?.abort();
      if (!isObserverAgentTask(o))
        emitTaskNotification(o.id, "stopped", {
          toolUseId: o.toolUseId,
          summary: o.description,
          ambient: skipsTranscript(o),
        });
      evictTaskOutput(o.id);
    } catch (error) {
      logError(error);
    }
  }
}

export { hasPendingHandoff, markRunningTasksForHandoff };
