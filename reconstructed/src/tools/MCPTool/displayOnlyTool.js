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
import { Ue, u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { mcpOutputSchema, MCPTool, MCP_DISPLAY_ONLY } from "./MCPTool.js";
import { isLargeMcpOutput, renderToolResultMessage } from "./UI.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { memoizeWithLRU } from "../../utils/memoize.js";

//@ chunk-vq77wsrh.js:462-479 placement
var f = 256,
  a = null;
//@ chunk-vq77wsrh.js:479-568 placement
function displayOnlyMcpTool(e, n, t = !1) {
  let r = deviceToolDisplayInfo(e);
  return r ? x.of(n)(e, r.serverName, r.toolName, t) : void 0;
}
/**
 * 只用于转写渲染的 MCP 工具 UI。
 */
//@ chunk-vq77wsrh.js:568-855 placement
var displayOnlyOutputSchema = DoctorLazy(() =>
    Ue([
      mcpOutputSchema(),
      u({ content: Ue([o(), A(u({ type: o() }).passthrough())]) }).transform((e) => e.content),
    ]),
  ),
  displayOnlyMcpToolUi = {
    isResultTruncated(e, n) {
      let t = extractToolResultContent(e);
      return isLargeMcpOutput(t, n) || isLargeMcpOutput(stripResultEscapes(t), n);
    },
    renderToolResultMessage(e, n, { verbose: t }) {
      return renderToolResultMessage(stripResultEscapes(e), t);
    },
  },
  x = new HostScoped(() =>
    memoizeWithLRU(createDisplayOnlyMcpTool, (e, n, t, r) => (r ? `${e}\x00save` : e), f),
  );
/**
 * 只用于渲染的 MCP 工具
 */
//@ chunk-vq77wsrh.js:855-1367 placement
function createDisplayOnlyMcpTool(e, n, t, r = !1) {
  let s = () => {
    throw Error("Display-only MCP tool invoked \u2014 it exists only for transcript rendering");
  };
  return {
    ...MCPTool,
    name: e,
    mcpInfo: { serverName: n, toolName: t },
    isEnabled: () => !1,
    outputSchema: displayOnlyOutputSchema(),
    uiTableKey: MCP_DISPLAY_ONLY,
    userFacingName: () => `${n} - ${t} (MCP)`,
    ...(r &&
      a?.isMemorySaveCall({ serverName: n, toolName: t }) && {
        userFacingName: () => a.memorySaveRowName(t),
        renderToolUseMessage: (i) => a.memorySaveArgument(i),
      }),
    description: async () => s(),
    prompt: async () => s(),
    call: async () => s(),
    checkPermissions: async () => s(),
  };
}
/**
 * 取工具结果 content
 */
//@ chunk-vq77wsrh.js:1367-1573 placement
function extractToolResultContent(e) {
  let n = typeof e === "object" && e !== null && !Array.isArray(e) && "content" in e ? e.content : e;
  if (typeof n === "string") return n;
  return Array.isArray(n) && n.every((t) => typeof t === "object" && t !== null) ? n : void 0;
}
/**
 * ANSI 与控制字符正则
 */
//@ chunk-vq77wsrh.js:1573-1834 placement
var ANSI_ESCAPE_RE =
    /\x1b\]8;[^;\x07\n\r\x18\x1a\x1b]*;([^\x07\n\r\x18\x1a\x1b]*)(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[\]P_X^][^\x07\n\r\x18\x1a\x1b]*(?:\x07|\x1b\\)/g,
  O = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g,
  b = /\\u001b/gi,
  S = /\\u00(?:0[0-8b-f]|1[0-9a-f]|7f|[89][0-9a-f])/gi;
/**
 * 去除终端转义，保留链接地址
 */
//@ chunk-vq77wsrh.js:1834-2014 placement
function stripTerminalEscapes(e) {
  let n = "",
    t = () => (n ? ` <${n}>` : "");
  return (
    e.replace(ANSI_ESCAPE_RE, (s, i) => {
      if (i === void 0) return "";
      let m = t();
      return ((n = i), m);
    }) + t()
  )
    .replace(O, "")
    .replace(b, "\\u241b")
    .replace(S, "\\u2426");
}
//@ chunk-vq77wsrh.js:2014-2156 placement
function stripResultEscapes(e) {
  if (typeof e === "string") return stripTerminalEscapes(e);
  return e?.map((n) =>
    n.type === "text" && "text" in n ? { type: "text", text: stripTerminalEscapes(String(n.text ?? "")) } : n,
  );
}

export { displayOnlyMcpTool };
