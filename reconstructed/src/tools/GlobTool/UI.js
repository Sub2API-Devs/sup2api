/**
 * tools/GlobTool/UI.tsx
 *
 * Glob/Grep 共用的错误渲染与工具摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GlobTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1), chunk-e6aww6q8.js (1)
 * attribution: callgraph-witnessed 1, callgraph-fingerprint 1
 */
import { extractTag } from "../../utils/messages.js";
import { FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { truncate } from "../../utils/format.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";

//@ chunk-ah34pb7m.js:18026-18368 callgraph-witnessed = renderToolUseErrorMessage (0.42)
/**
 * Glob/Grep 错误渲染：非 verbose 时显示 "File not found" 或 "Error searching files"。
 */
function renderToolUseErrorMessage_3(result, { verbose, toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  ) {
    if (extractTag(result, "tool_use_error")?.includes(FILE_NOT_FOUND_CWD_NOTE))
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: "File not found",
        }),
      });
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: "Error searching files",
      }),
    });
  }
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-e6aww6q8.js:1439832-1439898 callgraph-fingerprint = getToolUseSummary (1)
/**
 * Glob/Grep 工具使用摘要：截短后的 pattern。
 */
function getToolUseSummary_4(input) {
  if (!input?.pattern) return null;
  return truncate(input.pattern, MAX_DESCRIPTION_CHARS);
}
export { renderToolUseErrorMessage_3, getToolUseSummary_4 };
