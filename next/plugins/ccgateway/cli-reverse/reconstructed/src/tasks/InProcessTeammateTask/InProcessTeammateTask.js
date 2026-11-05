/**
 * tasks/InProcessTeammateTask/InProcessTeammateTask.tsx
 *
 * 同进程 teammate 任务（in_process_teammate）：任务实现、按 agentId/名字查找、注入用户消息、运行中 teammate 列表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx
 * pieces: chunk-2dv3kn8z.js (1), chunk-94s4dsgm.js (5), chunk-fmnbrxwy.js (1)
 * attribution: fingerprint 4, placement 3
 */
import { killInProcessTeammate } from "../../utils/swarm/spawnInProcess.js";
import { isInProcessTeammateTask } from "./types.js";
import { isTerminalTaskStatus } from "../taskStatus.js";
import { logForDebugging } from "../../utils/debug.js";
import { createUserMessage } from "../../utils/messages.js";
import { appendBounded } from "../taskKinds.js";
import { slugifySessionName } from "../../utils/sessionAddresses.js";

//@ chunk-94s4dsgm.js:554-721 fingerprint (2.1.88 match: InProcessTeammateTask, 0.789)
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
//@ chunk-94s4dsgm.js:2171-2311 fingerprint (2.1.88 match: findTeammateTaskByAgentId, 1)
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
//@ chunk-94s4dsgm.js:2311-3006 placement
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
//@ chunk-94s4dsgm.js:3006-3099 placement (2.1.88 match: findTeammateTaskByAgentId, 1)
/**
 * 所有运行中 teammate 的 agentId。
 */
function getRunningTeammateAgentIds(tasks) {
  return getAllInProcessTeammateTasks(tasks)
    .filter((t) => t.status === "running")
    .map((task) => task.identity.agentId);
}
//@ chunk-94s4dsgm.js:3099-3150 placement
/**
 * 列出全部 in_process_teammate 任务。
 */
function getAllInProcessTeammateTasks(tasks) {
  return Object.values(tasks).filter(isInProcessTeammateTask);
}
//@ chunk-2dv3kn8z.js:533-874 fingerprint (2.1.88 match: injectUserMessageToTeammate, 0.809)
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
//@ chunk-fmnbrxwy.js:33903-34188 fingerprint (2.1.88 match: getRunningTeammatesSorted, 0.872)
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
export {
  findTeammateTaskByAgentId,
  injectUserMessageToTeammate,
  resolveTeammateTask,
  TEAMMATE_TEARDOWN_TIMEOUT_MS,
  InProcessTeammateTask,
  getAllInProcessTeammateTasks,
  getRunningTeammatesSorted,
  getRunningTeammateAgentIds,
};
