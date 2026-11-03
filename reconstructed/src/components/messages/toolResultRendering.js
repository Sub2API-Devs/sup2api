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
import { fTi, sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { claimOnceStore } from "../../services/api/verificationRequired.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage } from "../../utils/errors.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { kYe } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { _O } from "../../tools/REPLTool/constants.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:156010-156210 placement
function toolNameForAnalytics(m) {
  if (fTi(m)) return sanitizeToolNameForAnalytics(m);
  if (m.startsWith("mcp__")) return "mcp_tool";
  if (m.startsWith("eval_registered__")) return "eval_registered_tool";
  if (m.includes("__")) return "dynamic_tool";
  return sanitizeToolNameForAnalytics(m);
}
/**
 * renderToolResultMessage 返回原始值时上报一次并包成 Text。
 */
//@ chunk-ah34pb7m.js:156210-156626 placement
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
  return e(Text, { children: d });
}
//@ chunk-ah34pb7m.js:156626-156682 placement
function I0(Ke) {
  return Ke.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:156682-156737 placement
function D0(te) {
  return !te.isErrored && !te.isInterrupted;
}
//@ chunk-ah34pb7m.js:156737-156955 placement = hasContentAfterIndex (0.833)
function hasContentAfterIndex(de) {
  if (de.type === "grouped_tool_use") {
    return !0;
  }
  let firstInput = de.message.content[0]?.type;
  return de.type === "assistant"
    ? firstInput === "tool_use" || firstInput === "thinking" || firstInput === "redacted_thinking"
    : de.type === "user" && firstInput === "tool_result";
}
//@ chunk-ah34pb7m.js:156955-157045 placement
function O0(qv) {
  return qv.viewingAgentTaskId === void 0 && kYe(qv.toolPermissionContext.mode);
}
//@ chunk-ah34pb7m.js:157045-157074 placement
function B0(A1) {
  return A1.id;
}
//@ chunk-ah34pb7m.js:157074-157113 placement
function F0(D1) {
  return _O(D1.name) && !0;
}
//@ chunk-ah34pb7m.js:157113-157142 placement
function j0(N1) {
  return N1.id;
}
//@ chunk-ah34pb7m.js:157142-157171 placement
function W0(L1) {
  return L1.id;
}
//@ chunk-ah34pb7m.js:157171-157189 placement
function H0(vle) {}
//@ chunk-ah34pb7m.js:157189-157215 placement
function G0(Ple) {
  return !1;
}
/**
 * 折叠读取/搜索内容里的一行钩子记录："命令 (耗时)"。
 */
//@ chunk-ah34pb7m.js:157215-157374 placement
function renderHookDurationLine(Kv, O1) {
  return r(
    Text,
    {
      dimColor: !0,
      children: [
        e(Text, { "aria-hidden": !0, children: "     \u23BF " }),
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
function K0(B1) {
  return B1.sha;
}
//@ chunk-ah34pb7m.js:157404-157437 placement
function V0(F1) {
  return F1.branch;
}

export {
  I0,
  guardPrimitiveToolResult,
  O0,
  B0,
  F0,
  j0,
  W0,
  H0,
  G0,
  renderHookDurationLine,
  K0,
  V0,
  D0,
  hasContentAfterIndex,
};
