/**
 * utils/swarm/planApprovalWake.ts
 *
 * 2.1.316 新增：计划批准唤醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2dv3kn8z.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import {
  injectUserMessageToTeammate,
  findTeammateTaskByAgentId,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { agentAddress } from "./teammateIds.js";

//@ chunk-2dv3kn8z.js:874-1123 placement
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
//@ chunk-2dv3kn8z.js:1123-1209 placement
/**
 * 计划批准后唤醒仍在运行的队友任务。
 */
function wakeTeammateOnPlanApproval(tasks, agentId, teamName) {
  let teammateTaskByAgentId = findTeammateTaskByAgentId(agentAddress(agentId, teamName), tasks);
  if (teammateTaskByAgentId?.status === "running") teammateTaskByAgentId.retryWake?.emit();
}
export { wakeTeammateOnPlanApproval, exitTeammatePlanMode };
