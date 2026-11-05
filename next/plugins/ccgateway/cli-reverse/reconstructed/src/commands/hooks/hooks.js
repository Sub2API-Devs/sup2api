/**
 * commands/hooks/hooks.tsx
 *
 * /hooks 实现：按工具列出钩子配置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/hooks/hooks.tsx
 * pieces: chunk-4rj00p91.js (2), chunk-5tpnqyt5.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFileAndShellTools, getTools } from "../../tools.js";
import { isWebFetchAgentFlagOn } from "../../tools/AgentTool/loadAgentsDir.js";
import { env } from "../../utils/env.js";
import { WebFetchTool } from "../../tools/WebFetchTool/WebFetchTool.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HooksConfigMenu } from "../../components/hooks/HooksConfigMenu.js";

//@ chunk-4rj00p91.js:588-714 placement (2.1.88 match: getTools, 0.757)
/**
 * （旧版名 getTools 是错配）/hooks 命令用的工具名来源：在 getTools 结果后追加只会出现在 hook 匹配器里的工具（REPL 内部原语 X9n，WebFetch 子代理开启且非简单模式时的 WebFetch），过滤 isEnabled 与拒绝规则。
 */
function getToolsWithHookOnlyTargets(tools, permissionContext) {
  return appendToolsNotInList(
    tools,
    [
      ...(isCodeModeEnabled() ? getFileAndShellTools() : []),
      ...(isWebFetchAgentFlagOn() && !env.CLAUDE_CODE_SIMPLE ? [WebFetchTool] : []),
    ].filter((tool) => tool.isEnabled() && !getDenyRuleForTool(permissionContext, tool)),
  );
}
//@ chunk-4rj00p91.js:714-853 placement
/**
 * （旧版名 filterToolsByDenyRules 是错配）把第二个列表里名字不在第一个列表中的工具追加到末尾；第二个列表为空时原样返回。
 */
function appendToolsNotInList(tools, extraTools) {
  if (extraTools.length === 0) return tools;
  let toolNames = new Set(tools.map((tool) => tool.name));
  let filtered = extraTools.filter((extraTool) => !toolNames.has(extraTool.name));
  return filtered.length > 0 ? [...tools, ...filtered] : tools;
}
//@ chunk-5tpnqyt5.js:59314-59443 fingerprint (2.1.88 match: call, 0.856)
/**
 * /hooks 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) => {
  logEvent("tengu_hooks_command", {});
  let permissionContext = getToolPermissionContext(context);
  let toolNames = getToolsWithHookOnlyTargets(getTools(permissionContext), permissionContext).map(
    (tool) => tool.name,
  );
  return jsxProd_default(HooksConfigMenu, {
    toolNames,
    onExit: onDone,
  });
};
export { appendToolsNotInList, call };
