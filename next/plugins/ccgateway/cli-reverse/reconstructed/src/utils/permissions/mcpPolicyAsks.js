/**
 * utils/permissions/mcpPolicyAsks.ts
 *
 * MCP server 策略的 ask 规则：构造 mcpServerPolicy 决策原因、记录文件级 ask 工具，并计算 acceptEdits 下可放行的集合（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gg17c06d.js (9)
 * attribution: placement 9
 */
import { env } from "../env.js";
import { getMcpPrefix as getMcpPrefix_2, mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { getAllowRules } from "./permissions.js";
import { permissionRuleValueFromString } from "../sandbox/sandbox-adapter.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gg17c06d.js:7524-7622 placement
/**
 * “Claude 请求使用某工具但尚未授权”的文案。
 */
function unGrantedNotice(toolName) {
  return `Claude requested permissions to use ${toolName}, but you haven't granted it yet.`;
}
//@ chunk-gg17c06d.js:7622-7665 placement
var EMPTY_NAME_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
var weakMap_2;
deferInit("chunk-gg17c06d.js:7622", () => {
  EMPTY_NAME_SET = new Set();
  weakMap = new WeakMap();
  weakMap_2 = new WeakMap();
});
//@ chunk-gg17c06d.js:7665-7694 placement
/**
 * 记录文件级 ask 规则对应的工具名。
 */
function registerCheckName(tool, toolNameForPermissionCheck) {
  weakMap_2.set(tool, toolNameForPermissionCheck);
}
//@ chunk-gg17c06d.js:7694-7785 placement
/**
 * 构造 mcpServerPolicy 类型的 ask 决策原因。
 */
function mcpPolicyAskRule(toolName) {
  return {
    source: "mcpServerPolicy",
    ruleBehavior: "ask",
    ruleValue: {
      toolName,
    },
  };
}
//@ chunk-gg17c06d.js:7785-7887 placement
/**
 * 构造 MCP 策略 ask 的完整决策（文案加原因）。
 */
function makeAskDecision(tool, checkName) {
  return {
    behavior: "ask",
    message: unGrantedNotice(tool.name),
    decisionReason: {
      type: "rule",
      rule: mcpPolicyAskRule(checkName),
    },
  };
}
//@ chunk-gg17c06d.js:7887-8214 placement
/**
 * 计算 acceptEdits 下可放行的 MCP 策略 ask 集合，按入参缓存；permissions 使用。
 */
function liftedAsksInAcceptEdits(context, tool) {
  let mcpPolicyAsksLiftedInAcceptEdits = context.mcpPolicyAsksLiftedInAcceptEdits;
  let ownName = liftedNameForTool(context, tool);
  if (
    (mcpPolicyAsksLiftedInAcceptEdits === undefined && ownName === undefined) ||
    context.mode !== "acceptEdits" ||
    (context.modeBeforeRewrite ?? "acceptEdits") !== "acceptEdits" ||
    env.CLAUDE_CODE_EVAL_CONFINED
  )
    return EMPTY_NAME_SET;
  let lifted = weakMap.get(context);
  if (lifted === undefined) {
    lifted = liftedNamesFromContext(context, new Set(mcpPolicyAsksLiftedInAcceptEdits));
    weakMap.set(context, lifted);
  }
  return ownName === undefined
    ? lifted
    : new Set([...lifted, ...liftedNamesFromContext(context, new Set([ownName]))]);
}
//@ chunk-gg17c06d.js:8214-8329 placement
function liftedNameForTool(context, tool) {
  let name = tool && weakMap_2.get(tool);
  return name !== undefined && context.mcpPolicyFileAsksLiftedInAcceptEdits?.includes(name)
    ? name
    : undefined;
}
//@ chunk-gg17c06d.js:8329-8530 placement
function liftedNamesFromContext(context, names) {
  let mapped = Object.keys(context.mcpPermissionModeOverrides).map(getMcpPrefix_2);
  return new Set(
    context.alwaysAskRules.mcpServerPolicy?.filter(
      (ruleName) =>
        names.has(ruleName) &&
        mcpInfoFromString(ruleName)?.toolName !== undefined &&
        !mapped.some((prefix) => ruleName.startsWith(prefix)),
    ),
  );
}
//@ chunk-gg17c06d.js:21978-22060 placement
/**
 * 在已记录的 ask 规则里按工具名查找 mcpServerPolicy 项。
 */
function findAllowRuleForTool(toolPermissionContext, name) {
  return (
    getAllowRules(toolPermissionContext).find(
      ({ ruleValue }) => ruleValue.toolName === name && permissionRuleValueFromString(ruleValue),
    ) ?? null
  );
}
export {
  liftedAsksInAcceptEdits,
  unGrantedNotice,
  findAllowRuleForTool,
  makeAskDecision,
  mcpPolicyAskRule,
  registerCheckName,
};
