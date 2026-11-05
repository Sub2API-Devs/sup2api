/**
 * cli/remoteIO/orphanAgentRestore.ts
 *
 * 2.1.316 新增。云会话恢复时找回孤儿后台代理并提示中断任务。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (4), chunk-1kk50rk6.js (10)
 * attribution: placement 13, layout 1
 */
import { getTaskOutputData } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId, getSessionCronTasks } from "../../bootstrap/state.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { findToolByName } from "../../Tool.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { rememberResumableAgents, rememberStoppedAgents } from "../../tools/AgentTool/agentLaunch.js";
import { isTurnHandoffResumeEnabled } from "./turnHandoff.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { restoreAgentSidecarFromStream, readAgentMetadata } from "../../utils/sessionStorage.js";
import { validateAgentMetadata, describeStorageError } from "../../utils/agentMetadata.js";
import { getRemoteFeatureGateState, needsGrowthBookRefresh } from "../../utils/permissions/yoloClassifier.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { runningBackgroundTasks } from "../../state/onChangeAppState.js";
import { MAX_PENDING_ACTION_ARGS } from "../../utils/sessionState.js";
import { TENGU_CCR_INHERITED_APPROVAL_KILLSWITCH } from "../print/elicitationRegistrar.js";
import { hasActiveInProcessTeammates, hasNonLeadTeammate } from "../../utils/teammate.js";
import { canResumeAgentsInBackground, isIterativeHavenGateOn } from "../print/agentResume.js";

//@ chunk-1kk50rk6.js:5151-6521 placement
function orphanAgentRestoreNotice(recorded, hasTool, alsoResumable, autoResumed) {
  let mapped = recorded.filter((task) => autoResumed?.has(task.task_id)).map((task) => task.task_id);
  let mapped_2 = recorded
    .filter(
      (task) =>
        !autoResumed?.has(task.task_id) && (getTaskOutputData(task) || alsoResumable?.has(task.task_id)),
    )
    .map((task) => task.task_id);
  let tailText = mapped_2.some((task) => alsoResumable?.has(task))
    ? ", as the agent type it ran as (if that type is not available right now the resume is refused: try it again, or start the agent again)"
    : ", as a general-purpose agent with the same tools if its saved settings did not survive the restart";
  let lostText = "Every other stopped task listed here is lost: do not send a message to its id.";
  let resumableText =
    mapped_2.length > 0 && hasTool(SENDMESSAGE)
      ? `Only these stopped agents can be resumed: ${mapped_2.join(", ")}. To resume one, send a message to its agent id (agent names no longer resolve after a restart) with the ${SENDMESSAGE} tool instead of re-creating it: it continues from its saved transcript${tailText}. If no transcript is found the resume fails; re-create the agent then. Every other stopped task listed here is lost: do not send a message to its id.`
      : "";
  return mapped.length === 0
    ? resumableText
    : `These stopped agents are being resumed automatically from their saved transcripts: ${mapped.join(", ")}. Each goes on where it stopped and reports back to you in a notification when it is done, so you need not launch it again.${hasTool(SENDMESSAGE) ? ` If one does not report back, send a message to its agent id with the ${SENDMESSAGE} tool to resume it.` : ""} ${resumableText || "Every other stopped task listed here is lost: do not send a message to its id."}`;
}
//@ chunk-1kk50rk6.js:6521-6993 placement
/**
 * 从任务列表中挑出不在已有列表里的任务，按 task_id 去重并规范化字段（类型、描述、状态、输出文件）。
 */
function collectOrphanTasks(recorded, live) {
  let byId = new Map();
  for (let task of recorded) {
    if (
      typeof task?.task_id !== "string" ||
      !task.task_id ||
      byId.has(task.task_id) ||
      live.some((liveTask) => liveTask.task_id === task.task_id)
    )
      continue;
    byId.set(task.task_id, {
      task_id: task.task_id,
      task_type: typeof task.task_type === "string" ? task.task_type : "",
      description: typeof task.description === "string" ? task.description : "",
      status: (typeof task.status === "string" && task.status) || "unknown",
      ...(typeof task.output_file === "string" &&
        task.output_file && {
          output_file: task.output_file,
        }),
    });
  }
  return Array.from(byId.values());
}
//@ chunk-1kk50rk6.js:6993-7370 placement
/**
 * 把被中断的任务归类为 agent / monitor / shell：本地代理与工作流算 agent；监控类任务由代理拥有时算 agent，环境或观察者所有的忽略；纯 bash 只在允许时算 shell。
 */
function interruptedTaskKind(task, includeShells) {
  switch (task.task_type) {
    case "local_agent":
    case "local_workflow":
      return "agent";
    case "monitor_mcp":
    case "monitor_ws":
    case "local_bash":
      if (task.ambient === true || task.observer_owned === true) return;
      if (typeof task.owner_agent_id === "string" && task.owner_agent_id !== "") return "agent";
      if (task.task_type !== "local_bash" || task.shell_kind === "monitor") return "monitor";
      return includeShells ? "shell" : undefined;
    default:
      return;
  }
}
//@ chunk-1kk50rk6.js:7370-9202 placement
function describeInterruptedTasks(
  tasks,
  {
    interruptionKind,
    hasQueuedMainThreadCommand,
    deferredResumePending,
    rescueSuppressed,
    agentCardMark,
    enabled,
    includeShells,
    hasTool,
    alsoResumable,
    autoResumed,
    lostTimers,
  },
) {
  let counts = {
    agent: 0,
    monitor: 0,
    shell: 0,
  };
  let recorded = tasks.filter((task) => {
    let kind = interruptedTaskKind(task, includeShells);
    if (kind === undefined || autoResumed?.has(task.task_id)) return false;
    counts[kind]++;
    return true;
  });
  let filtered = tasks.filter((task) => autoResumed?.has(task.task_id));
  if (
    !enabled ||
    (recorded.length === 0 && lostTimers.length === 0 && filtered.length === 0) ||
    interruptionKind !== "none" ||
    (filtered.length === 0 && (hasQueuedMainThreadCommand || deferredResumePending)) ||
    (rescueSuppressed && agentCardMark === undefined)
  )
    return;
  let joined = recorded
    .map((task) => `"${escapeXml(task.description || "(no description)")}" (task ${escapeXml(task.task_id)})`)
    .join(", ");
  let notice = orphanAgentRestoreNotice(recorded, hasTool, alsoResumable);
  let lostLine = notice
    ? `None of it will report back on its own. ${notice} Re-create anything else`
    : "That work is lost \u2014 no result or further notification will arrive for it. Re-create it";
  let joined_2 = lostTimers.map(escapeXml).join("; ");
  let lines = [
    filtered.length > 0 &&
      `The container running this session was restarted. These background agents are being resumed automatically and will report back: ${filtered.map((task) => `"${escapeXml(task.description || "(no description)")}" (task ${escapeXml(task.task_id)})`).join(", ")}.`,
    recorded.length > 0 &&
      `The container running this session was restarted before background work reported back: ${joined}. ${lostLine} if still needed (a long-running server or watcher that nothing is waiting on does not need restarting now), or tell the user what was lost.`,
    lostTimers.length > 0 &&
      `${recorded.length > 0 ? "Timers that were pending in that container will not fire either" : "The container running this session was restarted, so these pending timers will not fire"}: ${joined_2}. Schedule each again if still needed (do the work of an overdue one now)${recorded.length > 0 ? "" : ", or tell the user what was lost"}.`,
  ];
  return {
    command: {
      mode: "task-notification",
      priority: "later",
      agentId: mainAgentId(),
      isMeta: true,
      startedBy: agentCardMark ?? "restart",
      ...(lostTimers.length > 0 && {
        wakesForLostTimers: true,
      }),
      skipAttachments: true,
      value: formatTaskNotification({
        status: "stopped",
        summary: lines.filter(Boolean).join(" "),
      }),
    },
    counts,
  };
}
//@ chunk-1kk50rk6.js:9202-9894 layout
function enqueueOrphanRestoreWake({ orphans, messageQueue, tools, answerMarks, ...rest }, answeredToolUseId) {
  let wakeCommand = describeInterruptedTasks(orphans, {
    ...rest,
    hasQueuedMainThreadCommand: messageQueue.peek(isDrainableMainThreadCommand) !== undefined,
    agentCardMark: answeredToolUseId === undefined ? undefined : answerMarks?.markOf(answeredToolUseId),
    enabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", true),
    includeShells: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake_shells", true),
    hasTool: (toolName) => findToolByName(tools, toolName) !== undefined,
  });
  if (wakeCommand === undefined) return;
  let { command, counts } = wakeCommand;
  logEvent("tengu_ccr_orphan_restore_wake", {
    orphan_count: orphans.length,
    wake_agent_count: counts.agent,
    wake_monitor_count: counts.monitor,
    wake_shell_count: counts.shell,
    wake_timer_count: rest.lostTimers.length,
  });
  logForDebugging(
    "[orphanRestoreWake] Waking the session for background tasks or timers lost to the restart",
  );
  messageQueue.enqueuePendingNotification(command);
  if (answeredToolUseId !== undefined) answerMarks?.queued(answeredToolUseId);
}
//@ chunk-1kk50rk6.js:9894-9904 placement
var MAX_RESTORED_AGENTS_LISTED = 50;
//@ chunk-1kk50rk6.js:9904-11670 placement
async function restoreOrphanAgents({ recorded, stopped, toldOfAnyway, readAgentMetadataEvents, storageV5 }) {
  let resumable = new Set(stopped.filter(getTaskOutputData).map((task) => task.task_id));
  rememberResumableAgents(resumable);
  if (!isTurnHandoffResumeEnabled())
    return {
      alsoResumable: new Set(),
      stillOffered: [],
      toKeep: undefined,
    };
  try {
    let marks = new Map();
    let told = new Set(toldOfAnyway.map((task) => task.task_id));
    let recordedList = Array.isArray(recorded) ? recorded : [];
    for (let entry of recordedList.slice(-MAX_RESTORED_AGENTS_LISTED)) {
      if (!isPlainObject(entry) || typeof entry.task_id !== "string") continue;
      let agentId = normalizeAgentIdOrNull(entry.task_id);
      if (agentId !== null && !told.has(agentId)) marks.set(agentId, entry.told === true ? "told" : "untold");
    }
    for (let task of stopped) {
      let agentId = task.task_type === "local_agent" ? normalizeAgentIdOrNull(task.task_id) : null;
      if (agentId !== null) marks.set(agentId, "stopped");
    }
    if (marks.size === 0)
      return {
        alsoResumable: new Set(),
        stillOffered: [],
        toKeep: [],
      };
    let stoppedOnly = new Set(Array.from(marks.keys()).filter((key) => !resumable.has(key)));
    rememberStoppedAgents(stoppedOnly);
    let results = await Promise.all(
      Array.from(marks.keys(), (agentId) => readAgentMetadataSafe(agentId, storageV5)),
    );
    let filtered = Array.from(marks.keys()).filter((key, index) => results[index] === null);
    let events = filtered.length > 0 ? await readAgentMetadataEvents(filtered) : [];
    if (events === null) logFeatureSad("subagent_sidecar_from_stream", "read_failed");
    let byAgent = new Map((events ?? []).map((event) => [event.session_agent_id, event.payload]));
    let results_2 = await Promise.all(
      Array.from(marks, async ([agentId, mark], index) => {
        let payload = results[index] === null ? byAgent.get(agentId) : undefined;
        let sidecar =
          payload === undefined
            ? results[index]
            : (await restoreAgentSidecarFromStream(agentId, payload, storageV5)) === "failed"
              ? undefined
              : await readAgentMetadataSafe(agentId, storageV5);
        let launch = sidecar ? validateAgentMetadata(sidecar) : undefined;
        return {
          agentId,
          mark,
          sidecar,
          launch,
        };
      }),
    );
    let filtered_2 = results_2.filter(
      ({ sidecar, launch }) => sidecar?.launchedWithDefaults === true && isRestorableOrphanAgent(launch),
    );
    let alsoResumable = new Set(filtered_2.map((entry) => entry.agentId));
    let filtered_3 = results_2.filter(
      (entry) =>
        resumable.has(entry.agentId) ||
        alsoResumable.has(entry.agentId) ||
        entry.mark !== "stopped" ||
        entry.sidecar === undefined ||
        (entry.sidecar === null && events === null),
    );
    return {
      alsoResumable,
      stillOffered: results_2
        .filter((entry) => entry.mark === "untold")
        .map((entry) => ({
          task_id: entry.agentId,
          task_type: "local_agent",
          description: entry.launch?.description ?? "",
        })),
      toKeep: filtered_3.slice(-MAX_RESTORED_AGENTS_LISTED).map((entry) => ({
        task_id: entry.agentId,
        ...(entry.mark === "told" && {
          told: true,
        }),
      })),
    };
  } catch (error) {
    logForDebugging(`[orphanAgentRestore] ${describeStorageError(error)}`, {
      level: "error",
    });
    return {
      alsoResumable: new Set(),
      stillOffered: [],
      toKeep: undefined,
    };
  }
}
//@ chunk-1kk50rk6.js:11670-11729 placement
/**
 * 判断子代理是否可被恢复：以默认参数启动且属于可恢复的孤儿代理。
 */
function isRestorableDefaultLaunchedAgent(agent) {
  return agent?.launchedWithDefaults === true && isRestorableOrphanAgent(agent);
}
//@ chunk-1kk50rk6.js:11729-11873 placement
function isRestorableOrphanAgent(launch) {
  return (
    launch !== undefined &&
    launch.spawnDepth === 1 &&
    launch.parentAgentId === undefined &&
    launch.spawnedWithWorktree !== true &&
    launch.stoppedByUser !== true &&
    launch.finished !== true
  );
}
//@ chunk-1kk50rk6.js:11873-11989 placement
async function readAgentMetadataSafe(agentId, storageV5) {
  try {
    return await readAgentMetadata(agentId, storageV5);
  } catch (error) {
    logForDebugging(`[orphanAgentRestore] ${describeStorageError(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-0yw3taqg.js:35313-35608 placement
function shouldAcknowledgeAgentStart(task, agentIds, runningTasksById, store) {
  return (
    task.type === "local_agent" &&
    task.pendingMessages.length === 0 &&
    agentIds.includes(task.agentId) &&
    store.peek((entry) => entry.agentId === task.agentId) === undefined &&
    !Object.values(runningTasksById).some(
      (entry) =>
        entry.status === "running" &&
        (entry.type === "local_bash" || entry.type === "monitor_mcp" || entry.type === "monitor_ws") &&
        entry.agentId === task.agentId,
    )
  );
}
//@ chunk-0yw3taqg.js:49344-49374 placement
var TENGU_PATIENT_BEACON = "tengu_patient_beacon";
//@ chunk-0yw3taqg.js:49374-49423 placement
function isAmbientRunning() {
  return (
    getRemoteFeatureGateState(TENGU_PATIENT_BEACON) === "on" &&
    !needsGrowthBookRefresh() &&
    isRemoteManagedEnvironment()
  );
}
//@ chunk-0yw3taqg.js:49423-50065 placement
/**
 * 判断后台等待能否提前醒来：仅当开关开启、没有待答询问、任务都已结算且存在可恢复的孤儿代理时才成立。
 */
function shouldKeepTurnOpen({ state: options, runningTasks, sessionState, messageQueue, tools }) {
  if (!isAmbientRunning()) return false;
  let tasks = runningTasks.filter((task) => !(task.type === "monitor_ws" && task.ambient === true));
  let pendingActions = sessionState.getPendingActionDetails?.() ?? [];
  let pendingAgentIds = pendingActions.map((action) => action.agent_id);
  let blocked = runningBackgroundTasks(options);
  return (
    tasks.length > 0 &&
    pendingActions.length === tasks.length &&
    pendingActions.length < MAX_PENDING_ACTION_ARGS &&
    pendingActions.every((task) => sessionState.doesStoredAnswerStand(task)) &&
    getRemoteFeatureGateState(TENGU_CCR_INHERITED_APPROVAL_KILLSWITCH) === "off" &&
    sessionState.heldRequiresAction?.() === undefined &&
    sessionState.getState() === "requires_action" &&
    !hasActiveInProcessTeammates(options) &&
    !hasNonLeadTeammate(options.teamContext) &&
    messageQueue.peek() === undefined &&
    getSessionCronTasks().length === 0 &&
    tasks.every(
      (task) =>
        shouldAcknowledgeAgentStart(task, pendingAgentIds, options.tasks, messageQueue) &&
        canResumeAgentsInBackground(tools(), options.toolPermissionContext, task.agentType) &&
        blocked.some((action) => action.task_id === task.id && getTaskOutputData(action)),
    ) &&
    isIterativeHavenGateOn() &&
    isTurnHandoffResumeEnabled() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", true)
  );
}
export {
  collectOrphanTasks,
  restoreOrphanAgents,
  isAmbientRunning,
  orphanAgentRestoreNotice,
  enqueueOrphanRestoreWake,
  isRestorableDefaultLaunchedAgent,
  shouldKeepTurnOpen,
};
