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

/**
 * 决策原因是否全部来自规则（子命令结果需每项都是规则原因）。
 */
//@ chunk-e6aww6q8.js:920454-920605 placement
function isAllRuleReason(e) {
  if (e?.type === "rule") return !0;
  if (e?.type === "subcommandResults")
    return [...e.reasons.values()].every((n) => isAllRuleReason(n.decisionReason));
  return !1;
}
/**
 * 权限决定原因转换为给宿主显示的文本（rule/mode 等不显示，safetyCheck/classifier/hook 显示原因）。
 */
//@ chunk-e6aww6q8.js:920729-921111 placement = serializeDecisionReason (0.967)
function serializeDecisionReason(reason) {
  if (!reason) return;
  switch (reason.type) {
    case "rule":
    case "mode":
    case "subcommandResults":
    case "permissionPromptTool":
      return;
    case "safetyCheck":
      return isCircuitBreakerSafetyCheck(reason) ? void 0 : reason.reason;
    case "classifier":
    case "hook":
    case "asyncAgent":
    case "workingDir":
      return reason.reason;
    case "sandboxOverride":
      return reason.replaces === void 0 ? reason.reason : void 0;
    case "other":
      return reason.reason === SERVER_HOLDS_SHELL_ALLOW_REASON ||
        reason.reason === TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON
        ? void 0
        : reason.reason;
  }
}
/**
 * 安全检查是否由熔断原因触发（outsideReadsBlocked/unfinishedCheck）。
 */
//@ chunk-e6aww6q8.js:921111-921230 placement
function isCircuitBreakerSafetyCheck({ circuitBreaker: circuitBreaker, also: also }) {
  return [circuitBreaker, ...(also ?? [])].some(
    (r) => r === "outsideReadsBlocked" || r === "unfinishedCheck",
  );
}

export { isAllRuleReason, serializeDecisionReason, isCircuitBreakerSafetyCheck };
