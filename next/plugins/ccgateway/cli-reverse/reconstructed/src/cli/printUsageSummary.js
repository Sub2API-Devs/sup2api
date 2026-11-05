/**
 * cli/printUsageSummary.ts
 *
 * 2.1.316 新增：print 模式结束时的用量/费用摘要输出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 */
import { WEB_HUMAN } from "../services/projectsRelay/relayConfig.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_4 } from "../services/mcp/mcpStringUtils.js";
import { mcpRuleMatchesToolAny } from "../services/mcp/serverIdentity.js";

//@ chunk-5xgkngpb.js:3345579-3345648 placement
/**
 * 判断单个工具名是否算作"本回合被禁用"：空/网页等特例排除，其余按名字判断。
 */
function isTurnDisallowedToolName(inboundOrigin) {
  return (
    inboundOrigin !== undefined &&
    inboundOrigin !== "" &&
    inboundOrigin !== WEB_HUMAN &&
    inboundOrigin !== "api_direct"
  );
}
//@ chunk-5xgkngpb.js:3345648-3345969 placement
/**
 * 筛选回合级禁用工具名：已在禁用列表或总被允许的保留；对匹配到的工具按 costOf（free/costly）判断，MCP 类名字（含 "__"）没有匹配工具时按规则处理。
 */
function filterTurnDisallowedTools(names, turnDisallowed, getTools, isAlwaysAllowed, costOf) {
  return names.filter((name) => {
    if (turnDisallowed.includes(name) || isAlwaysAllowed(name)) return true;
    let tools = getTools();
    let filtered = tools.filter((tool) => turnDisallowRuleMatchesTool(name, tool));
    if (filtered.length === 0)
      return (
        isToolDisallowedThisTurn(
          {
            turnDisallowedTools: turnDisallowed,
          },
          {
            name,
          },
        ) || !name.includes("__", 5)
      );
    let any = filtered.some((tool) => name === getToolNameForPermissionCheck_4(tool));
    return filtered.every((tool) => {
      if (isAlwaysAllowed(tool.name)) return true;
      let cost = costOf(tool, tools);
      return cost === "free" || (cost === "costly" && !any);
    });
  });
}
//@ chunk-5xgkngpb.js:3345969-3346014 placement
function turnDisallowRuleMatchesTool(rule, toolName) {
  return rule === getToolNameForPermissionCheck_4(toolName) || mcpRuleMatchesToolAny(rule, toolName);
}
//@ chunk-5xgkngpb.js:3346014-3346086 placement
/**
 * 判断某工具是否被本回合禁用（turnDisallowedTools 里任一规则命中）。
 */
function isToolDisallowedThisTurn(toolName, disallowed) {
  return (
    toolName.turnDisallowedTools?.some((turnDisallowedTool) =>
      turnDisallowRuleMatchesTool(turnDisallowedTool, disallowed),
    ) ?? false
  );
}
//@ chunk-5xgkngpb.js:3346086-3346400 placement
/**
 * 把回合级禁用工具写进 AppState：替换 turnDisallowedTools，并在 alwaysDenyRules.command 里去掉旧的、加上新的；未变化时不更新。
 */
function applyTurnDisallowedTools(setAppState, toolNames) {
  setAppState((state) => {
    let turnDisallowedTools = state.turnDisallowedTools ?? [];
    if (
      turnDisallowedTools.length === toolNames.length &&
      turnDisallowedTools.every((turnDisallowedTool, index) => turnDisallowedTool === toolNames[index])
    )
      return state;
    let remaining = [
      ...(state.alwaysDenyRules.command ?? []).filter((toolName) => !turnDisallowedTools.includes(toolName)),
      ...toolNames,
    ];
    return {
      ...state,
      turnDisallowedTools: toolNames.length > 0 ? toolNames : undefined,
      alwaysDenyRules: {
        ...state.alwaysDenyRules,
        command: remaining.length > 0 ? remaining : undefined,
      },
    };
  });
}
export {
  isTurnDisallowedToolName,
  applyTurnDisallowedTools,
  filterTurnDisallowedTools,
  isToolDisallowedThisTurn,
};
