/**
 * tools/ExitPlanModeTool/planPreconditions.ts
 *
 * 2.1.316 新增：退出计划模式前置条件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sc94d59g.js (5)
 * attribution: placement 5
 */
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import { AGENT } from "../AgentTool/constants.js";

//@ chunk-sc94d59g.js:2391-2581 placement
/**
 * 计划获批后给队友的权限模式：可恢复的进程内队友沿用领导模式，否则按主动性循环；plan 换成 default。
 */
function teammateModeAfterPlan({
  recipientName,
  leaderMode,
  leaderAutoPickedByLevel,
  proactivityLevel,
  tasks,
}) {
  let nextLeaderMode = Object.values(tasks).some((task) => isResumableTeammate(task, recipientName))
    ? leaderMode
    : cycleAllTeammateModes(leaderMode, proactivityLevel, leaderAutoPickedByLevel);
  let externalPermissionMode = toExternalPermissionMode(nextLeaderMode);
  return externalPermissionMode === "plan" ? "default" : externalPermissionMode;
}
//@ chunk-sc94d59g.js:2581-2740 placement
/**
 * 判断指定名字的进程内队友是否正在运行且要求计划模式（尚未在派生后持有计划）。
 */
function isTeammateAwaitingPlan(from, tasks) {
  return Object.values(tasks).some(
    (task) =>
      isInProcessTeammateTask(task) &&
      task.status === "running" &&
      task.identity.agentName === from &&
      task.identity.planModeRequired &&
      !task.planHeldAfterSpawn,
  );
}
//@ chunk-sc94d59g.js:2740-2880 placement
/**
 * 判断任务是否为正在运行、指定名字、未拆除面板且可恢复的进程内队友。
 */
function isResumableTeammate(task, agentName) {
  return (
    isInProcessTeammateTask(task) &&
    task.status === "running" &&
    task.identity.agentName === agentName &&
    task.paneTeardown === undefined &&
    task.identity.resumableAgentId !== undefined
  );
}
//@ chunk-sc94d59g.js:2880-2961 placement
class PlanPreconditionError extends Error {
  constructor(message) {
    super(message);
    this.name = "PlanPreconditionError";
  }
}
//@ chunk-sc94d59g.js:2961-3182 placement
/**
 * 计划提示的附加句：建议把可并行的任务交给命名队友（仅默认子代理引导时）。
 */
function teammateSpawnPlanHint(steer) {
  if (!steer || getSubagentSteer() !== "default") return "";
  return `

If this plan can be broken down into multiple independent tasks, consider spawning named teammates with the ${AGENT} tool (pass a \`name\`) to parallelize the work.`;
}
export {
  teammateModeAfterPlan,
  teammateSpawnPlanHint,
  isTeammateAwaitingPlan,
  PlanPreconditionError,
  isResumableTeammate,
};
