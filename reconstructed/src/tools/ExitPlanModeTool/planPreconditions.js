/**
 * tools/ExitPlanModeTool/planPreconditions.ts
 *
 * 2.1.316 新增：退出计划模式前置条件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fnhsh6ng.js (5)
 * attribution: placement 5
 */
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import { AGENT } from "../AgentTool/constants.js";

/**
 * 计划获批后给队友的权限模式：可恢复的进程内队友沿用领导模式，否则按主动性循环；plan 换成 default。
 */
//@ chunk-fnhsh6ng.js:2231-2420 placement
function teammateModeAfterPlan({
  recipientName: recipientName,
  leaderMode: leaderMode,
  leaderAutoPickedByLevel: leaderAutoPickedByLevel,
  proactivityLevel: proactivityLevel,
  tasks: tasks,
}) {
  let d = Object.values(tasks).some((m) => isResumableTeammate(m, recipientName))
      ? leaderMode
      : cycleAllTeammateModes(leaderMode, proactivityLevel, leaderAutoPickedByLevel),
    h = toExternalPermissionMode(d);
  return h === "plan" ? "default" : h;
}
/**
 * 判断指定名字的进程内队友是否正在运行且要求计划模式（尚未在派生后持有计划）。
 */
//@ chunk-fnhsh6ng.js:2420-2579 placement
function isTeammateAwaitingPlan(r, e) {
  return Object.values(e).some(
    (n) =>
      isInProcessTeammateTask(n) &&
      n.status === "running" &&
      n.identity.agentName === r &&
      n.identity.planModeRequired &&
      !n.planHeldAfterSpawn,
  );
}
/**
 * 判断任务是否为正在运行、指定名字、未拆除面板且可恢复的进程内队友。
 */
//@ chunk-fnhsh6ng.js:2579-2719 placement
function isResumableTeammate(r, e) {
  return (
    isInProcessTeammateTask(r) &&
    r.status === "running" &&
    r.identity.agentName === e &&
    r.paneTeardown === void 0 &&
    r.identity.resumableAgentId !== void 0
  );
}
//@ chunk-fnhsh6ng.js:2719-2800 placement
class PlanPreconditionError extends Error {
  constructor(r) {
    super(r);
    this.name = "PlanPreconditionError";
  }
}
/**
 * 计划提示的附加句：建议把可并行的任务交给命名队友（仅默认子代理引导时）。
 */
//@ chunk-fnhsh6ng.js:2800-3021 placement
function teammateSpawnPlanHint(r) {
  if (!r || getSubagentSteer() !== "default") return "";
  return `

If this plan can be broken down into multiple independent tasks, consider spawning named teammates with the ${AGENT} tool (pass a \`name\`) to parallelize the work.`;
}

export {
  teammateSpawnPlanHint,
  teammateModeAfterPlan,
  isTeammateAwaitingPlan,
  PlanPreconditionError,
  isResumableTeammate,
};
