/**
 * utils/permissions/decisionReasons.ts
 *
 * 2.1.316 新增：决策原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import {
  SERVER_HOLDS_SHELL_ALLOW_REASON,
  TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON,
} from "../../types/permissions.js";

//@ chunk-e6aww6q8.js:920454-920605 placement
/**
 * 决策原因是否全部来自规则（子命令结果需每项都是规则原因）。
 */
function isAllRuleReason(decisionReason) {
  if (decisionReason?.type === "rule") return true;
  if (decisionReason?.type === "subcommandResults")
    return [...decisionReason.reasons.values()].every((reason) => isAllRuleReason(reason.decisionReason));
  return false;
}
//@ chunk-e6aww6q8.js:920729-921111 placement (2.1.88 match: serializeDecisionReason, 0.967)
/**
 * 权限决定原因转换为给宿主显示的文本（rule/mode 等不显示，safetyCheck/classifier/hook 显示原因）。
 */
function serializeDecisionReason(reason) {
  if (!reason) return;
  switch (reason.type) {
    case "rule":
    case "mode":
    case "subcommandResults":
    case "permissionPromptTool":
      return;
    case "safetyCheck":
      return isCircuitBreakerSafetyCheck(reason) ? undefined : reason.reason;
    case "classifier":
    case "hook":
    case "asyncAgent":
    case "workingDir":
      return reason.reason;
    case "sandboxOverride":
      return reason.replaces === undefined ? reason.reason : undefined;
    case "other":
      return reason.reason === SERVER_HOLDS_SHELL_ALLOW_REASON ||
        reason.reason === TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON
        ? undefined
        : reason.reason;
  }
}
//@ chunk-e6aww6q8.js:921111-921230 placement
/**
 * 安全检查是否由熔断原因触发（outsideReadsBlocked/unfinishedCheck）。
 */
function isCircuitBreakerSafetyCheck({ circuitBreaker, also }) {
  return [circuitBreaker, ...(also ?? [])].some(
    (reason) => reason === "outsideReadsBlocked" || reason === "unfinishedCheck",
  );
}
export { isAllRuleReason, serializeDecisionReason, isCircuitBreakerSafetyCheck };
