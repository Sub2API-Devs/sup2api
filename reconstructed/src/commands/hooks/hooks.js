/**
 * commands/hooks/hooks.tsx
 *
 * /hooks 实现：按工具列出钩子配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/hooks/hooks.tsx
 * pieces: chunk-ag5x7vhf.js (2), chunk-bajxb7bf.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { k1 } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFileAndShellTools, getTools } from "../../tools.js";
import { isWebFetchAgentFlagOn } from "../../tools/AgentTool/loadAgentsDir.js";
import { env } from "../../utils/env.js";
import { WebFetchTool } from "../../tools/WebFetchTool/WebFetchTool.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HooksConfigMenu } from "../../components/hooks/HooksConfigMenu.js";

/**
 * （旧版名 getTools 是错配）/hooks 命令用的工具名来源：在 getTools 结果后追加只会出现在 hook 匹配器里的工具（REPL 内部原语 X9n，WebFetch 子代理开启且非简单模式时的 WebFetch），过滤 isEnabled 与拒绝规则。
 */
//@ chunk-ag5x7vhf.js:205711-205838 placement = getTools (0.757)
function getToolsWithHookOnlyTargets(tools, permissionContext) {
  return appendToolsNotInList(
    tools,
    [
      ...(k1() ? getFileAndShellTools() : []),
      ...(isWebFetchAgentFlagOn() && !env.CLAUDE_CODE_SIMPLE ? [WebFetchTool] : []),
    ].filter((tool) => tool.isEnabled() && !getDenyRuleForTool(permissionContext, tool)),
  );
}
/**
 * （旧版名 filterToolsByDenyRules 是错配）把第二个列表里名字不在第一个列表中的工具追加到末尾；第二个列表为空时原样返回。
 */
//@ chunk-ag5x7vhf.js:205838-205978 placement
function appendToolsNotInList(tools, extraTools) {
  if (extraTools.length === 0) return tools;
  let x = new Set(tools.map((k) => k.name)),
    filtered = extraTools.filter((k) => !x.has(k.name));
  return filtered.length > 0 ? [...tools, ...filtered] : tools;
}
/**
 * /hooks 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-bajxb7bf.js:57815-57944 fingerprint = call (0.856)
var call = async (onDone, context) => {
  logEvent("tengu_hooks_command", {});
  let h = getToolPermissionContext(context),
    toolNames = getToolsWithHookOnlyTargets(getTools(h), h).map((tool) => tool.name);
  return e(HooksConfigMenu, { toolNames: toolNames, onExit: onDone });
};

export { appendToolsNotInList };
