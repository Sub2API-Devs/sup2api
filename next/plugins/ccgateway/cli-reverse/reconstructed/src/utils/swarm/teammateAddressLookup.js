/**
 * utils/swarm/teammateAddressLookup.ts
 *
 * 2.1.316 新增：解析队友地址（任务、名字匹配）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (6)
 * attribution: placement 5, sole-consumer 1
 */
import { codeModeAccepted } from "../codeMode/accepted.js";
import { taskImplDispatch } from "../../tasks/MonitorMcpTask/MonitorMcpTask.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import {
  resolveTeammateTask,
  getRunningTeammatesSorted,
  getAllInProcessTeammateTasks,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { getSelectableBackgroundTasks } from "../../tasks/stopTask.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { singleLineText } from "../printableName.js";
import { similarNames } from "../settings/managedEnvKeys.js";

//@ chunk-fmnbrxwy.js:32158-32271 placement
/**
 * 按地址查任务（停止任务用）。
 */
function lookupTaskForStop(type) {
  if (codeModeAccepted() && type === "local_script")
    return require("../../tasks/localScriptTask.js").ScriptTask;
  return taskImplDispatch.lookup(type);
}
//@ chunk-fmnbrxwy.js:32271-32313 placement
function isLiveOrWaitingTask(task) {
  return !isTerminalTaskStatus(task.status) || isWaitingOnChildren(task);
}
//@ chunk-fmnbrxwy.js:32313-33209 placement
/**
 * 解析队友地址（任务、名字匹配）。
 */
function resolveTeammateAddress(idOrName, taskRegistry, getAppState) {
  let tasks = taskRegistry.all();
  let teammateTask = resolveTeammateTask(idOrName, tasks);
  let task = getSelectableBackgroundTasks((id) => id === idOrName, taskRegistry, getAppState);
  if (teammateTask.status !== "not_found" && task) {
    let candidateIds =
      teammateTask.status === "found" ? [teammateTask.task.identity.agentId] : teammateTask.candidates;
    let anyLive =
      teammateTask.status === "found" ? isLiveOrWaitingTask(teammateTask.task) : teammateTask.anyLive;
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(idOrName, candidateIds, task.id),
      anyLiveCandidate: anyLive || isLiveOrWaitingTask(task),
    };
  }
  if (teammateTask.status === "ambiguous")
    return {
      status: "ambiguous",
      message: ambiguousTeammateMessage(idOrName, teammateTask.candidates),
      anyLiveCandidate: teammateTask.anyLive,
    };
  if (teammateTask.status === "found")
    return {
      status: "found",
      task: teammateTask.task,
    };
  if (task)
    return {
      status: "found",
      task,
    };
  let slug = slugifySessionName(idOrName);
  let runningTeammatesSorted = getRunningTeammatesSorted(slug, tasks);
  let task_2 = getSelectableBackgroundTasks(
    (name) => slugifySessionName(name) === slug,
    taskRegistry,
    getAppState,
  );
  if (runningTeammatesSorted.length > 0 && task_2)
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(
        idOrName,
        runningTeammatesSorted.map((task) => task.identity.agentId),
        task_2.id,
      ),
      anyLiveCandidate: runningTeammatesSorted.some(isLiveOrWaitingTask) || isLiveOrWaitingTask(task_2),
    };
  if (runningTeammatesSorted.length > 1)
    return {
      status: "ambiguous",
      message: ambiguousTeammateMessage(
        idOrName,
        runningTeammatesSorted.map((task) => task.identity.agentId),
      ),
      anyLiveCandidate: runningTeammatesSorted.some(isLiveOrWaitingTask),
    };
  if (runningTeammatesSorted.length === 1)
    return {
      status: "found",
      task: runningTeammatesSorted[0],
    };
  if (task_2)
    return {
      status: "found",
      task: task_2,
    };
  return {
    status: "not_found",
    suggestion: fuzzyResolveAgentByName(slug, taskRegistry, getAppState),
  };
}
//@ chunk-fmnbrxwy.js:33209-33338 placement
function ambiguousTeammateMessage(input, names) {
  return `Multiple teammates match "${singleLineText(input)}": ${names.map((name) => singleLineText(name)).join(", ")}. Use the full address (name@team).`;
}
//@ chunk-fmnbrxwy.js:33338-33552 placement
function teammateOrAgentAmbiguousMessage(input, names, id) {
  return `"${singleLineText(input)}" matches both teammate ${names.map((name) => singleLineText(name)).join(", ")} and background agent ${singleLineText(id)}. Use the full address (name@team) for the teammate or the task ID for the background agent.`;
}
//@ chunk-fmnbrxwy.js:33552-33903 sole-consumer
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
export { lookupTaskForStop, resolveTeammateAddress };
