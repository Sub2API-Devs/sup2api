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
import { union, u, string, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { mcpOutputSchema, MCPTool, MCP_DISPLAY_ONLY } from "./MCPTool.js";
import { isLargeMcpOutput, renderToolResultMessage } from "./UI.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { memoizeWithLRU } from "../../utils/memoize.js";

//@ chunk-vq77wsrh.js:462-479 placement
/**
 * 展示型 MCP 工具工厂的 LRU 缓存条数（256）。
 */
var DISPLAY_ONLY_TOOL_CACHE_SIZE = 256;
var memorySaveUiHooks = null;
//@ chunk-vq77wsrh.js:479-568 placement
function displayOnlyMcpTool(name, host, t = false) {
  let r = deviceToolDisplayInfo(name);
  return r ? displayOnlyToolFactory.of(host)(name, r.serverName, r.toolName, t) : undefined;
}
//@ chunk-vq77wsrh.js:568-855 placement
/**
 * 按宿主隔离、带 LRU 缓存的展示型 MCP 工具工厂。
 */
var displayOnlyOutputSchema = DoctorLazy(() =>
  union([
    mcpOutputSchema(),
    u({
      content: union([
        string(),
        array(
          u({
            type: string(),
          }).passthrough(),
        ),
      ]),
    }).transform((e) => e.content),
  ]),
);
var displayOnlyMcpToolUi = {
  isResultTruncated(e, n) {
    let toolResultContent = extractToolResultContent(e);
    return (
      isLargeMcpOutput(toolResultContent, n) || isLargeMcpOutput(stripResultEscapes(toolResultContent), n)
    );
  },
  renderToolResultMessage(e, n, { verbose }) {
    return renderToolResultMessage(stripResultEscapes(e), verbose);
  },
};
var displayOnlyToolFactory = new HostScoped(() =>
  memoizeWithLRU(
    createDisplayOnlyMcpTool,
    (e, n, t, r) => (r ? `${e}\x00save` : e),
    DISPLAY_ONLY_TOOL_CACHE_SIZE,
  ),
);
//@ chunk-vq77wsrh.js:855-1367 placement
/**
 * 只用于渲染的 MCP 工具
 */
function createDisplayOnlyMcpTool(name, n, t, r = false) {
  let s = () => {
    throw Error("Display-only MCP tool invoked \u2014 it exists only for transcript rendering");
  };
  return {
    ...MCPTool,
    name,
    mcpInfo: {
      serverName: n,
      toolName: t,
    },
    isEnabled: () => false,
    outputSchema: displayOnlyOutputSchema(),
    uiTableKey: MCP_DISPLAY_ONLY,
    userFacingName: () => `${n} - ${t} (MCP)`,
    ...(r &&
      memorySaveUiHooks?.isMemorySaveCall({
        serverName: n,
        toolName: t,
      }) && {
        userFacingName: () => memorySaveUiHooks.memorySaveRowName(t),
        renderToolUseMessage: (i) => memorySaveUiHooks.memorySaveArgument(i),
      }),
    description: async () => s(),
    prompt: async () => s(),
    call: async () => s(),
    checkPermissions: async () => s(),
  };
}
//@ chunk-vq77wsrh.js:1367-1573 placement
/**
 * 取工具结果 content
 */
function extractToolResultContent(e) {
  let n = typeof e === "object" && e !== null && !Array.isArray(e) && "content" in e ? e.content : e;
  if (typeof n === "string") return n;
  return Array.isArray(n) && n.every((t) => typeof t === "object" && t !== null) ? n : undefined;
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
function stripTerminalEscapes(e) {
  let n = "";
  let t = () => (n ? ` <${n}>` : "");
  return (
    e.replace(ANSI_ESCAPE_RE, (s, i) => {
      if (i === undefined) return "";
      let m = t();
      n = i;
      return m;
    }) + t()
  )
    .replace(CONTROL_CHARS_RE, "")
    .replace(ESCAPED_ESC_RE, "\\u241b")
    .replace(ESCAPED_CONTROL_RE, "\\u2426");
}
//@ chunk-vq77wsrh.js:2014-2156 placement
function stripResultEscapes(e) {
  if (typeof e === "string") return stripTerminalEscapes(e);
  return e?.map((n) =>
    n.type === "text" && "text" in n
      ? {
          type: "text",
          text: stripTerminalEscapes(String(n.text ?? "")),
        }
      : n,
  );
}
export { displayOnlyMcpTool };
