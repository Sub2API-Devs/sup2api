/**
 * utils/codeMode/inProcessBuiltinRefusal.ts
 *
 * 进程内内建工具在 REPL 模式下绕过自身工具的拒绝（含 list_connected_browsers 等例外）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r4hxa87z.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";
import { isReservedStdioServer } from "../../services/mcp/builtinServerNames.js";
import {
  mayReplScriptsRun,
  codeModeHidesToolNamesFromApi,
  offInCodeModeNoteForModel,
  pastItsToolsInCodeModeNote,
} from "../codeMode.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logError } from "../log.js";

//@ chunk-r4hxa87z.js:4834-4917 placement
var BROWSER_MCP_TOOL_NAMES = new Set(["list_connected_browsers", "select_browser"]);
var EMPTY_MCP_CONFIG = {
  command: "",
  args: [],
};
//@ chunk-r4hxa87z.js:4917-5200 placement
/**
 * 进程内内建工具在 REPL 模式下绕过自身工具时构造拒绝（浏览器工具两个动作除外）。
 */
function codeModeToolGapError(server, toolName) {
  if (
    codeModeAccepted() &&
    isReservedStdioServer(server.name, server.config ?? EMPTY_MCP_CONFIG) &&
    !(toolName !== undefined && BROWSER_MCP_TOOL_NAMES.has(toolName))
  )
    try {
      if (!mayReplScriptsRun()) return;
      return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        codeModeHidesToolNamesFromApi() ? offInCodeModeNoteForModel() : pastItsToolsInCodeModeNote(),
        "in-process built-in reached past its tools in REPL mode",
      );
    } catch (error) {
      logError(error);
      return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        offInCodeModeNoteForModel(),
        "in-process built-in reached past its tools in REPL mode",
      );
    }
  return;
}
export { codeModeToolGapError };
