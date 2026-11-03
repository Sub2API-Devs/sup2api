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
function toolNameForAnalytics(name) {
  if (isInferredMcpToolName(name)) return sanitizeToolNameForAnalytics(name);
  if (name.startsWith("mcp__")) return "mcp_tool";
  if (name.startsWith("eval_registered__")) return "eval_registered_tool";
  if (name.includes("__")) return "dynamic_tool";
  return sanitizeToolNameForAnalytics(name);
}
//@ chunk-ah34pb7m.js:156210-156626 placement
/**
 * renderToolResultMessage 返回原始值时上报一次并包成 Text。
 */
function guardPrimitiveToolResult(m, d, c) {
  if (typeof d !== "string" && typeof d !== "number" && typeof d !== "bigint") return d;
  if (claimOnceStore.of(m).claim(`primitive_tool_result_reported:${c.name}`)) {
    let g = typeof d;
    queueMicrotask(() => {
      logError(
        withTelemetryMessage(
          Error(`renderToolResultMessage returned a bare ${g} (tool: ${c.name}) \u2014 wrapped in <Text>`),
          `renderToolResultMessage returned a bare ${g} (tool: ${toolNameForAnalytics(c.name)}) \u2014 wrapped in <Text>`,
        ),
      );
    });
  }
  return jsxProd_default(Text, {
    children: d,
  });
}
//@ chunk-ah34pb7m.js:156626-156682 placement
function selectActiveAgents_2(Ke) {
  return Ke.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:156682-156737 placement
function hasNoErrorOrInterrupt(te) {
  return !te.isErrored && !te.isInterrupted;
}
//@ chunk-ah34pb7m.js:156737-156955 placement = hasContentAfterIndex (0.833)
function hasContentAfterIndex(de) {
  if (de.type === "grouped_tool_use") {
    return true;
  }
  let firstInput = de.message.content[0]?.type;
  return de.type === "assistant"
    ? firstInput === "tool_use" || firstInput === "thinking" || firstInput === "redacted_thinking"
    : de.type === "user" && firstInput === "tool_result";
}
//@ chunk-ah34pb7m.js:156955-157045 placement
function isNoAgentViewInAutoMode(qv) {
  return qv.viewingAgentTaskId === undefined && alwaysFalseRefresh(qv.toolPermissionContext.mode);
}
//@ chunk-ah34pb7m.js:157045-157074 placement
function toolResultId(A1) {
  return A1.id;
}
//@ chunk-ah34pb7m.js:157074-157113 placement
function isHookToolResult(D1) {
  return isReplToolName(D1.name) && true;
}
//@ chunk-ah34pb7m.js:157113-157142 placement
function toolUseId(N1) {
  return N1.id;
}
//@ chunk-ah34pb7m.js:157142-157171 placement
function toolUseId_2(L1) {
  return L1.id;
}
//@ chunk-ah34pb7m.js:157171-157189 placement
function noopRenderHook(vle) {}
//@ chunk-ah34pb7m.js:157189-157215 placement
function returnFalseHook(Ple) {
  return false;
}
//@ chunk-ah34pb7m.js:157215-157374 placement
/**
 * 折叠读取/搜索内容里的一行钩子记录："命令 (耗时)"。
 */
function renderHookDurationLine(Kv, O1) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          children: "     \u23BF ",
        }),
        Kv.command,
        " (",
        formatSecondsShort(Kv.durationMs ?? 0),
        ")",
      ],
    },
    `hook-${O1}`,
  );
}
//@ chunk-ah34pb7m.js:157374-157404 placement
function commitSha(B1) {
  return B1.sha;
}
//@ chunk-ah34pb7m.js:157404-157437 placement
function gitBranch(F1) {
  return F1.branch;
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
