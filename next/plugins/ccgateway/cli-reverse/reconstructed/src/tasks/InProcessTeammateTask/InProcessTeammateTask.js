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
import { logForDebugging } from "../../utils/debug.js";
import { createUserMessage } from "../../utils/messages.js";
import { appendBounded } from "../taskKinds.js";
import { slugifySessionName } from "../../utils/sessionAddresses.js";
import { isWaitingOnChildren } from "../LocalAgentTask/keepalive.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";

//@ chunk-v5mxhgy9.js:554-721 fingerprint (2.1.88 match: InProcessTeammateTask, 0.789)
/**
 * InProcessTeammateTask 任务实现：kill 时调用 killInProcessTeammate，等待移出团队与 OS 侧拆除完成；k 为 10 秒超时常量。
 */
var InProcessTeammateTask = {
  name: "InProcessTeammateTask",
  type: "in_process_teammate",
  async kill(taskId, setAppState, setAppState_2, storageV5, storage) {
    let { memberRemoval, osTeardown } = killInProcessTeammate(taskId, setAppState, setAppState_2, storage);
    await Promise.all([memberRemoval, osTeardown]);
  },
};
var TEAMMATE_TEARDOWN_TIMEOUT_MS = 1e4;
//@ chunk-v5mxhgy9.js:2171-2311 fingerprint (2.1.88 match: findTeammateTaskByAgentId, 1)
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
    .filter((task) => task.identity.resumableAgentId === idOrName);
  let resumableMatch = filtered.find((task) => task.status === "running") ?? filtered[0];
  if (resumableMatch)
    return {
      status: "found",
      task: resumableMatch,
    };
  let byAgentId = new Map();
  for (let task of Object.values(tasks)) {
    if (!isInProcessTeammateTask(task) || task.identity.agentName !== idOrName) continue;
    let existing = byAgentId.get(task.identity.agentId);
    if (!existing || (existing.status !== "running" && task.status === "running"))
      byAgentId.set(task.identity.agentId, task);
  }
  let named = [...byAgentId.values()];
  let filtered_2 = named.filter((task) => task.status === "running");
  let matches = filtered_2.length > 0 ? filtered_2 : named;
  if (matches.length === 1)
    return {
      status: "found",
      task: matches[0],
    };
  if (matches.length > 1)
    return {
      status: "ambiguous",
      candidates: matches.map((task) => task.identity.agentId),
      anyLive: matches.some((task) => !isTerminalTaskStatus(task.status)),
    };
  return {
    status: "not_found",
  };
}
//@ chunk-v5mxhgy9.js:3006-3099 layout (2.1.88 match: findTeammateTaskByAgentId, 1)
/**
 * 所有运行中 teammate 的 agentId。
 */
function getRunningTeammateAgentIds(tasks) {
  return getAllInProcessTeammateTasks(tasks)
    .filter((t) => t.status === "running")
    .map((task) => task.identity.agentId);
}
//@ chunk-v5mxhgy9.js:3099-3150 file-local
/**
 * 列出全部 in_process_teammate 任务。
 */
function getAllInProcessTeammateTasks(tasks) {
  return Object.values(tasks).filter(isInProcessTeammateTask);
}
//@ chunk-phrnybk8.js:533-874 fingerprint (2.1.88 match: injectUserMessageToTeammate, 0.809)
/**
 * 向 teammate 注入一条用户消息：追加到 pendingUserMessages 并写入 transcript；任务已结束则丢弃。
 */
function injectUserMessageToTeammate(taskId, text, taskRegistry, origin) {
  let task = taskRegistry.get(taskId);
  if (!task || isTerminalTaskStatus(task.status)) {
    logForDebugging(`Dropping message for teammate task ${taskId}: task status is "${task?.status}"`);
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
  taskRegistry.updateTranscript(taskId, (transcript) => ({
    ...transcript,
    messages: appendBounded(transcript.messages, userMessage),
  }));
}
//@ chunk-kxyd0g16.js:19632-19982 file-local
/**
 * 按名字模糊匹配（取最接近的一个）运行中的 teammate 或本地命名代理，返回其 agentId。
 */
function fuzzyResolveAgentByName(name, taskRegistry, getAppState) {
  let bySlug = new Map();
  for (let task of getAllInProcessTeammateTasks(taskRegistry.all())) {
    if (task.status !== "running") continue;
    bySlug.set(slugifySessionName(task.identity.agentName), task.identity.agentId);
  }
  let agentNameRegistry = getAppState?.().agentNameRegistry;
  if (agentNameRegistry)
    for (let [registeredName, taskId] of agentNameRegistry) {
      let task = taskRegistry.get(taskId);
      if (task?.type === "local_agent" && (task.status === "running" || isWaitingOnChildren(task)))
        bySlug.set(slugifySessionName(registeredName), registeredName);
    }
  let matchedName = similarNames(name, [...bySlug.keys()], 1)[0];
  return matchedName === undefined ? undefined : bySlug.get(matchedName);
}
//@ chunk-kxyd0g16.js:19982-20267 fingerprint (2.1.88 match: getRunningTeammatesSorted, 0.872)
/**
 * 按规范化名字找 teammate 任务（每个 agentId 一条），有运行中的只返回运行中的。
 */
function getRunningTeammatesSorted(normalizedName, tasks) {
  let byAgentId = new Map();
  for (let task of getAllInProcessTeammateTasks(tasks)) {
    if (slugifySessionName(task.identity.agentName) !== normalizedName) continue;
    let existing = byAgentId.get(task.identity.agentId);
    if (!existing || (existing.status !== "running" && task.status === "running"))
      byAgentId.set(task.identity.agentId, task);
  }
  let all = [...byAgentId.values()];
  let filtered = all.filter((task) => task.status === "running");
  return filtered.length > 0 ? filtered : all;
}
//@ chunk-18hwfzwa.js:729174-729220 fingerprint (2.1.88 match: requestTeammateShutdown, 1)
/**
 * 任务是否在运行（status==="running"）。
 */
function isTaskRunning(task) {
  return task.status === "running";
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
