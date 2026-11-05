/**
 * tasks/exitHandoff.ts
 *
 * 2.1.316 新增：会话退出时把后台 shell、workflow、代理与评论监视同意交接给下一次唤醒（adopt.json）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4kh72kn9.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  drainUnattendedReplies,
  MAX_UNATTENDED_REPLY_COUNT,
  stopArtifactSupervisors,
} from "../services/artifactComments/autoReplyNotices.js";
import { lastResumeRecordRegistry } from "../utils/lastResumeRecord.js";
import { getRootSession } from "../bootstrap/state.js";
import { getBgTakeover, isActingAsBgJob, getBgJobDir } from "../utils/concurrentSessions.js";
import { taskRootUnderTemp, normalizeFilePath, sessionTempDirRealpath } from "../utils/tempDirRealpaths.js";
import { getLiveState } from "../services/liveReplica/liveReplica.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
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
import { identityAgentId2 } from "../utils/agentId.js";
import { subagentWorkflowDir } from "../services/workflow/snapshots.js";
import { userAbortReason } from "../utils/abortController.js";
import { withTimeout } from "../utils/sleep.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { trackPendingWrite } from "../utils/shutdown/pendingWrites.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import { evictTaskOutput } from "../utils/task/diskOutput.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { isLocalScriptTask, skipsTranscript } from "./taskKinds.js";
import { isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { emitTaskNotification } from "../utils/task/taskNotifications.js";
import { logError } from "../utils/log.js";

//@ chunk-4kh72kn9.js:1217-1399 placement
function carryUnattendedReplies(frameLive) {
  let { bySlug } = drainUnattendedReplies();
  if (bySlug.size === 0) return frameLive;
  return frameLive.map((entry) => {
    let min = Math.min(
      (bySlug.get(entry.slug) ?? 0) + (entry.unattendedReplies ?? 0),
      MAX_UNATTENDED_REPLY_COUNT,
    );
    return min > 0
      ? {
          ...entry,
          unattendedReplies: min,
        }
      : entry;
  });
}
//@ chunk-4kh72kn9.js:1399-1447 placement
/**
 * 退出交接时等待代理 flush 的超时与文案。
 */
var EXIT_HANDOFF_FLUSH_TIMEOUT_MS = 2000;
var EXIT_HANDOFF_FLUSH_TIMEOUT_MESSAGE = "exit-handoff agent flush timeout";
//@ chunk-4kh72kn9.js:1447-1600 placement
function getAdoptReadRoots() {
  let last = lastResumeRecordRegistry.of(getRootSession().host).last;
  return [
    ...(getBgTakeover()?.adoptShellOutputReadRoot ? [getBgTakeover().adoptShellOutputReadRoot] : []),
    ...(last ? [taskRootUnderTemp(normalizeFilePath(last.worktreePath))] : []),
  ];
}
//@ chunk-4kh72kn9.js:1600-3479 placement
/**
 * 收集退出时需要交接的项目（监视 WebSocket、Artifact 实时订阅、后台任务）。
 */
function collectHandoffItems(tasks) {
  let jobDir = isActingAsBgJob() ? getBgJobDir() : undefined;
  let wakeOnlySlugs =
    jobDir && getLiveState().builtInArtifactHiddenForMcp
      ? normalizeCaseForComparison_2([
          ...Array.from(getLiveState().live.supervisors.values())
            .filter((supervisor) => supervisor.autoReactWiring !== undefined)
            .map((supervisor) => supervisor.slug),
          ...Object.values(tasks).flatMap((task) =>
            task.type === "monitor_ws" &&
            task.status === "running" &&
            task.autoReactArmed === true &&
            task.frameLive !== undefined
              ? [task.frameLive.slug]
              : [],
          ),
        ])
      : [];
  if (!jobDir || env.CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF) {
    if (jobDir) {
      let live = getLiveState().live;
      drainUnresumedFrameLive(jobDir);
      if (live.bootingWiredArms.size > 0)
        logFeatureSad("artifact_live_subscribe", "booting_consent_uncarried");
      stopArtifactSupervisors(new Set([...live.inFlightSubscribes, ...wakeOnlySlugs]));
    }
    return {
      shells: [],
      workflows: [],
      agents: [],
      unresumedAgents: [],
      unresumedWorkflows: [],
      frameLive: [],
      frameLiveTaskIds: [],
      wakeOnlyFrameLiveSlugs: wakeOnlySlugs,
      jobDir: undefined,
      agentTranscriptPaths: {},
      workflowTranscriptDirs: {},
      projectTempDir: getBgTakeover()?.adoptShellOutputRoot ?? sessionTempDirRealpath(),
      mergeShellOutputReadRoots: getAdoptReadRoots(),
    };
  }
  let adoptability = computeAdoptability(tasks);
  let values = Object.values(tasks);
  let filtered = values.filter((task) => isAdoptableWorkflowTask(task, adoptability));
  let filtered_2 = values.filter((task) => isAdoptableAgentTask(task, adoptability));
  let unresumed = drainUnresumedAdopt(jobDir);
  let isLive = (entry) => !getLiveState().autoReact.userDisarmed && !isSlugStoppedAnywhere(entry.slug);
  let unresumedFrameLive = drainUnresumedFrameLive(jobDir);
  let carriedFrameLive = carryUnattendedReplies(
    dedupFrameLiveNewest([
      {
        entries: collectFrameLiveConsent(tasks),
        fallbackBasis: Date.now(),
      },
      {
        entries: unresumedFrameLive.filter(isLive),
        fallbackBasis: Date.now(),
      },
      {
        entries: takeExitRetryFrameLive(jobDir).filter(isLive),
        fallbackBasis: Date.now(),
      },
    ]),
  );
  let carriedSlugs = new Set(carriedFrameLive.map((entry) => entry.slug));
  let live = getLiveState().live;
  if ([...live.bootingWiredArms.keys()].some((key) => !carriedSlugs.has(key)))
    logFeatureSad("artifact_live_subscribe", "booting_consent_uncarried");
  stopArtifactSupervisors(new Set([...carriedSlugs, ...live.inFlightSubscribes, ...wakeOnlySlugs]));
  return {
    shells: values.filter((task) => isAdoptableShellTask(task, adoptability) && task.agentId === undefined),
    workflows: filtered,
    agents: filtered_2,
    unresumedAgents: unresumed.agents,
    unresumedWorkflows: unresumed.workflows,
    frameLive: carriedFrameLive,
    frameLiveTaskIds: Object.values(tasks)
      .filter(
        (task) =>
          isCarriedFrameLiveWatch(task) &&
          task.frameLive !== undefined &&
          carriedSlugs.has(task.frameLive.slug),
      )
      .map((task) => task.id),
    wakeOnlyFrameLiveSlugs: wakeOnlySlugs,
    jobDir,
    agentTranscriptPaths: Object.fromEntries(
      filtered_2.map((agent) => [agent.agentId, getAgentTranscriptPath(identityAgentId2(agent.agentId))]),
    ),
    workflowTranscriptDirs: Object.fromEntries(
      filtered.map((workflow) => [workflow.workflowRunId, subagentWorkflowDir(workflow.workflowRunId)]),
    ),
    projectTempDir: getBgTakeover()?.adoptShellOutputRoot ?? sessionTempDirRealpath(),
    mergeShellOutputReadRoots: getAdoptReadRoots(),
  };
}
//@ chunk-4kh72kn9.js:3479-5484 placement
/**
 * 退出时刷写代理转录并写 adopt.json，记录交接的任务数。
 */
function writeExitHandoff(
  {
    shells,
    workflows,
    agents,
    unresumedAgents,
    unresumedWorkflows,
    frameLive,
    jobDir,
    agentTranscriptPaths,
    workflowTranscriptDirs,
    projectTempDir,
    mergeShellOutputReadRoots,
  },
  storageV5,
) {
  for (let workflow of workflows) workflow.abortController?.abort(userAbortReason("background"));
  for (let agent of agents) agent.abortController?.abort(userAbortReason("background"));
  let writePromise = (async () => {
    let agentRecords = [];
    if (agents.length > 0) {
      try {
        await withTimeout(
          (async () => {
            await yieldToEventLoop();
            await flushSessionStorage();
          })(),
          EXIT_HANDOFF_FLUSH_TIMEOUT_MS,
          EXIT_HANDOFF_FLUSH_TIMEOUT_MESSAGE,
        );
      } catch (error) {
        let isTimeout = error instanceof Error && error.message === EXIT_HANDOFF_FLUSH_TIMEOUT_MESSAGE;
        logFeatureSad("task_local_agent_exit_handoff", isTimeout ? "flush_timeout" : "flush_failed");
        logForDebugging(`exit handoff: agent transcript flush failed: ${error}`, {
          level: "warn",
        });
      }
      agentRecords = await Promise.all(
        agents.map((agent) =>
          serializeAdoptAgent(agent, {
            derivedTranscriptPath: agentTranscriptPaths[agent.agentId],
          }),
        ),
      );
    }
    agentRecords.push(...unresumedAgents);
    let filtered = (
      await Promise.all(
        shells.map((shell) =>
          detachAndSerializeShell(shell, {
            rerootOutputsTo: projectTempDir,
          }),
        ),
      )
    ).filter((shellRecord) => shellRecord !== null);
    let workflowRecords = [
      ...(await Promise.all(
        workflows.map((workflow) =>
          serializeAdoptWorkflow(workflow, {
            derivedTranscriptDir: workflowTranscriptDirs[workflow.workflowRunId],
          }),
        ),
      )),
      ...unresumedWorkflows,
    ];
    if (
      (filtered.length === 0 &&
        workflowRecords.length === 0 &&
        agentRecords.length === 0 &&
        frameLive.length === 0) ||
      !jobDir
    )
      return;
    try {
      await writeAdoptJson(
        jobDir,
        {
          writtenAtMs: Date.now(),
          origin: "exit",
          shells: filtered,
          cron: [],
          workflows: workflowRecords,
          agents: agentRecords,
          ...(frameLive.length > 0 && {
            frameLive,
          }),
        },
        {
          mergeShellOutputRoot: [projectTempDir, ...(mergeShellOutputReadRoots ?? [])],
        },
        storageV5,
      );
      logEvent("tengu_adopt_exit_handoff", {
        adopted_shells: filtered.length,
        adopted_workflows: workflowRecords.length,
        adopted_agents: agentRecords.length,
        adopted_frame_live: frameLive.length,
      });
      if (filtered.length > 0) logFeatureOk("task_local_shell_exit_handoff");
      if (workflowRecords.length > 0) logFeatureOk("task_local_workflow_exit_handoff");
      if (agentRecords.length > 0) logFeatureOk("task_local_agent_exit_handoff");
      logForDebugging(
        `exit handoff: ${filtered.length} background shell(s), ${workflowRecords.length} workflow(s), ${agentRecords.length} agent(s), and ${frameLive.length} comment-monitoring consent record(s) handed to the next wake of this session`,
      );
    } catch (error) {
      for (let shell of shells)
        try {
          shell.shellCommand?.kill();
        } catch {}
      if (shells.length > 0) logFeatureBad("task_local_shell_exit_handoff", "write_failed");
      if (workflows.length > 0) logFeatureBad("task_local_workflow_exit_handoff", "write_failed");
      if (agentRecords.length > 0) logFeatureBad("task_local_agent_exit_handoff", "write_failed");
      if (frameLive.length > 0 && jobDir !== undefined) {
        recordExitRetryFrameLive(jobDir, frameLive);
        logFeatureBad("artifact_live_subscribe", "consent_exit_write_failed");
      }
      logForDebugging(`exit handoff: adopt.json write failed: ${error}`, {
        level: "warn",
      });
    }
  })();
  trackPendingWrite(writePromise);
  return writePromise;
}
//@ chunk-4kh72kn9.js:5484-5754 placement
function hasPendingHandoff(tasks, storageV5) {
  let handoffItems = collectHandoffItems(tasks);
  let writePromise =
    handoffItems.shells.length > 0 ||
    handoffItems.workflows.length > 0 ||
    handoffItems.agents.length > 0 ||
    handoffItems.unresumedAgents.length > 0 ||
    handoffItems.unresumedWorkflows.length > 0 ||
    handoffItems.frameLive.length > 0
      ? writeExitHandoff(handoffItems, storageV5)
      : undefined;
  let carriedIds = new Set(
    [...handoffItems.shells, ...handoffItems.workflows, ...handoffItems.agents].map((task) => task.id),
  );
  markRunningTasksForHandoff(tasks, carriedIds);
  return writePromise;
}
//@ chunk-4kh72kn9.js:5754-6172 placement
function markRunningTasksForHandoff(tasks, skipIds = new Set()) {
  for (let task of Object.values(tasks)) {
    if (task.status !== "running" || skipIds.has(task.id)) continue;
    try {
      if (isLocalShellTask(task)) {
        task.shellCommand?.kill(
          isTerminalShutdown()
            ? {
                cause: "session_exit",
              }
            : undefined,
        );
        task.shellCommand?.cleanup();
      } else if (isTerminalShutdown()) {
        evictTaskOutput(task.id);
        continue;
      } else if ("abortController" in task) task.abortController?.abort();
      if (!(codeModeAccepted() && isLocalScriptTask(task)) && !isObserverAgentTask(task))
        emitTaskNotification(task.id, "stopped", {
          toolUseId: task.toolUseId,
          summary: task.description,
          ambient: skipsTranscript(task),
        });
      evictTaskOutput(task.id);
    } catch (error) {
      logError(error);
    }
  }
}
export { hasPendingHandoff, markRunningTasksForHandoff };
