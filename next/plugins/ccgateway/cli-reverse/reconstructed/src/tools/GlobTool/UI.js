/**
 * tools/GlobTool/UI.tsx
 *
 * Glob/Grep 共用的错误渲染与工具摘要
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GlobTool/UI.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-wjygkcr4.js (1)
 * attribution: callgraph-fingerprint 1, callgraph-witnessed 1
 */
import { truncate } from "../../utils/format.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { extractTag } from "../../utils/messages.js";
import { FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";

//@ chunk-5xgkngpb.js:1439822-1439888 callgraph-fingerprint (2.1.88 match: getToolUseSummary, 1)
/**
 * Glob/Grep 工具使用摘要：截短后的 pattern。
 */
function getToolUseSummary_3(input) {
  if (!input?.pattern) return null;
  return truncate(input.pattern, MAX_DESCRIPTION_CHARS);
}
//@ chunk-wjygkcr4.js:18309-18651 callgraph-witnessed (2.1.88 match: renderToolUseErrorMessage, 0.421)
/**
 * Glob/Grep 错误渲染：非 verbose 时显示 "File not found" 或 "Error searching files"。
 */
function renderToolUseErrorMessage_2(result, { verbose, toolDenialKind }) {
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
export { getToolUseSummary_3, renderToolUseErrorMessage_2 };
