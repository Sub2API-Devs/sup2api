/**
 * tools/LSPTool/UI.tsx
 *
 * LSP 工具名、描述与调用/结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (4), chunk-hg2zbde4.js (1), chunk-kxyd0g16.js (1), chunk-q466qetm.js (1)
 * attribution: fingerprint 5, placement 1, callgraph-witnessed 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { getSymbolAtPosition } from "./symbolContext.js";
import { getDisplayPath } from "../../utils/file.js";

//@ chunk-ah34pb7m.js:18778-19318 fingerprint = OPERATION_LABELS (1)
var OPERATION_LABELS = {
  goToDefinition: { singular: "definition", plural: "definitions" },
  findReferences: { singular: "reference", plural: "references" },
  documentSymbol: { singular: "symbol", plural: "symbols" },
  workspaceSymbol: { singular: "symbol", plural: "symbols" },
  hover: { singular: "hover info", plural: "hover info", special: "available" },
  goToImplementation: { singular: "implementation", plural: "implementations" },
  prepareCallHierarchy: { singular: "call item", plural: "call items" },
  incomingCalls: { singular: "caller", plural: "callers" },
  outgoingCalls: { singular: "callee", plural: "callees" },
};
//@ chunk-ah34pb7m.js:19318-20567 fingerprint = LSPResultSummary (0.7)
function LSPResultSummary(t0) {
  let M = w(24),
    {
      operation: operation,
      resultCount: resultCount,
      fileCount: fileCount,
      content: content,
      verbose: verbose,
    } = t0,
    T;
  if (M[0] !== operation)
    ((T = OPERATION_LABELS[operation] || { singular: "result", plural: "results" }),
      (M[0] = operation),
      (M[1] = T));
  else T = M[1];
  let x = T,
    countLabel = resultCount === 1 ? x.singular : x.plural,
    b;
  if (M[2] !== countLabel || M[3] !== x.special || M[4] !== operation || M[5] !== resultCount)
    ((b =
      operation === "hover" && resultCount > 0 && x.special
        ? r(Text, { children: ["Hover info ", x.special] })
        : r(Text, { children: ["Found ", r(Text, { bold: !0, children: [resultCount, " "] }), countLabel] })),
      (M[2] = countLabel),
      (M[3] = x.special),
      (M[4] = operation),
      (M[5] = resultCount),
      (M[6] = b));
  else b = M[6];
  let E = b,
    B;
  if (M[7] !== fileCount)
    ((B =
      fileCount > 1
        ? r(Text, { children: [" ", "across ", r(Text, { bold: !0, children: [fileCount, " "] }), "files"] })
        : null),
      (M[7] = fileCount),
      (M[8] = B));
  else B = M[8];
  let L = B;
  if (verbose) {
    let N;
    if (M[9] === MEMO_CACHE_SENTINEL)
      ((N = e(Text, { dimColor: !0, children: "\xA0\xA0\u23BF \xA0" })), (M[9] = N));
    else N = M[9];
    let W;
    if (M[10] !== E || M[11] !== L)
      ((W = e(Box, { flexDirection: "row", children: r(Text, { children: [N, E, L] }) })),
        (M[10] = E),
        (M[11] = L),
        (M[12] = W));
    else W = M[12];
    let U;
    if (M[13] !== content)
      ((U = e(Box, { marginLeft: 5, children: e(Text, { children: content }) })),
        (M[13] = content),
        (M[14] = U));
    else U = M[14];
    let K;
    if (M[15] !== W || M[16] !== U)
      ((K = r(Box, { flexDirection: "column", children: [W, U] })), (M[15] = W), (M[16] = U), (M[17] = K));
    else K = M[17];
    return K;
  }
  let N;
  if (M[18] !== resultCount)
    ((N = resultCount > 0 && e(CtrlOToExpand, {})), (M[18] = resultCount), (M[19] = N));
  else N = M[19];
  let W;
  if (M[20] !== E || M[21] !== L || M[22] !== N)
    ((W = e(MessageResponse, { height: 1, children: r(Text, { children: [E, L, " ", N] }) })),
      (M[20] = E),
      (M[21] = L),
      (M[22] = N),
      (M[23] = W));
  else W = M[23];
  return W;
}
/**
 * LSP 工具的错误渲染：非 verbose 时显示 "LSP operation failed"（归属疑似错误，应属 LSPTool/UI）。
 */
//@ chunk-ah34pb7m.js:20567-20796 placement = renderToolUseErrorMessage (0.509)
function renderToolUseErrorMessage_2(result, { verbose: verbose, toolDenialKind: toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return e(MessageResponse, { children: e(Text, { color: "error", children: "LSP operation failed" }) });
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
/**
 * LSP 结果渲染：有计数时用 LSPResultSummary，否则原样显示文本。
 */
//@ chunk-ah34pb7m.js:20796-21034 fingerprint = renderToolResultMessage (1)
function renderToolResultMessage_4(output, _progressMessages, { verbose: verbose }) {
  if (output.resultCount !== void 0 && output.fileCount !== void 0)
    return e(LSPResultSummary, {
      operation: output.operation,
      resultCount: output.resultCount,
      fileCount: output.fileCount,
      content: output.result,
      verbose: verbose,
    });
  return e(MessageResponse, { children: e(Text, { children: output.result }) });
}
/**
 * LSP 工具名 "LSP" 与工具描述（九种操作说明、行列 1 基）。
 */
//@ chunk-hg2zbde4.js:1720-2980 fingerprint = userFacingName (1)
var LSP_TOOL_NAME = "LSP",
  LSP_TOOL_DESCRIPTION = `Interact with Language Server Protocol (LSP) servers to get code intelligence features.

Supported operations:
- goToDefinition: Find where a symbol is defined
- findReferences: Find all references to a symbol
- hover: Get hover information (documentation, type info) for a symbol
- documentSymbol: Get all symbols (functions, classes, variables) in a document
- workspaceSymbol: Search for symbols matching a query across the entire workspace
- goToImplementation: Find implementations of an interface or abstract method
- prepareCallHierarchy: Get call hierarchy item at a position (functions/methods)
- incomingCalls: Find all functions/methods that call the function at a position
- outgoingCalls: Find all functions/methods called by the function at a position

All operations require:
- filePath: The file to operate on
- line: The line number (1-based, as shown in editors)
- character: The character offset (1-based, as shown in editors)

The workspaceSymbol operation also takes:
- query: The symbol name or partial name to search for. Always provide it \u2014 most language servers return no results for an empty query.

Note: LSP servers must be configured for the file type. If no server is available, an error will be returned.`;
/**
 * LSP 调用渲染：位置类操作显示光标处符号名与路径，其余显示操作名与参数。
 */
//@ chunk-kxyd0g16.js:105186-105853 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage(input, { verbose: verbose }) {
  if (!input.operation) return null;
  let parts = [];
  if (
    (input.operation === "goToDefinition" ||
      input.operation === "findReferences" ||
      input.operation === "hover" ||
      input.operation === "goToImplementation") &&
    input.filePath &&
    input.line !== void 0 &&
    input.character !== void 0
  ) {
    let symbol = getSymbolAtPosition(input.filePath, input.line - 1, input.character - 1),
      f = verbose ? input.filePath : getDisplayPath(input.filePath);
    if (symbol)
      (parts.push(`operation: "${input.operation}"`),
        parts.push(`symbol: "${symbol}"`),
        parts.push(`in: "${f}"`));
    else
      (parts.push(`operation: "${input.operation}"`),
        parts.push(`file: "${f}"`),
        parts.push(`position: ${input.line}:${input.character}`));
    return parts.join(", ");
  }
  if ((parts.push(`operation: "${input.operation}"`), input.filePath)) {
    let s = verbose ? input.filePath : getDisplayPath(input.filePath);
    parts.push(`file: "${s}"`);
  }
  return parts.join(", ");
}
//@ chunk-q466qetm.js:9184-9415 callgraph-witnessed = renderToolUseErrorMessage (0.509)
function renderToolUseErrorMessage(result, { verbose: verbose, toolDenialKind: toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return e(MessageResponse, { children: e(Text, { color: "error", children: "Error editing notebook" }) });
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}

export {
  LSP_TOOL_NAME,
  renderToolResultMessage_4,
  renderToolUseErrorMessage_2,
  LSP_TOOL_DESCRIPTION,
  renderToolUseMessage,
};
