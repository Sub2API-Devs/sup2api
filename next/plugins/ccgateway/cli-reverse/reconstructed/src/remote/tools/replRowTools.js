/**
 * remote/tools/replRowTools.ts
 *
 * REPL 模式下远端行工具与 fork 历史工具列表（含错误兜底）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wngqsq6a.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { withExtraExportTools } from "../../utils/exportRenderer.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-wngqsq6a.js:13046-13075 placement
/**
 * REPL 模式下的远端行工具列表。
 */
function toolsWithReplExtras(tools) {
  return addReplToolsSafely(tools) ?? tools;
}
//@ chunk-wngqsq6a.js:13075-13113 placement
/**
 * REPL 模式下的 fork 历史工具列表（非 Code 模式返回 undefined）。
 */
function toolsIfCodeMode(tools) {
  return isCodeModeEnabled() ? toolsWithReplExtras(tools) : undefined;
}
//@ chunk-wngqsq6a.js:13113-13387 placement
function addReplToolsSafely(tools) {
  try {
    return isCodeModeEnabled() ? withExtraExportTools(tools) : undefined;
  } catch (error) {
    logForDebugging(
      `Remote Control: couldn't add REPL mode's file and shell tools to the list the Claude apps' messages are built from, so the apps will show an empty result for a script's calls to them: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
export { toolsIfCodeMode, toolsWithReplExtras };
