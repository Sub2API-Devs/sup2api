/**
 * utils/swarm/planApprovalResponse.ts
 *
 * 2.1.316 新增：swarm 计划审批响应
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sc94d59g.js (3)
 * attribution: placement 2, sole-consumer 1
 */
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { planVerdictBinding, planVerdictMismatchRejection } from "../teammateMailbox.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { setMemberMode } from "./teamHelpers.js";
import { toExternalPermissionMode, permissionModeFromString } from "../permissions/PermissionMode.js";
import { isBypassPermissionsModeDisabled, isAutoModeGateEnabled } from "../permissions/permissionSetup.js";

//@ chunk-sc94d59g.js:1344-1483 placement
function setAwaitingPlanApproval(taskId, tasks, request) {
  tasks.update(taskId, (task) => ({
    ...task,
    awaitingPlanApproval: request !== null,
    pendingPlanApproval: request
      ? {
          requestId: request.requestId,
          answered: false,
        }
      : undefined,
  }));
}
//@ chunk-sc94d59g.js:1483-2255 placement
/**
 * 处理同进程 teammate 收到的计划审批响应：校验响应与待审批请求是否匹配，不匹配则清除等待状态并返回拒绝结果。
 */
function applyPlanApprovalResponse(taskId, response, tasks, storage) {
  let task = tasks.get(taskId);
  if (!task || !isInProcessTeammateTask(task) || !task.awaitingPlanApproval) return null;
  switch (planVerdictBinding(task.pendingPlanApproval, response)) {
    case "mismatch":
      logForDebugging(
        `[InProcessTeammate] Plan approval response ${jsonStringify(response.requestId)} does not name the pending plan request ${jsonStringify(task.pendingPlanApproval?.requestId)}; resolving the wait as a rejection`,
        {
          level: "warn",
        },
      );
      logFeatureSad("plan_approval", "request_binding_mismatch");
      setAwaitingPlanApproval(taskId, tasks, null);
      return planVerdictMismatchRejection(response);
    case "unbound":
      logFeatureSad("plan_approval", "verdict_unbound");
      break;
    case "bound":
      logFeatureOk("plan_approval");
      break;
    case "already_answered":
      return null;
  }
  if (!response.approved) {
    setAwaitingPlanApproval(taskId, tasks, null);
    return response;
  }
  let mode = resolveAvailablePermissionMode(response.permissionMode);
  tasks.update(taskId, (task) => ({
    ...task,
    awaitingPlanApproval: false,
    pendingPlanApproval: undefined,
    permissionMode: mode,
    planHeldAfterSpawn: false,
  }));
  setMemberMode(task.identity.teamName, task.identity.agentName, mode, storage);
  return response;
}
//@ chunk-sc94d59g.js:2255-2391 sole-consumer (2.1.88 match: startSpeculativeClassifierCheck, 1)
/**
 * 把当前权限模式规整为分类器使用的模式（bypassPermissions 被禁用或 auto 不可用时回落为 default）。
 */
function resolveAvailablePermissionMode(permissionMode) {
  let allowDescriptions = toExternalPermissionMode(permissionModeFromString(permissionMode ?? "default"));
  if (allowDescriptions === "bypassPermissions" && isBypassPermissionsModeDisabled()) return "default";
  if (allowDescriptions === "auto" && !isAutoModeGateEnabled()) return "default";
  return allowDescriptions;
}
export { applyPlanApprovalResponse, setAwaitingPlanApproval };
