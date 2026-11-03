/**
 * cli/printUsageSummary.ts
 *
 * 2.1.316 新增：print 模式结束时的用量/费用摘要输出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { WEB_HUMAN } from "../services/projectsRelay/relayConfig.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_4 } from "../services/mcp/mcpStringUtils.js";
import { mcpRuleMatchesToolAny } from "../services/mcp/serverIdentity.js";

//@ chunk-e6aww6q8.js:3260736-3260805 placement
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
//@ chunk-e6aww6q8.js:3260805-3261126 placement
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
    let any = filtered.some((G) => name === getToolNameForPermissionCheck_4(G));
    return filtered.every((G) => {
      if (isAlwaysAllowed(G.name)) return true;
      let q = costOf(G, tools);
      return q === "free" || (q === "costly" && !any);
    });
  });
}
//@ chunk-e6aww6q8.js:3261126-3261171 placement
function turnDisallowRuleMatchesTool(e, n) {
  return e === getToolNameForPermissionCheck_4(n) || mcpRuleMatchesToolAny(e, n);
}
//@ chunk-e6aww6q8.js:3261171-3261243 placement
/**
 * 判断某工具是否被本回合禁用（turnDisallowedTools 里任一规则命中）。
 */
function isToolDisallowedThisTurn(e, n) {
  return (
    e.turnDisallowedTools?.some((turnDisallowedTool) => turnDisallowRuleMatchesTool(turnDisallowedTool, n)) ??
    false
  );
}
//@ chunk-e6aww6q8.js:3261243-3261557 placement
/**
 * 把回合级禁用工具写进 AppState：替换 turnDisallowedTools，并在 alwaysDenyRules.command 里去掉旧的、加上新的；未变化时不更新。
 */
function applyTurnDisallowedTools(setAppState, toolNames) {
  setAppState((r) => {
    let turnDisallowedTools = r.turnDisallowedTools ?? [];
    if (
      turnDisallowedTools.length === toolNames.length &&
      turnDisallowedTools.every((turnDisallowedTool, S) => turnDisallowedTool === toolNames[S])
    )
      return r;
    let h = [
      ...(r.alwaysDenyRules.command ?? []).filter((y) => !turnDisallowedTools.includes(y)),
      ...toolNames,
    ];
    return {
      ...r,
      turnDisallowedTools: toolNames.length > 0 ? toolNames : undefined,
      alwaysDenyRules: {
        ...r.alwaysDenyRules,
        command: h.length > 0 ? h : undefined,
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
