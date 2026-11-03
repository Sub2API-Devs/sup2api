/**
 * tasks/backgroundTaskLabels.ts
 *
 * 后台任务种类与状态标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sq8979s2.js (20)
 * attribution: placement 20
 */
import { env } from "../utils/env.js";
import { getSessionCronTasks, getSessionId } from "../bootstrap/state.js";
import { truncate, formatDuration } from "../utils/format.js";
import { cronToHuman, parseCronExpression, computeNextCronRun } from "../utils/cron.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import {
  isIdleTeammateTask,
  taskAbortController,
  taskKindLabel,
  TASK_KIND_LABELS,
  isAmbientTask,
  isMainThreadForegroundAgent,
} from "./taskKinds.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import { getInFlightWithSessionCrons } from "../services/daemon/sessionCron.js";
import { isAutoReactArmedMonitorTask, isMonitorWsTaskLive } from "./MonitorWsTask/MonitorWsTask.js";
import { getMcpTaskProjectDir } from "../services/mcp/mcpTasks.js";
import {
  isAutoReactWatching,
  getBootingAutoReactSlugs,
  getAutoReactSlugs,
} from "../services/artifactComments/autoReplyNotices.js";
import { uniq, count } from "../utils/collections.js";
import { getPillLabel } from "./pillLabel.js";
import { plural } from "../utils/stringUtils.js";

//@ chunk-sq8979s2.js:710-755 placement
/**
 * 是否允许接管（adopt）后台任务：未设置 CLAUDE_DISABLE_ADOPT。
 */
function isAdoptEnabled() {
  return !env.CLAUDE_DISABLE_ADOPT;
}
//@ chunk-sq8979s2.js:755-764 placement
var MAX_TASK_DETAIL_CHARS = 50;
//@ chunk-sq8979s2.js:764-912 placement
function sessionCronLabels(cronFilter) {
  let o = [];
  for (let n of getSessionCronTasks()) {
    if (cronFilter && !cronFilter(n)) continue;
    o.push({
      label: "scheduled task",
      detail: `${cronScheduleText(n)} \xB7 ${truncate(n.prompt, MAX_TASK_DETAIL_CHARS, true)}`,
    });
  }
  return o;
}
//@ chunk-sq8979s2.js:912-1143 placement
function cronScheduleText(e) {
  if (e.recurring) return cronToHuman(e.cron);
  let fields = parseCronExpression(e.cron);
  let n =
    fields &&
    computeNextCronRun(fields, new Date(e.createdAt), {
      oneShot: true,
    });
  if (!n) return cronToHuman(e.cron);
  let max = Math.max(0, n.getTime() - Date.now());
  return `Runs once in ${formatDuration(max, {
    mostSignificantOnly: true,
  })}`;
}
//@ chunk-sq8979s2.js:1143-1569 placement
function backgroundTaskKindLabel(tasks, { includeDream: o = false, mcpClients: n } = {}) {
  let r = [];
  for (let t of Object.values(tasks)) {
    if (!waitForTaskCompletion(t) || t.type === "remote_agent") continue;
    if (!o && t.type === "dream") continue;
    if (t.type === "post_turn_memory") continue;
    if (t.type === "monitor_ws" && t.ambient) continue;
    if (isIdleTeammateTask(t)) continue;
    if (taskAbortController(t)) continue;
    if (isRemoteMcpTask(t, n)) continue;
    if (isLocalShellTask(t) && t.stopsOnExit) continue;
    r.push({
      label: taskKindLabel(t.type),
      detail: truncate(t.description, MAX_TASK_DETAIL_CHARS, true),
    });
  }
  r.push(...sessionCronLabels());
  return r;
}
//@ chunk-sq8979s2.js:1569-1661 placement
var TASK_KIND_LABELS_2 = {
  agent: "subagent",
  workflow: "workflow",
  shell: "shell",
  monitor: "monitor",
  mcp: "MCP task",
};
//@ chunk-sq8979s2.js:1661-2174 placement
function backgroundTaskDescription(e, mcpClients) {
  let inFlightWithSessionCrons = getInFlightWithSessionCrons();
  let { items, kinds } = inFlightWithSessionCrons;
  let a = [];
  for (let item of items) {
    if (item.kind === "todo" || item.doneAt !== undefined || item.stopsOnExit) continue;
    if (isRemoteMcpTask(e?.[item.id], mcpClients)) continue;
    a.push({
      label: TASK_KIND_LABELS_2[item.kind],
      detail: truncate(item.label, MAX_TASK_DETAIL_CHARS, true),
    });
  }
  if (kinds.includes("auto_mode_scan"))
    a.push({
      label: TASK_KIND_LABELS.auto_mode_scan,
      detail: "environment scan for /auto-mode-setup",
    });
  if (kinds.includes("local_memory_import"))
    a.push({
      label: TASK_KIND_LABELS.local_memory_import,
      detail: "still reading local memory notes; running the command again later continues it",
    });
  a.push(...sessionCronLabels());
  return a;
}
//@ chunk-sq8979s2.js:2174-2242 placement
/**
 * 是环境监视任务且当前未被自动反应武装（可被等待）。
 */
function isAmbientMonitorNotArmed(e) {
  return e.type === "monitor_ws" && e.ambient === true && !isAutoReactArmedMonitorTask(e);
}
//@ chunk-sq8979s2.js:2242-2394 placement
function waitableTasks(e) {
  return Object.values(e)
    .filter(waitForTaskCompletion)
    .filter((o) => o.type !== "remote_agent" && o.type !== "dream" && o.type !== "post_turn_memory")
    .filter((o) => !isAmbientMonitorNotArmed(o));
}
//@ chunk-sq8979s2.js:2394-2906 placement
function backgroundTaskStatusLabel(e) {
  if (e.status !== "running" && e.status !== "pending") return false;
  if (isAmbientTask(e)) return false;
  if (
    e.type === "in_process_teammate" &&
    e.evictAfter === 0 &&
    e.currentWorkAbortController === undefined &&
    isIdleTeammateTask(e)
  )
    return false;
  if (e.type === "remote_agent" || e.type === "dream" || e.type === "post_turn_memory") return false;
  if (e.type === "mcp_task" && e.abortController === undefined) {
    if (e.protocol === "sep2663") {
      if (e.parked === true) return false;
      return e.sidecarSessionId !== getSessionId() || e.sidecarProjectDir !== getMcpTaskProjectDir();
    }
    return false;
  }
  if (e.type === "monitor_ws" && e.ambient === true) return false;
  return true;
}
//@ chunk-sq8979s2.js:2906-2956 placement
/**
 * 已武装且带有活动帧的监视任务。
 */
function isLiveFrameTask(e) {
  return isAutoReactArmedMonitorTask(e) && e.frameLive !== undefined;
}
//@ chunk-sq8979s2.js:2956-3024 placement
/**
 * 后台任务退出交接是否启用。
 */
function isBackgroundExitHandoffEnabled() {
  return isAdoptEnabled() && !env.CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF;
}
//@ chunk-sq8979s2.js:3024-3060 placement
/**
 * 已武装且监视器在线运行的任务。
 */
function isLiveAutoReactTask(e) {
  return isAutoReactArmedMonitorTask(e) && isMonitorWsTaskLive(e);
}
//@ chunk-sq8979s2.js:3060-3129 placement
/**
 * 是否有活动或启动中的自动反应任务（或定时任务在启动）。
 */
function hasLiveOrBootingAutoReact(e) {
  return (
    Object.values(e).some(isLiveAutoReactTask) || isAutoReactWatching() || getBootingAutoReactSlugs().size > 0
  );
}
//@ chunk-sq8979s2.js:3129-3177 placement
/**
 * 任务集合里是否有需要显示「后台运行中」标签的任务。
 */
function hasRunningBackgroundTask(e) {
  return Object.values(e).some(backgroundTaskStatusLabel);
}
//@ chunk-sq8979s2.js:3177-3609 placement
/**
 * 汇总后台工作：任务数（含会话定时任务与 Artifact 监视）、可重启数、种类、可排空的监视器等。
 */
function summarizeBackgroundWork(tasks, { sessionCrons: o = true } = {}) {
  let n = waitableTasks(tasks);
  let r = o ? getSessionCronTasks().length : 0;
  let t = uniq(n.map(taskKindKey));
  let a = new Set(n.flatMap((c) => (isLiveFrameTask(c) ? [c.frameLive.slug] : [])));
  let s = !isAdoptEnabled()
    ? 0
    : count(uniq([...getAutoReactSlugs(), ...getBootingAutoReactSlugs()]), (c) => !a.has(c));
  if (s > 0 && !t.includes("artifact_watch")) t.push("artifact_watch");
  let drainableMonitors = isBackgroundExitHandoffEnabled() ? a.size + s : 0;
  if (r > 0) t.push("session_cron");
  let restartableCount = count(Object.values(tasks), isMainThreadForegroundAgent);
  return {
    count: n.length + r + s,
    restartableCount,
    kinds: t,
    drainableMonitors,
    carriedMonitors: a.size + s,
  };
}
//@ chunk-sq8979s2.js:3609-3732 placement
function taskKindKey(e) {
  if (e.type === "monitor_ws" && e.ambient) return "artifact_watch";
  return isLocalShellTask(e) && e.kind === "monitor" ? "monitor" : e.type;
}
//@ chunk-sq8979s2.js:3732-3975 placement
/**
 * 生成后台工作摘要：数量、种类与显示文字（任务标签和循环数）。
 */
function backgroundWorkSummary(e, o) {
  let tasks = waitableTasks(e);
  let r = sessionCronLabels(o?.cronFilter);
  let count = tasks.length + r.length;
  let a = uniq(tasks.map(taskKindKey));
  if (r.length > 0) a.push("session_cron");
  let s = [getPillLabel(tasks), r.length ? `${r.length} ${plural(r.length, "loop")}` : ""];
  return {
    count,
    kinds: a,
    summary: s.filter(Boolean).join(", "),
  };
}
//@ chunk-sq8979s2.js:3975-4139 placement
function formatDetachedTaskNotice() {
  let { tasks } = getInFlightWithSessionCrons();
  if (tasks === 0) return;
  return `Detached \u2014 ${tasks} ${plural(tasks, "task")} still running. Run \`claude agents\` to see your background sessions.`;
}
//@ chunk-sq8979s2.js:4139-4291 placement
function isRemoteMcpTask(e, o) {
  if (e?.type !== "mcp_task" || backgroundTaskStatusLabel(e)) return false;
  let n = o?.find((r) => r.name === e.serverName)?.config.type;
  return n !== undefined && n !== "stdio" && n !== "sdk";
}
export {
  summarizeBackgroundWork,
  formatDetachedTaskNotice,
  isAdoptEnabled,
  backgroundWorkSummary,
  hasRunningBackgroundTask,
  backgroundTaskKindLabel,
  isBackgroundExitHandoffEnabled,
  hasLiveOrBootingAutoReact,
  backgroundTaskDescription,
};
