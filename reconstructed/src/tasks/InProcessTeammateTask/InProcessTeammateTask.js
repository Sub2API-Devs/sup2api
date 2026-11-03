/**
 * tasks/InProcessTeammateTask/InProcessTeammateTask.tsx
 *
 * 同进程 teammate 任务（in_process_teammate）：任务实现、按 agentId/名字查找、注入用户消息、运行中 teammate 列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-kxyd0g16.js (2), chunk-phrnybk8.js (1), chunk-v5mxhgy9.js (5)
 * attribution: fingerprint 5, file-local 2, layout 2
 */
import { killInProcessTeammate } from "../../utils/swarm/spawnInProcess.js";
import { isInProcessTeammateTask } from "./types.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { slugifySessionName } from "../../utils/sessionAddresses.js";
import { isWaitingOnChildren } from "../LocalAgentTask/keepalive.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";
import { logForDebugging } from "../../utils/debug.js";
import { createUserMessage } from "../../utils/messages.js";
import { appendBounded } from "../taskKinds.js";

//@ chunk-v5mxhgy9.js:554-721 fingerprint = InProcessTeammateTask (0.789)
/**
 * InProcessTeammateTask 任务实现：kill 时调用 killInProcessTeammate，等待移出团队与 OS 侧拆除完成；k 为 10 秒超时常量。
 */
var InProcessTeammateTask = {
  name: "InProcessTeammateTask",
  type: "in_process_teammate",
  async kill(taskId, setAppState, setAppState_2, r, storage) {
    let { memberRemoval, osTeardown } = killInProcessTeammate(taskId, setAppState, setAppState_2, storage);
    await Promise.all([memberRemoval, osTeardown]);
  },
};
var TEAMMATE_TEARDOWN_TIMEOUT_MS = 1e4;
//@ chunk-v5mxhgy9.js:2171-2311 fingerprint = findTeammateTaskByAgentId (1)
/**
 * 按 agentId 找 teammate 任务，优先运行中的。
 */
function findTeammateTaskByAgentId(agentId, tasks) {
  let fallback;
  for (let task of Object.values(tasks))
    if (isInProcessTeammateTask(task) && task.identity.agentId === agentId) {
      if (task.status === "running") return task;
      if (!fallback) fallback = task;
    }
  return fallback;
}
//@ chunk-v5mxhgy9.js:2311-3006 layout
/**
 * 按 agentId、可恢复 agentId 或名字解析 teammate 任务，返回 found / ambiguous（附候选与是否有存活）/ not_found。
 */
function resolveTeammateTask(idOrName, tasks) {
  let teammateTaskByAgentId = findTeammateTaskByAgentId(idOrName, tasks);
  if (teammateTaskByAgentId)
    return {
      status: "found",
      task: teammateTaskByAgentId,
    };
  let filtered = Object.values(tasks)
    .filter(isInProcessTeammateTask)
    .filter((n) => n.identity.resumableAgentId === idOrName);
  let m = filtered.find((n) => n.status === "running") ?? filtered[0];
  if (m)
    return {
      status: "found",
      task: m,
    };
  let l = new Map();
  for (let n of Object.values(tasks)) {
    if (!isInProcessTeammateTask(n) || n.identity.agentName !== idOrName) continue;
    let c = l.get(n.identity.agentId);
    if (!c || (c.status !== "running" && n.status === "running")) l.set(n.identity.agentId, n);
  }
  let o = [...l.values()];
  let filtered_2 = o.filter((n) => n.status === "running");
  let u = filtered_2.length > 0 ? filtered_2 : o;
  if (u.length === 1)
    return {
      status: "found",
      task: u[0],
    };
  if (u.length > 1)
    return {
      status: "ambiguous",
      candidates: u.map((n) => n.identity.agentId),
      anyLive: u.some((n) => !isTerminalTaskStatus(n.status)),
    };
  return {
    status: "not_found",
  };
}
//@ chunk-v5mxhgy9.js:3006-3099 layout = findTeammateTaskByAgentId (1)
/**
 * 所有运行中 teammate 的 agentId。
 */
function getRunningTeammateAgentIds(tasks) {
  return getAllInProcessTeammateTasks(tasks)
    .filter((t) => t.status === "running")
    .map((s) => s.identity.agentId);
}
//@ chunk-v5mxhgy9.js:3099-3150 file-local
/**
 * 列出全部 in_process_teammate 任务。
 */
function getAllInProcessTeammateTasks(tasks) {
  return Object.values(tasks).filter(isInProcessTeammateTask);
}
//@ chunk-kxyd0g16.js:19632-19982 file-local
/**
 * 按名字模糊匹配（取最接近的一个）运行中的 teammate 或本地命名代理，返回其 agentId。
 */
function fuzzyResolveAgentByName(name, taskRegistry, getAppState) {
  let s = new Map();
  for (let y of getAllInProcessTeammateTasks(taskRegistry.all())) {
    if (y.status !== "running") continue;
    s.set(slugifySessionName(y.identity.agentName), y.identity.agentId);
  }
  let agentNameRegistry = getAppState?.().agentNameRegistry;
  if (agentNameRegistry)
    for (let [y, k] of agentNameRegistry) {
      let w = taskRegistry.get(k);
      if (w?.type === "local_agent" && (w.status === "running" || isWaitingOnChildren(w)))
        s.set(slugifySessionName(y), y);
    }
  let h = similarNames(name, [...s.keys()], 1)[0];
  return h === undefined ? undefined : s.get(h);
}
//@ chunk-kxyd0g16.js:19982-20267 fingerprint = getRunningTeammatesSorted (0.872)
/**
 * 按规范化名字找 teammate 任务（每个 agentId 一条），有运行中的只返回运行中的。
 */
function getRunningTeammatesSorted(normalizedName, tasks) {
  let n = new Map();
  for (let h of getAllInProcessTeammateTasks(tasks)) {
    if (slugifySessionName(h.identity.agentName) !== normalizedName) continue;
    let y = n.get(h.identity.agentId);
    if (!y || (y.status !== "running" && h.status === "running")) n.set(h.identity.agentId, h);
  }
  let s = [...n.values()];
  let filtered = s.filter((h) => h.status === "running");
  return filtered.length > 0 ? filtered : s;
}
//@ chunk-18hwfzwa.js:729174-729220 fingerprint = requestTeammateShutdown (1)
/**
 * 任务是否在运行（status==="running"）。
 */
function isTaskRunning(task) {
  return task.status === "running";
}
//@ chunk-phrnybk8.js:533-874 fingerprint = injectUserMessageToTeammate (0.809)
/**
 * 向 teammate 注入一条用户消息：追加到 pendingUserMessages 并写入 transcript；任务已结束则丢弃。
 */
function injectUserMessageToTeammate(taskId, text, taskRegistry, origin) {
  let o = taskRegistry.get(taskId);
  if (!o || isTerminalTaskStatus(o.status)) {
    logForDebugging(`Dropping message for teammate task ${taskId}: task status is "${o?.status}"`);
    return;
  }
  let userMessage = createUserMessage({
    content: text,
    origin,
  });
  taskRegistry.update(taskId, (task) => ({
    ...task,
    pendingUserMessages: [
      ...task.pendingUserMessages,
      {
        text,
        origin,
        shownAs: userMessage.uuid,
      },
    ],
  }));
  taskRegistry.updateTranscript(taskId, (r) => ({
    ...r,
    messages: appendBounded(r.messages, userMessage),
  }));
}
export {
  InProcessTeammateTask,
  isTaskRunning,
  getAllInProcessTeammateTasks,
  injectUserMessageToTeammate,
  resolveTeammateTask,
  findTeammateTaskByAgentId,
  TEAMMATE_TEARDOWN_TIMEOUT_MS,
  getRunningTeammatesSorted,
  fuzzyResolveAgentByName,
  getRunningTeammateAgentIds,
};
