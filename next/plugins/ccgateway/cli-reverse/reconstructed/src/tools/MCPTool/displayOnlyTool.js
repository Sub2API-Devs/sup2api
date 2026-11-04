/**
 * tools/MCPTool/displayOnlyTool.ts
 *
 * 2.1.316 新增。只用于转写渲染的 MCP 工具 UI。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vq77wsrh.js (8)
 * attribution: placement 8
 */
import { deviceToolDisplayInfo } from "../../utils/toolUseDisplay.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { union, objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { mcpOutputSchema, MCPTool, MCP_DISPLAY_ONLY } from "./MCPTool.js";
import { isLargeMcpOutput, renderToolResultMessage } from "./UI.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { memoizeWithLRU } from "../../utils/memoize.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vq77wsrh.js:462-479 placement
/**
 * 展示型 MCP 工具工厂的 LRU 缓存条数（256）。
 */
var DISPLAY_ONLY_TOOL_CACHE_SIZE = 256;
var memorySaveUiHooks = null;
//@ chunk-vq77wsrh.js:479-568 placement
function displayOnlyMcpTool(name, host, memorySave = false) {
  let displayInfo = deviceToolDisplayInfo(name);
  return displayInfo
    ? displayOnlyToolFactory.of(host)(name, displayInfo.serverName, displayInfo.toolName, memorySave)
    : undefined;
}
//@ chunk-vq77wsrh.js:568-855 placement
/**
 * 按宿主隔离、带 LRU 缓存的展示型 MCP 工具工厂。
 */
var displayOnlyOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var displayOnlyMcpToolUi;
var displayOnlyToolFactory;
deferInit("chunk-vq77wsrh.js:568", () => {
  displayOnlyOutputSchema = DoctorLazy(() =>
    union([
      mcpOutputSchema(),
      objectSchema({
        content: union([
          stringSchema(),
          array(
            objectSchema({
              type: stringSchema(),
            }).passthrough(),
          ),
        ]),
      }).transform((parsed) => parsed.content),
    ]),
  );
  displayOnlyMcpToolUi = {
    isResultTruncated(result, maxChars) {
      let toolResultContent = extractToolResultContent(result);
      return (
        isLargeMcpOutput(toolResultContent, maxChars) ||
        isLargeMcpOutput(stripResultEscapes(toolResultContent), maxChars)
      );
    },
    renderToolResultMessage(result, progressMessages, { verbose }) {
      return renderToolResultMessage(stripResultEscapes(result), verbose);
    },
  };
  displayOnlyToolFactory = new HostScoped(() =>
    memoizeWithLRU(
      createDisplayOnlyMcpTool,
      (serverName, toolName, flags, memorySave) => (memorySave ? `${serverName}\x00save` : serverName),
      DISPLAY_ONLY_TOOL_CACHE_SIZE,
    ),
  );
});
//@ chunk-vq77wsrh.js:855-1367 placement
/**
 * 只用于渲染的 MCP 工具
 */
function createDisplayOnlyMcpTool(name, serverName, toolName, memorySave = false) {
  let refuse = () => {
    throw Error("Display-only MCP tool invoked \u2014 it exists only for transcript rendering");
  };
  return {
    ...MCPTool,
    name,
    mcpInfo: {
      serverName,
      toolName,
    },
    isEnabled: () => false,
    outputSchema: displayOnlyOutputSchema(),
    uiTableKey: MCP_DISPLAY_ONLY,
    userFacingName: () => `${serverName} - ${toolName} (MCP)`,
    ...(memorySave &&
      memorySaveUiHooks?.isMemorySaveCall({
        serverName,
        toolName,
      }) && {
        userFacingName: () => memorySaveUiHooks.memorySaveRowName(toolName),
        renderToolUseMessage: (input) => memorySaveUiHooks.memorySaveArgument(input),
      }),
    description: async () => refuse(),
    prompt: async () => refuse(),
    call: async () => refuse(),
    checkPermissions: async () => refuse(),
  };
}
//@ chunk-vq77wsrh.js:1367-1573 placement
/**
 * 取工具结果 content
 */
function extractToolResultContent(result) {
  let content =
    typeof result === "object" && result !== null && !Array.isArray(result) && "content" in result
      ? result.content
      : result;
  if (typeof content === "string") return content;
  return Array.isArray(content) && content.every((block) => typeof block === "object" && block !== null)
    ? content
    : undefined;
}
//@ chunk-vq77wsrh.js:1573-1834 placement
/**
 * 匹配 C0/C1 控制字符，展示前去掉。
 */
var ANSI_ESCAPE_RE =
  /\x1b\]8;[^;\x07\n\r\x18\x1a\x1b]*;([^\x07\n\r\x18\x1a\x1b]*)(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[\]P_X^][^\x07\n\r\x18\x1a\x1b]*(?:\x07|\x1b\\)/g;
var CONTROL_CHARS_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;
var ESCAPED_ESC_RE = /\\u001b/gi;
var ESCAPED_CONTROL_RE = /\\u00(?:0[0-8b-f]|1[0-9a-f]|7f|[89][0-9a-f])/gi;
//@ chunk-vq77wsrh.js:1834-2014 placement
/**
 * 去除终端转义，保留链接地址
 */
function stripTerminalEscapes(text) {
  let pendingEscape = "";
  let flushPending = () => (pendingEscape ? ` <${pendingEscape}>` : "");
  return (
    text.replace(ANSI_ESCAPE_RE, (matchText, escapeName) => {
      if (escapeName === undefined) return "";
      let flushedEscape = flushPending();
      pendingEscape = escapeName;
      return flushedEscape;
    }) + flushPending()
  )
    .replace(CONTROL_CHARS_RE, "")
    .replace(ESCAPED_ESC_RE, "\\u241b")
    .replace(ESCAPED_CONTROL_RE, "\\u2426");
}
//@ chunk-vq77wsrh.js:2014-2156 placement
function stripResultEscapes(result) {
  if (typeof result === "string") return stripTerminalEscapes(result);
  return result?.map((block) =>
    block.type === "text" && "text" in block
      ? {
          type: "text",
          text: stripTerminalEscapes(String(block.text ?? "")),
        }
      : block,
  );
}
export { displayOnlyMcpTool, displayOnlyMcpToolUi };
