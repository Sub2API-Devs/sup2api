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
function isLiveOrWaitingTask(e) {
  return !isTerminalTaskStatus(e.status) || isWaitingOnChildren(e);
}
//@ chunk-kxyd0g16.js:18393-19289 placement
/**
 * 解析队友地址（任务、名字匹配）。
 */
function resolveTeammateAddress(idOrName, taskRegistry, getAppState) {
  let tasks = taskRegistry.all();
  let teammateTask = resolveTeammateTask(idOrName, tasks);
  let selectableBackgroundTasks = getSelectableBackgroundTasks(
    (S) => S === idOrName,
    taskRegistry,
    getAppState,
  );
  if (teammateTask.status !== "not_found" && selectableBackgroundTasks) {
    let S = teammateTask.status === "found" ? [teammateTask.task.identity.agentId] : teammateTask.candidates;
    let R = teammateTask.status === "found" ? isLiveOrWaitingTask(teammateTask.task) : teammateTask.anyLive;
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(idOrName, S, selectableBackgroundTasks.id),
      anyLiveCandidate: R || isLiveOrWaitingTask(selectableBackgroundTasks),
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
  if (selectableBackgroundTasks)
    return {
      status: "found",
      task: selectableBackgroundTasks,
    };
  let y = slugifySessionName(idOrName);
  let runningTeammatesSorted = getRunningTeammatesSorted(y, tasks);
  let selectableBackgroundTasks_2 = getSelectableBackgroundTasks(
    (S) => slugifySessionName(S) === y,
    taskRegistry,
    getAppState,
  );
  if (runningTeammatesSorted.length > 0 && selectableBackgroundTasks_2)
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(
        idOrName,
        runningTeammatesSorted.map((S) => S.identity.agentId),
        selectableBackgroundTasks_2.id,
      ),
      anyLiveCandidate:
        runningTeammatesSorted.some(isLiveOrWaitingTask) || isLiveOrWaitingTask(selectableBackgroundTasks_2),
    };
  if (runningTeammatesSorted.length > 1)
    return {
      status: "ambiguous",
      message: ambiguousTeammateMessage(
        idOrName,
        runningTeammatesSorted.map((S) => S.identity.agentId),
      ),
      anyLiveCandidate: runningTeammatesSorted.some(isLiveOrWaitingTask),
    };
  if (runningTeammatesSorted.length === 1)
    return {
      status: "found",
      task: runningTeammatesSorted[0],
    };
  if (selectableBackgroundTasks_2)
    return {
      status: "found",
      task: selectableBackgroundTasks_2,
    };
  return {
    status: "not_found",
    suggestion: fuzzyResolveAgentByName(y, taskRegistry, getAppState),
  };
}
//@ chunk-kxyd0g16.js:19289-19418 placement
function ambiguousTeammateMessage(e, r) {
  return `Multiple teammates match "${singleLineText(e)}": ${r.map((n) => singleLineText(n)).join(", ")}. Use the full address (name@team).`;
}
//@ chunk-kxyd0g16.js:19418-19632 placement
function teammateOrAgentAmbiguousMessage(e, r, id) {
  return `"${singleLineText(e)}" matches both teammate ${r.map((s) => singleLineText(s)).join(", ")} and background agent ${singleLineText(id)}. Use the full address (name@team) for the teammate or the task ID for the background agent.`;
}
export { resolveTeammateAddress, lookupTaskForStop };
