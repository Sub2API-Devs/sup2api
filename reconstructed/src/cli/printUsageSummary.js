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
function y3s(e) {
  return e !== void 0 && e !== "" && e !== WEB_HUMAN && e !== "api_direct";
}
/**
 * 筛选回合级禁用工具名：已在禁用列表或总被允许的保留；对匹配到的工具按 costOf（free/costly）判断，MCP 类名字（含 "__"）没有匹配工具时按规则处理。
 */
//@ chunk-e6aww6q8.js:3260805-3261126 placement
function filterTurnDisallowedTools(names, turnDisallowed, getTools, isAlwaysAllowed, costOf) {
  return names.filter((y) => {
    if (turnDisallowed.includes(y) || isAlwaysAllowed(y)) return !0;
    let S = getTools(),
      filtered = S.filter((G) => TRn(y, G));
    if (filtered.length === 0)
      return WXn({ turnDisallowedTools: turnDisallowed }, { name: y }) || !y.includes("__", 5);
    let any = filtered.some((G) => y === getToolNameForPermissionCheck_4(G));
    return filtered.every((G) => {
      if (isAlwaysAllowed(G.name)) return !0;
      let q = costOf(G, S);
      return q === "free" || (q === "costly" && !any);
    });
  });
}
//@ chunk-e6aww6q8.js:3261126-3261171 placement
function TRn(e, n) {
  return e === getToolNameForPermissionCheck_4(n) || mcpRuleMatchesToolAny(e, n);
}
//@ chunk-e6aww6q8.js:3261171-3261243 placement
function WXn(e, n) {
  return e.turnDisallowedTools?.some((r) => TRn(r, n)) ?? !1;
}
/**
 * 把回合级禁用工具写进 AppState：替换 turnDisallowedTools，并在 alwaysDenyRules.command 里去掉旧的、加上新的；未变化时不更新。
 */
//@ chunk-e6aww6q8.js:3261243-3261557 placement
function applyTurnDisallowedTools(setAppState, toolNames) {
  setAppState((r) => {
    let s = r.turnDisallowedTools ?? [];
    if (s.length === toolNames.length && s.every((y, S) => y === toolNames[S])) return r;
    let h = [...(r.alwaysDenyRules.command ?? []).filter((y) => !s.includes(y)), ...toolNames];
    return {
      ...r,
      turnDisallowedTools: toolNames.length > 0 ? toolNames : void 0,
      alwaysDenyRules: { ...r.alwaysDenyRules, command: h.length > 0 ? h : void 0 },
    };
  });
}

export { y3s, applyTurnDisallowedTools, filterTurnDisallowedTools, WXn };
