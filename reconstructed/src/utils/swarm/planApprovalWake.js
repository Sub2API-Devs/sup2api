/**
 * utils/swarm/planApprovalWake.ts
 *
 * 2.1.316 新增：计划批准唤醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-phrnybk8.js (2)
 * attribution: placement 2
 */
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import {
  injectUserMessageToTeammate,
  findTeammateTaskByAgentId,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { agentAddress } from "./teammateIds.js";

//@ chunk-phrnybk8.js:874-1123 placement
function exitTeammatePlanMode(taskId, taskRegistry) {
  let task = taskRegistry.get(taskId);
  if (!isInProcessTeammateTask(task) || !task.awaitingPlanApproval) return;
  taskRegistry.update(taskId, (task) => ({
    ...task,
    awaitingPlanApproval: false,
    pendingPlanApproval: undefined,
  }));
  injectUserMessageToTeammate(
    taskId,
    "The person moved you out of plan mode. Continue your work.",
    taskRegistry,
    {
      kind: "task-notification",
    },
  );
}
//@ chunk-phrnybk8.js:1123-1209 placement
/**
 * 计划批准后唤醒仍在运行的队友任务。
 */
function wakeTeammateOnPlanApproval(tasks, agentId, teamName) {
  let teammateTaskByAgentId = findTeammateTaskByAgentId(agentAddress(agentId, teamName), tasks);
  if (teammateTaskByAgentId?.status === "running") teammateTaskByAgentId.retryWake?.emit();
}
export { exitTeammatePlanMode, wakeTeammateOnPlanApproval };
