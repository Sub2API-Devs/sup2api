/**
 * tools/LSPTool/UI.tsx
 *
 * LSP 工具名、描述与调用/结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/UI.tsx
 * pieces: chunk-fmnbrxwy.js (1), chunk-pfdb6yeg.js (1), chunk-wjygkcr4.js (4), chunk-wrav3w1r.js (1)
 * attribution: fingerprint 5, placement 1, callgraph-witnessed 1
 */
import { getSymbolAtPosition } from "./symbolContext.js";
import { getDisplayPath } from "../../utils/file.js";
import { extractTag } from "../../utils/messages.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";

//@ chunk-pfdb6yeg.js:4199-5459 fingerprint (2.1.88 match: userFacingName, 1)
/**
 * LSP 工具名 "LSP" 与工具描述（九种操作说明、行列 1 基）。
 */
var LSP_TOOL_NAME = "LSP";
var LSP_TOOL_DESCRIPTION = `Interact with Language Server Protocol (LSP) servers to get code intelligence features.

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
//@ chunk-fmnbrxwy.js:119900-120567 fingerprint (2.1.88 match: renderToolUseMessage, 1)
/**
 * LSP 调用渲染：位置类操作显示光标处符号名与路径，其余显示操作名与参数。
 */
function renderToolUseMessage(input, { verbose }) {
  if (!input.operation) return null;
  let parts = [];
  if (
    (input.operation === "goToDefinition" ||
      input.operation === "findReferences" ||
      input.operation === "hover" ||
      input.operation === "goToImplementation") &&
    input.filePath &&
    input.line !== undefined &&
    input.character !== undefined
  ) {
    let symbol = getSymbolAtPosition(input.filePath, input.line - 1, input.character - 1);
    let displayPath = verbose ? input.filePath : getDisplayPath(input.filePath);
    if (symbol) {
      parts.push(`operation: "${input.operation}"`);
      parts.push(`symbol: "${symbol}"`);
      parts.push(`in: "${displayPath}"`);
    } else {
      parts.push(`operation: "${input.operation}"`);
      parts.push(`file: "${displayPath}"`);
      parts.push(`position: ${input.line}:${input.character}`);
    }
    return parts.join(", ");
  }
  parts.push(`operation: "${input.operation}"`);
  if (input.filePath) {
    let displayPath = verbose ? input.filePath : getDisplayPath(input.filePath);
    parts.push(`file: "${displayPath}"`);
  }
  return parts.join(", ");
}
//@ chunk-wrav3w1r.js:9829-10060 callgraph-witnessed (2.1.88 match: renderToolUseErrorMessage, 0.51)
function renderToolUseErrorMessage(result, { verbose, toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: "Error editing notebook",
      }),
    });
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-wjygkcr4.js:19061-19601 fingerprint (2.1.88 match: OPERATION_LABELS, 1)
var OPERATION_LABELS = {
  goToDefinition: {
    singular: "definition",
    plural: "definitions",
  },
  findReferences: {
    singular: "reference",
    plural: "references",
  },
  documentSymbol: {
    singular: "symbol",
    plural: "symbols",
  },
  workspaceSymbol: {
    singular: "symbol",
    plural: "symbols",
  },
  hover: {
    singular: "hover info",
    plural: "hover info",
    special: "available",
  },
  goToImplementation: {
    singular: "implementation",
    plural: "implementations",
  },
  prepareCallHierarchy: {
    singular: "call item",
    plural: "call items",
  },
  incomingCalls: {
    singular: "caller",
    plural: "callers",
  },
  outgoingCalls: {
    singular: "callee",
    plural: "callees",
  },
};
//@ chunk-wjygkcr4.js:19601-20850 fingerprint (2.1.88 match: LSPResultSummary, 0.7)
function LSPResultSummary(props) {
  let $ = useMemoCache(24);
  let { operation, resultCount, fileCount, content, verbose } = props;
  let t1;
  if ($[0] !== operation) {
    t1 = OPERATION_LABELS[operation] || {
      singular: "result",
      plural: "results",
    };
    $[0] = operation;
    $[1] = t1;
  } else t1 = $[1];
  let labelConfig = t1;
  let countLabel = resultCount === 1 ? labelConfig.singular : labelConfig.plural;
  let t2;
  if ($[2] !== countLabel || $[3] !== labelConfig.special || $[4] !== operation || $[5] !== resultCount) {
    t2 =
      operation === "hover" && resultCount > 0 && labelConfig.special
        ? jsxProd_default_2(Text, {
            children: ["Hover info ", labelConfig.special],
          })
        : jsxProd_default_2(Text, {
            children: [
              "Found ",
              jsxProd_default_2(Text, {
                bold: true,
                children: [resultCount, " "],
              }),
              countLabel,
            ],
          });
    $[2] = countLabel;
    $[3] = labelConfig.special;
    $[4] = operation;
    $[5] = resultCount;
    $[6] = t2;
  } else t2 = $[6];
  let primaryText = t2;
  let t3;
  if ($[7] !== fileCount) {
    t3 =
      fileCount > 1
        ? jsxProd_default_2(Text, {
            children: [
              " ",
              "across ",
              jsxProd_default_2(Text, {
                bold: true,
                children: [fileCount, " "],
              }),
              "files",
            ],
          })
        : null;
    $[7] = fileCount;
    $[8] = t3;
  } else t3 = $[8];
  let secondaryText = t3;
  if (verbose) {
    let t4;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      t4 = jsxProd_default(Text, {
        dimColor: true,
        children: "\xA0\xA0\u23BF \xA0",
      });
      $[9] = t4;
    } else t4 = $[9];
    let t5;
    if ($[10] !== primaryText || $[11] !== secondaryText) {
      t5 = jsxProd_default(Box, {
        flexDirection: "row",
        children: jsxProd_default_2(Text, {
          children: [t4, primaryText, secondaryText],
        }),
      });
      $[10] = primaryText;
      $[11] = secondaryText;
      $[12] = t5;
    } else t5 = $[12];
    let t6;
    if ($[13] !== content) {
      t6 = jsxProd_default(Box, {
        marginLeft: 5,
        children: jsxProd_default(Text, {
          children: content,
        }),
      });
      $[13] = content;
      $[14] = t6;
    } else t6 = $[14];
    let t7;
    if ($[15] !== t5 || $[16] !== t6) {
      t7 = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t5, t6],
      });
      $[15] = t5;
      $[16] = t6;
      $[17] = t7;
    } else t7 = $[17];
    return t7;
  }
  let t4;
  if ($[18] !== resultCount) {
    t4 = resultCount > 0 && jsxProd_default(CtrlOToExpand, {});
    $[18] = resultCount;
    $[19] = t4;
  } else t4 = $[19];
  let t5;
  if ($[20] !== primaryText || $[21] !== secondaryText || $[22] !== t4) {
    t5 = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default_2(Text, {
        children: [primaryText, secondaryText, " ", t4],
      }),
    });
    $[20] = primaryText;
    $[21] = secondaryText;
    $[22] = t4;
    $[23] = t5;
  } else t5 = $[23];
  return t5;
}
//@ chunk-wjygkcr4.js:20850-21079 placement (2.1.88 match: renderToolUseErrorMessage, 0.51)
/**
 * LSP 工具的错误渲染：非 verbose 时显示 "LSP operation failed"（归属疑似错误，应属 LSPTool/UI）。
 */
function renderToolUseErrorMessage_3(result, { verbose, toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: "LSP operation failed",
      }),
    });
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-wjygkcr4.js:21079-21317 fingerprint (2.1.88 match: renderToolResultMessage, 1)
/**
 * LSP 结果渲染：有计数时用 LSPResultSummary，否则原样显示文本。
 */
function renderToolResultMessage_4(output, _progressMessages, { verbose }) {
  if (output.resultCount !== undefined && output.fileCount !== undefined)
    return jsxProd_default(LSPResultSummary, {
      operation: output.operation,
      resultCount: output.resultCount,
      fileCount: output.fileCount,
      content: output.result,
      verbose,
    });
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: output.result,
    }),
  });
}
export {
  LSP_TOOL_NAME,
  LSP_TOOL_DESCRIPTION,
  renderToolUseMessage,
  renderToolResultMessage_4,
  renderToolUseErrorMessage_3,
  renderToolUseErrorMessage,
};
