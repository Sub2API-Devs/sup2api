/**
 * components/messages/toolResultRendering.ts
 *
 * 2.1.316 新增：renderToolResultMessage 返回原始值时上报一次并包成 Text。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (20)
 * attribution: placement 13, layout 7
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
import { isAsyncLaneMode } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-wjygkcr4.js:157646-157846 placement
function toolNameForAnalytics(name) {
  if (isInferredMcpToolName(name)) return sanitizeToolNameForAnalytics(name);
  if (name.startsWith("mcp__")) return "mcp_tool";
  if (name.startsWith("eval_registered__")) return "eval_registered_tool";
  if (name.includes("__")) return "dynamic_tool";
  return sanitizeToolNameForAnalytics(name);
}
//@ chunk-wjygkcr4.js:157846-158262 placement
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
//@ chunk-wjygkcr4.js:158262-158318 placement
function selectActiveAgents_2(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-wjygkcr4.js:158318-158373 placement
function hasNoErrorOrInterrupt(result) {
  return !result.isErrored && !result.isInterrupted;
}
//@ chunk-wjygkcr4.js:158373-158591 placement (2.1.88 match: hasContentAfterIndex, 0.804)
function hasContentAfterIndex(message) {
  if (message.type === "grouped_tool_use") {
    return true;
  }
  let firstInput = message.message.content[0]?.type;
  return message.type === "assistant"
    ? firstInput === "tool_use" || firstInput === "thinking" || firstInput === "redacted_thinking"
    : message.type === "user" && firstInput === "tool_result";
}
//@ chunk-wjygkcr4.js:158591-158680 placement
function isNoAgentViewInAutoMode(state) {
  return state.viewingAgentTaskId === undefined && isAsyncLaneMode(state.toolPermissionContext.mode);
}
//@ chunk-wjygkcr4.js:158680-158735 layout
function isReplToolCallProgress(progress) {
  return progress.data.type === "repl_tool_call";
}
//@ chunk-wjygkcr4.js:158735-158764 placement
function toolResultId(result) {
  return result.id;
}
//@ chunk-wjygkcr4.js:158764-158800 placement
function isHookToolResult(result) {
  return result.name === POLL;
}
//@ chunk-wjygkcr4.js:158800-158829 placement
function toolUseId(block) {
  return block.id;
}
//@ chunk-wjygkcr4.js:158829-158858 placement
function toolUseId_2(block) {
  return block.id;
}
//@ chunk-wjygkcr4.js:158858-158887 layout
function toolCallId(call) {
  return call.id;
}
//@ chunk-wjygkcr4.js:158887-158929 layout
function isErroredPhase(entry) {
  return entry.phase === "error";
}
//@ chunk-wjygkcr4.js:158929-158958 layout
function runningCallId(call) {
  return call.id;
}
//@ chunk-wjygkcr4.js:158958-158987 layout
function liveCallId(call) {
  return call.id;
}
//@ chunk-wjygkcr4.js:158987-159029 layout
function isErrorPhase(entry) {
  return entry.phase === "error";
}
//@ chunk-wjygkcr4.js:159029-159058 layout
function erroredCallId(call) {
  return call.id;
}
//@ chunk-wjygkcr4.js:159058-159217 placement
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
//@ chunk-wjygkcr4.js:159217-159247 placement
function commitSha(result) {
  return result.sha;
}
//@ chunk-wjygkcr4.js:159247-159280 placement
function gitBranch(result) {
  return result.branch;
}
export {
  guardPrimitiveToolResult,
  selectActiveAgents_2,
  isNoAgentViewInAutoMode,
  isReplToolCallProgress,
  toolResultId,
  isHookToolResult,
  toolUseId,
  toolUseId_2,
  toolCallId,
  isErroredPhase,
  runningCallId,
  liveCallId,
  isErrorPhase,
  erroredCallId,
  renderHookDurationLine,
  commitSha,
  gitBranch,
  hasNoErrorOrInterrupt,
  hasContentAfterIndex,
};
