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
  SNe,
  Ghn,
} from "./taskKinds.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import { getInFlightWithSessionCrons } from "../services/daemon/sessionCron.js";
import { Xye, isMonitorWsTaskLive } from "./MonitorWsTask/MonitorWsTask.js";
import { getMcpTaskProjectDir } from "../services/mcp/mcpTasks.js";
import {
  NUs,
  getBootingAutoReactSlugs,
  getAutoReactSlugs,
} from "../services/artifactComments/autoReplyNotices.js";
import { uniq, count } from "../utils/collections.js";
import { getPillLabel } from "./pillLabel.js";
import { plural } from "../utils/stringUtils.js";

//@ chunk-sq8979s2.js:710-755 placement
function NLe() {
  return !env.CLAUDE_DISABLE_ADOPT;
}
//@ chunk-sq8979s2.js:755-764 placement
var u = 50;
//@ chunk-sq8979s2.js:764-912 placement
function sessionCronLabels(e) {
  let o = [];
  for (let n of getSessionCronTasks()) {
    if (e && !e(n)) continue;
    o.push({ label: "scheduled task", detail: `${cronScheduleText(n)} \xB7 ${truncate(n.prompt, u, !0)}` });
  }
  return o;
}
//@ chunk-sq8979s2.js:912-1143 placement
function cronScheduleText(e) {
  if (e.recurring) return cronToHuman(e.cron);
  let o = parseCronExpression(e.cron),
    n = o && computeNextCronRun(o, new Date(e.createdAt), { oneShot: !0 });
  if (!n) return cronToHuman(e.cron);
  let max = Math.max(0, n.getTime() - Date.now());
  return `Runs once in ${formatDuration(max, { mostSignificantOnly: !0 })}`;
}
//@ chunk-sq8979s2.js:1143-1569 placement
function backgroundTaskKindLabel(e, { includeDream: o = !1, mcpClients: n } = {}) {
  let r = [];
  for (let t of Object.values(e)) {
    if (!waitForTaskCompletion(t) || t.type === "remote_agent") continue;
    if (!o && t.type === "dream") continue;
    if (t.type === "post_turn_memory") continue;
    if (t.type === "monitor_ws" && t.ambient) continue;
    if (isIdleTeammateTask(t)) continue;
    if (taskAbortController(t)) continue;
    if (isRemoteMcpTask(t, n)) continue;
    if (isLocalShellTask(t) && t.stopsOnExit) continue;
    r.push({ label: taskKindLabel(t.type), detail: truncate(t.description, u, !0) });
  }
  return (r.push(...sessionCronLabels()), r);
}
//@ chunk-sq8979s2.js:1569-1661 placement
var b = { agent: "subagent", workflow: "workflow", shell: "shell", monitor: "monitor", mcp: "MCP task" };
//@ chunk-sq8979s2.js:1661-2174 placement
function backgroundTaskDescription(e, o) {
  let n = getInFlightWithSessionCrons(),
    { items: items, kinds: kinds } = n,
    a = [];
  for (let s of items) {
    if (s.kind === "todo" || s.doneAt !== void 0 || s.stopsOnExit) continue;
    if (isRemoteMcpTask(e?.[s.id], o)) continue;
    a.push({ label: b[s.kind], detail: truncate(s.label, u, !0) });
  }
  if (kinds.includes("auto_mode_scan"))
    a.push({ label: TASK_KIND_LABELS.auto_mode_scan, detail: "environment scan for /auto-mode-setup" });
  if (kinds.includes("local_memory_import"))
    a.push({
      label: TASK_KIND_LABELS.local_memory_import,
      detail: "still reading local memory notes; running the command again later continues it",
    });
  return (a.push(...sessionCronLabels()), a);
}
//@ chunk-sq8979s2.js:2174-2242 placement
function S(e) {
  return e.type === "monitor_ws" && e.ambient === !0 && !Xye(e);
}
//@ chunk-sq8979s2.js:2242-2394 placement
function waitableTasks(e) {
  return Object.values(e)
    .filter(waitForTaskCompletion)
    .filter((o) => o.type !== "remote_agent" && o.type !== "dream" && o.type !== "post_turn_memory")
    .filter((o) => !S(o));
}
//@ chunk-sq8979s2.js:2394-2906 placement
function backgroundTaskStatusLabel(e) {
  if (e.status !== "running" && e.status !== "pending") return !1;
  if (SNe(e)) return !1;
  if (
    e.type === "in_process_teammate" &&
    e.evictAfter === 0 &&
    e.currentWorkAbortController === void 0 &&
    isIdleTeammateTask(e)
  )
    return !1;
  if (e.type === "remote_agent" || e.type === "dream" || e.type === "post_turn_memory") return !1;
  if (e.type === "mcp_task" && e.abortController === void 0) {
    if (e.protocol === "sep2663") {
      if (e.parked === !0) return !1;
      return e.sidecarSessionId !== getSessionId() || e.sidecarProjectDir !== getMcpTaskProjectDir();
    }
    return !1;
  }
  if (e.type === "monitor_ws" && e.ambient === !0) return !1;
  return !0;
}
//@ chunk-sq8979s2.js:2906-2956 placement
function T(e) {
  return Xye(e) && e.frameLive !== void 0;
}
//@ chunk-sq8979s2.js:2956-3024 placement
function BCo() {
  return NLe() && !env.CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF;
}
//@ chunk-sq8979s2.js:3024-3060 placement
function y(e) {
  return Xye(e) && isMonitorWsTaskLive(e);
}
//@ chunk-sq8979s2.js:3060-3129 placement
function CFs(e) {
  return Object.values(e).some(y) || NUs() || getBootingAutoReactSlugs().size > 0;
}
//@ chunk-sq8979s2.js:3129-3177 placement
function MGe(e) {
  return Object.values(e).some(backgroundTaskStatusLabel);
}
/**
 * 汇总后台工作：任务数（含会话定时任务与 Artifact 监视）、可重启数、种类、可排空的监视器等。
 */
//@ chunk-sq8979s2.js:3177-3609 placement
function summarizeBackgroundWork(tasks, { sessionCrons: o = !0 } = {}) {
  let n = waitableTasks(tasks),
    r = o ? getSessionCronTasks().length : 0,
    t = uniq(n.map(taskKindKey)),
    a = new Set(n.flatMap((c) => (T(c) ? [c.frameLive.slug] : []))),
    s = !NLe() ? 0 : count(uniq([...getAutoReactSlugs(), ...getBootingAutoReactSlugs()]), (c) => !a.has(c));
  if (s > 0 && !t.includes("artifact_watch")) t.push("artifact_watch");
  let d = BCo() ? a.size + s : 0;
  if (r > 0) t.push("session_cron");
  let k = count(Object.values(tasks), Ghn);
  return {
    count: n.length + r + s,
    restartableCount: k,
    kinds: t,
    drainableMonitors: d,
    carriedMonitors: a.size + s,
  };
}
//@ chunk-sq8979s2.js:3609-3732 placement
function taskKindKey(e) {
  if (e.type === "monitor_ws" && e.ambient) return "artifact_watch";
  return isLocalShellTask(e) && e.kind === "monitor" ? "monitor" : e.type;
}
/**
 * 生成后台工作摘要：数量、种类与显示文字（任务标签和循环数）。
 */
//@ chunk-sq8979s2.js:3732-3975 placement
function backgroundWorkSummary(e, o) {
  let n = waitableTasks(e),
    r = sessionCronLabels(o?.cronFilter),
    t = n.length + r.length,
    a = uniq(n.map(taskKindKey));
  if (r.length > 0) a.push("session_cron");
  let s = [getPillLabel(n), r.length ? `${r.length} ${plural(r.length, "loop")}` : ""];
  return { count: t, kinds: a, summary: s.filter(Boolean).join(", ") };
}
//@ chunk-sq8979s2.js:3975-4139 placement
function formatDetachedTaskNotice() {
  let { tasks: tasks } = getInFlightWithSessionCrons();
  if (tasks === 0) return;
  return `Detached \u2014 ${tasks} ${plural(tasks, "task")} still running. Run \`claude agents\` to see your background sessions.`;
}
//@ chunk-sq8979s2.js:4139-4291 placement
function isRemoteMcpTask(e, o) {
  if (e?.type !== "mcp_task" || backgroundTaskStatusLabel(e)) return !1;
  let n = o?.find((r) => r.name === e.serverName)?.config.type;
  return n !== void 0 && n !== "stdio" && n !== "sdk";
}

export {
  summarizeBackgroundWork,
  formatDetachedTaskNotice,
  NLe,
  backgroundWorkSummary,
  MGe,
  backgroundTaskKindLabel,
  BCo,
  CFs,
  backgroundTaskDescription,
};
