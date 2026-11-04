/**
 * components/messages/toolResultRendering.ts
 *
 * 2.1.316 新增：renderToolResultMessage 返回原始值时上报一次并包成 Text。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (15)
 * attribution: placement 15
 */
import { isInferredMcpToolName, sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { claimOnceStore } from "../../services/api/verificationRequired.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage } from "../../utils/errors.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { alwaysFalseRefresh } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isReplToolName } from "../../tools/REPLTool/constants.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:156010-156210 placement
function toolNameForAnalytics(toolName) {
  if (isInferredMcpToolName(toolName)) return sanitizeToolNameForAnalytics(toolName);
  if (toolName.startsWith("mcp__")) return "mcp_tool";
  if (toolName.startsWith("eval_registered__")) return "eval_registered_tool";
  if (toolName.includes("__")) return "dynamic_tool";
  return sanitizeToolNameForAnalytics(toolName);
}
//@ chunk-ah34pb7m.js:156210-156626 placement
/**
 * renderToolResultMessage 返回原始值时上报一次并包成 Text。
 */
function guardPrimitiveToolResult(host, result, tool) {
  if (typeof result !== "string" && typeof result !== "number" && typeof result !== "bigint") return result;
  if (claimOnceStore.of(host).claim(`primitive_tool_result_reported:${tool.name}`)) {
    let claimKey = typeof result;
    queueMicrotask(() => {
      logError(
        withTelemetryMessage(
          Error(
            `renderToolResultMessage returned a bare ${claimKey} (tool: ${tool.name}) \u2014 wrapped in <Text>`,
          ),
          `renderToolResultMessage returned a bare ${claimKey} (tool: ${toolNameForAnalytics(tool.name)}) \u2014 wrapped in <Text>`,
        ),
      );
    });
  }
  return jsxProd_default(Text, {
    children: result,
  });
}
//@ chunk-ah34pb7m.js:156626-156682 placement
function selectActiveAgents_2(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:156682-156737 placement
function hasNoErrorOrInterrupt(result) {
  return !result.isErrored && !result.isInterrupted;
}
//@ chunk-ah34pb7m.js:156737-156955 placement (2.1.88 match: hasContentAfterIndex, 0.833)
function hasContentAfterIndex(message) {
  if (message.type === "grouped_tool_use") {
    return true;
  }
  let firstInput = message.message.content[0]?.type;
  return message.type === "assistant"
    ? firstInput === "tool_use" || firstInput === "thinking" || firstInput === "redacted_thinking"
    : message.type === "user" && firstInput === "tool_result";
}
//@ chunk-ah34pb7m.js:156955-157045 placement
function isNoAgentViewInAutoMode(state) {
  return state.viewingAgentTaskId === undefined && alwaysFalseRefresh(state.toolPermissionContext.mode);
}
//@ chunk-ah34pb7m.js:157045-157074 placement
function toolResultId(result) {
  return result.id;
}
//@ chunk-ah34pb7m.js:157074-157113 placement
function isHookToolResult(result) {
  return isReplToolName(result.name) && true;
}
//@ chunk-ah34pb7m.js:157113-157142 placement
function toolUseId(block) {
  return block.id;
}
//@ chunk-ah34pb7m.js:157142-157171 placement
function toolUseId_2(block) {
  return block.id;
}
//@ chunk-ah34pb7m.js:157171-157189 placement
function noopRenderHook(deps) {}
//@ chunk-ah34pb7m.js:157189-157215 placement
function returnFalseHook(deps) {
  return false;
}
//@ chunk-ah34pb7m.js:157215-157374 placement
/**
 * 折叠读取/搜索内容里的一行钩子记录："命令 (耗时)"。
 */
function renderHookDurationLine(hook, index) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          children: "     \u23BF ",
        }),
        hook.command,
        " (",
        formatSecondsShort(hook.durationMs ?? 0),
        ")",
      ],
    },
    `hook-${index}`,
  );
}
//@ chunk-ah34pb7m.js:157374-157404 placement
function commitSha(result) {
  return result.sha;
}
//@ chunk-ah34pb7m.js:157404-157437 placement
function gitBranch(result) {
  return result.branch;
}
export {
  selectActiveAgents_2,
  guardPrimitiveToolResult,
  isNoAgentViewInAutoMode,
  toolResultId,
  isHookToolResult,
  toolUseId,
  toolUseId_2,
  noopRenderHook,
  returnFalseHook,
  renderHookDurationLine,
  commitSha,
  gitBranch,
  hasNoErrorOrInterrupt,
  hasContentAfterIndex,
};
