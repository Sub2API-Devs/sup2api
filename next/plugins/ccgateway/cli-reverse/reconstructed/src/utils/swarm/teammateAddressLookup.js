/**
 * utils/swarm/teammateAddressLookup.ts
 *
 * 2.1.316 新增：解析队友地址（任务、名字匹配）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (5)
 * attribution: placement 5
 */
import { taskImplDispatch } from "../../tasks/MonitorMcpTask/MonitorMcpTask.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import {
  resolveTeammateTask,
  getRunningTeammatesSorted,
  fuzzyResolveAgentByName,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { getSelectableBackgroundTasks } from "../../tasks/stopTask.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { singleLineText } from "../printableName.js";

//@ chunk-kxyd0g16.js:18315-18351 placement
/**
 * 按地址查任务（停止任务用）。
 */
function lookupTaskForStop(type) {
  return taskImplDispatch.lookup(type);
}
//@ chunk-kxyd0g16.js:18351-18393 placement
function isLiveOrWaitingTask(task) {
  return !isTerminalTaskStatus(task.status) || isWaitingOnChildren(task);
}
//@ chunk-kxyd0g16.js:18393-19289 placement
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
//@ chunk-kxyd0g16.js:19289-19418 placement
function ambiguousTeammateMessage(input, names) {
  return `Multiple teammates match "${singleLineText(input)}": ${names.map((name) => singleLineText(name)).join(", ")}. Use the full address (name@team).`;
}
//@ chunk-kxyd0g16.js:19418-19632 placement
function teammateOrAgentAmbiguousMessage(input, names, id) {
  return `"${singleLineText(input)}" matches both teammate ${names.map((name) => singleLineText(name)).join(", ")} and background agent ${singleLineText(id)}. Use the full address (name@team) for the teammate or the task ID for the background agent.`;
}
export { resolveTeammateAddress, lookupTaskForStop };
