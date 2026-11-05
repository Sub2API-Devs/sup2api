/**
 * tasks/backgroundTaskLabels.ts
 *
 * 后台任务种类与状态标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bqk7td02.js (22)
 * attribution: placement 20, layout 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../utils/env.js";
import { getSessionCronTasks, getSessionId } from "../bootstrap/state.js";
import { truncate, formatDuration } from "../utils/format.js";
import { cronToHuman, parseCronExpression, computeNextCronRun } from "../utils/cron.js";
import {
  taskAbortController,
  isIdleTeammateTask,
  taskKindLabel,
  TASK_KIND_LABELS,
  isLocalScriptTask,
  isAmbientTask,
  isMainThreadForegroundAgent,
} from "./taskKinds.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import { getInFlightWithSessionCrons } from "../services/daemon/sessionCron.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { isAutoReactArmedMonitorTask, isMonitorWsTaskLive } from "./MonitorWsTask/MonitorWsTask.js";
import { getMcpTaskProjectDir } from "../services/mcp/mcpTasks.js";
import {
  isAutoReactWatching,
  getBootingAutoReactSlugs,
  getAutoReactSlugs,
} from "../services/artifactComments/autoReplyNotices.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import { countWhere } from "../utils/collections.js";
import { getPillLabel } from "./pillLabel.js";
import { plural } from "../utils/stringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-bqk7td02.js:784-829 placement
/**
 * 是否允许接管（adopt）后台任务：未设置 CLAUDE_DISABLE_ADOPT。
 */
function isAdoptEnabled() {
  return !env.CLAUDE_DISABLE_ADOPT;
}
//@ chunk-bqk7td02.js:829-838 placement
var MAX_TASK_DETAIL_CHARS = 50;
//@ chunk-bqk7td02.js:838-986 placement
function sessionCronLabels(cronFilter) {
  let labels = [];
  for (let cronTask of getSessionCronTasks()) {
    if (cronFilter && !cronFilter(cronTask)) continue;
    labels.push({
      label: "scheduled task",
      detail: `${cronScheduleText(cronTask)} \xB7 ${truncate(cronTask.prompt, MAX_TASK_DETAIL_CHARS, true)}`,
    });
  }
  return labels;
}
//@ chunk-bqk7td02.js:986-1217 placement
function cronScheduleText(cronTask) {
  if (cronTask.recurring) return cronToHuman(cronTask.cron);
  let fields = parseCronExpression(cronTask.cron);
  let nextRun =
    fields &&
    computeNextCronRun(fields, new Date(cronTask.createdAt), {
      oneShot: true,
    });
  if (!nextRun) return cronToHuman(cronTask.cron);
  let max = Math.max(0, nextRun.getTime() - Date.now());
  return `Runs once in ${formatDuration(max, {
    mostSignificantOnly: true,
  })}`;
}
//@ chunk-bqk7td02.js:1217-1851 placement
function backgroundTaskKindLabel(tasks, { includeDream = false, mcpClients } = {}) {
  let labels = [];
  let agentIdsWithRun = new Set(
    Object.values(tasks).flatMap((task) =>
      task.type === "local_agent" &&
      task.agentType !== "main-session" &&
      (taskAbortController(task) || task.status === "killed")
        ? [task.agentId]
        : [],
    ),
  );
  for (let task of Object.values(tasks)) {
    if (!waitForTaskCompletion(task) || task.type === "remote_agent") continue;
    if (!includeDream && task.type === "dream") continue;
    if (task.type === "post_turn_memory") continue;
    if (task.type === "monitor_ws" && task.ambient) continue;
    if (isIdleTeammateTask(task)) continue;
    if (taskAbortController(task)) continue;
    if (isLocalShellTask(task) && task.agentId !== undefined && agentIdsWithRun.has(task.agentId)) continue;
    if (isRemoteMcpTask(task, mcpClients)) continue;
    if (isLocalShellTask(task) && task.stopsOnExit && isStoppableKind(task.kind)) continue;
    labels.push({
      label: taskKindLabel(task.type),
      detail: truncate(task.description, MAX_TASK_DETAIL_CHARS, true),
    });
  }
  labels.push(...sessionCronLabels());
  return labels;
}
//@ chunk-bqk7td02.js:1851-1943 placement
var TASK_KIND_LABELS_2 = {
  agent: "subagent",
  workflow: "workflow",
  shell: "shell",
  monitor: "monitor",
  mcp: "MCP task",
};
//@ chunk-bqk7td02.js:1943-2655 placement
function backgroundTaskDescription(taskStates, mcpClients) {
  let inFlightWithSessionCrons = getInFlightWithSessionCrons();
  let { items, kinds } = inFlightWithSessionCrons;
  let labels = [];
  for (let item of items) {
    if (item.kind === "todo" || item.doneAt !== undefined || (item.stopsOnExit && isStoppableKind(item.kind)))
      continue;
    if (isRemoteMcpTask(taskStates?.[item.id], mcpClients)) continue;
    labels.push({
      label: TASK_KIND_LABELS_2[item.kind],
      detail: truncate(item.label, MAX_TASK_DETAIL_CHARS, true),
    });
  }
  if (kinds.includes("auto_mode_scan"))
    labels.push({
      label: TASK_KIND_LABELS.auto_mode_scan,
      detail: "environment scan for /auto-mode-setup",
    });
  if (kinds.includes("local_memory_import"))
    labels.push({
      label: TASK_KIND_LABELS.local_memory_import,
      detail: "still reading local memory notes; running the command again later continues it",
    });
  if (codeModeAccepted() && kinds.includes("local_script")) {
    let scripts = inFlightWithSessionCrons.scripts?.length
      ? inFlightWithSessionCrons.scripts
      : [require("./localScriptTask.js").UNNAMED_SCRIPT];
    for (let script of scripts)
      labels.push({
        label: taskKindLabel("local_script"),
        detail: truncate(script, MAX_TASK_DETAIL_CHARS, true),
      });
  }
  labels.push(...sessionCronLabels());
  return labels;
}
//@ chunk-bqk7td02.js:2655-2723 placement
/**
 * 是环境监视任务且当前未被自动反应武装（可被等待）。
 */
function isAmbientMonitorNotArmed(task) {
  return task.type === "monitor_ws" && task.ambient === true && !isAutoReactArmedMonitorTask(task);
}
//@ chunk-bqk7td02.js:2723-2875 placement
function waitableTasks(tasks) {
  return Object.values(tasks)
    .filter(waitForTaskCompletion)
    .filter(
      (task) => task.type !== "remote_agent" && task.type !== "dream" && task.type !== "post_turn_memory",
    )
    .filter((task) => !isAmbientMonitorNotArmed(task));
}
//@ chunk-bqk7td02.js:2875-2946 layout
function pendingTaskDescriptions(tasks) {
  return codeModeAccepted()
    ? waitableTasks(tasks)
        .filter(isLocalScriptTask)
        .map((item) => item.description)
    : [];
}
//@ chunk-bqk7td02.js:2946-3458 placement
function backgroundTaskStatusLabel(task) {
  if (task.status !== "running" && task.status !== "pending") return false;
  if (isAmbientTask(task)) return false;
  if (
    task.type === "in_process_teammate" &&
    task.evictAfter === 0 &&
    task.currentWorkAbortController === undefined &&
    isIdleTeammateTask(task)
  )
    return false;
  if (task.type === "remote_agent" || task.type === "dream" || task.type === "post_turn_memory") return false;
  if (task.type === "mcp_task" && task.abortController === undefined) {
    if (task.protocol === "sep2663") {
      if (task.parked === true) return false;
      return task.sidecarSessionId !== getSessionId() || task.sidecarProjectDir !== getMcpTaskProjectDir();
    }
    return false;
  }
  if (task.type === "monitor_ws" && task.ambient === true) return false;
  return true;
}
//@ chunk-bqk7td02.js:3458-3508 placement
/**
 * 已武装且带有活动帧的监视任务。
 */
function isLiveFrameTask(task) {
  return isAutoReactArmedMonitorTask(task) && task.frameLive !== undefined;
}
//@ chunk-bqk7td02.js:3508-3576 placement
/**
 * 后台任务退出交接是否启用。
 */
function isBackgroundExitHandoffEnabled() {
  return isAdoptEnabled() && !env.CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF;
}
//@ chunk-bqk7td02.js:3576-3612 placement
/**
 * 已武装且监视器在线运行的任务。
 */
function isLiveAutoReactTask(task) {
  return isAutoReactArmedMonitorTask(task) && isMonitorWsTaskLive(task);
}
//@ chunk-bqk7td02.js:3612-3681 placement
/**
 * 是否有活动或启动中的自动反应任务（或定时任务在启动）。
 */
function hasLiveOrBootingAutoReact(tasks) {
  return (
    Object.values(tasks).some(isLiveAutoReactTask) ||
    isAutoReactWatching() ||
    getBootingAutoReactSlugs().size > 0
  );
}
//@ chunk-bqk7td02.js:3681-3729 placement
/**
 * 任务集合里是否有需要显示「后台运行中」标签的任务。
 */
function hasRunningBackgroundTask(tasks) {
  return Object.values(tasks).some(backgroundTaskStatusLabel);
}
//@ chunk-bqk7td02.js:3729-4161 placement
/**
 * 汇总后台工作：任务数（含会话定时任务与 Artifact 监视）、可重启数、种类、可排空的监视器等。
 */
function summarizeBackgroundWork(tasks, { sessionCrons = true } = {}) {
  let waitable = waitableTasks(tasks);
  let cronCount = sessionCrons ? getSessionCronTasks().length : 0;
  let kinds = normalizeCaseForComparison_2(waitable.map(taskKindKey));
  let frameSlugs = new Set(waitable.flatMap((task) => (isLiveFrameTask(task) ? [task.frameLive.slug] : [])));
  let bootingCount = !isAdoptEnabled()
    ? 0
    : countWhere(
        normalizeCaseForComparison_2([...getAutoReactSlugs(), ...getBootingAutoReactSlugs()]),
        (slug) => !frameSlugs.has(slug),
      );
  if (bootingCount > 0 && !kinds.includes("artifact_watch")) kinds.push("artifact_watch");
  let drainableMonitors = isBackgroundExitHandoffEnabled() ? frameSlugs.size + bootingCount : 0;
  if (cronCount > 0) kinds.push("session_cron");
  let restartableCount = countWhere(Object.values(tasks), isMainThreadForegroundAgent);
  return {
    count: waitable.length + cronCount + bootingCount,
    restartableCount,
    kinds,
    drainableMonitors,
    carriedMonitors: frameSlugs.size + bootingCount,
  };
}
//@ chunk-bqk7td02.js:4161-4284 placement
function taskKindKey(task) {
  if (task.type === "monitor_ws" && task.ambient) return "artifact_watch";
  return isLocalShellTask(task) && task.kind === "monitor" ? "monitor" : task.type;
}
//@ chunk-bqk7td02.js:4284-4527 placement
/**
 * 生成后台工作摘要：数量、种类与显示文字（任务标签和循环数）。
 */
function backgroundWorkSummary(taskStates, options) {
  let tasks = waitableTasks(taskStates);
  let cronLabels = sessionCronLabels(options?.cronFilter);
  let count = tasks.length + cronLabels.length;
  let kinds = normalizeCaseForComparison_2(tasks.map(taskKindKey));
  if (cronLabels.length > 0) kinds.push("session_cron");
  let parts = [
    getPillLabel(tasks),
    cronLabels.length ? `${cronLabels.length} ${plural(cronLabels.length, "loop")}` : "",
  ];
  return {
    count,
    kinds,
    summary: parts.filter(Boolean).join(", "),
  };
}
//@ chunk-bqk7td02.js:4527-4691 placement
function formatDetachedTaskNotice() {
  let { tasks } = getInFlightWithSessionCrons();
  if (tasks === 0) return;
  return `Detached \u2014 ${tasks} ${plural(tasks, "task")} still running. Run \`claude agents\` to see your background sessions.`;
}
//@ chunk-bqk7td02.js:4691-4843 placement
function isRemoteMcpTask(task, mcpClients) {
  if (task?.type !== "mcp_task" || backgroundTaskStatusLabel(task)) return false;
  let serverType = mcpClients?.find((client) => client.name === task.serverName)?.config.type;
  return serverType !== undefined && serverType !== "stdio" && serverType !== "sdk";
}
//@ chunk-bqk7td02.js:4843-4908 affinity
function isStoppableKind(kind) {
  return kind !== "monitor" || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_dijkstra", true);
}
export {
  hasRunningBackgroundTask,
  isBackgroundExitHandoffEnabled,
  hasLiveOrBootingAutoReact,
  isAdoptEnabled,
  summarizeBackgroundWork,
  backgroundTaskDescription,
  formatDetachedTaskNotice,
  backgroundWorkSummary,
  pendingTaskDescriptions,
  backgroundTaskKindLabel,
};
