/**
 * tools/ListMcpResourcesTool/UI.tsx
 *
 * 按键查固定摘要的一行结果渲染器生成函数（computerUse 复用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ListMcpResourcesTool/UI.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-wjygkcr4.js (2)
 * attribution: callgraph-fingerprint 1, placement 2
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { BOT_PROTECTED_TENGU_DAPPER_BLUM } from "../../services/tools/batchTools.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { matchToolRule } from "../../utils/permissions/permissions.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { HintText } from "../../components/design-system/HintText.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { OutputLine } from "../../components/shell/OutputLine.js";

//@ chunk-5xgkngpb.js:3374772-3374954 callgraph-fingerprint (2.1.88 match: renderToolUseMessage, 0.228)
function renderToolUseMessage_3(entries, name, toolPermissionContext) {
  if (getFeatureValue_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_DAPPER_BLUM, false) !== true)
    return [...entries];
  return entries.filter(({ name: serverName }) =>
    [serverName, CLAUDEAI_SERVER_PREFIX(serverName)].every(
      (server) =>
        matchToolRule(
          toolPermissionContext,
          {
            name,
          },
          {
            server,
          },
          "deny",
        ) === null &&
        matchToolRule(
          toolPermissionContext,
          {
            name,
          },
          {
            server,
          },
          "ask",
        ) === null,
    ),
  );
}
//@ chunk-wjygkcr4.js:32169-32344 placement
/**
 * 渲染 MCP 资源列表结果：为空时显示"(No resources found)"，否则输出 JSON。（误归 MonitorTool/UI）
 */
function renderMcpResourceListResult(resources, progressMessages, { verbose }) {
  if (!resources || resources.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(HintText, {
        children: "(No resources found)",
      }),
    });
  let content = jsonStringify(resources, null, 2);
  return jsxProd_default(OutputLine, {
    content,
    verbose,
  });
}
//@ chunk-wjygkcr4.js:33371-33606 placement
function renderMcpResourceDirResult(result, progressMessages, { verbose }) {
  if (result?.error)
    return jsxProd_default(OutputLine, {
      content: result.error,
      verbose,
    });
  if (!result || result.resources.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(HintText, {
        children: "(Empty directory)",
      }),
    });
  let content = jsonStringify(result, null, 2);
  return jsxProd_default(OutputLine, {
    content,
    verbose,
  });
}
export { renderToolUseMessage_3, renderMcpResourceListResult, renderMcpResourceDirResult };
