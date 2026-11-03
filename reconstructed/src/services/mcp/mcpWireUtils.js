/**
 * services/mcp/mcpWireUtils.ts
 *
 * 2.1.316 新增：MCP 线上调用辅助（调用工具、读资源、通知、拦截）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqt8xcjw.js (19)
 * attribution: placement 19
 */
import { hasMcpInboundDoor } from "./mcpInboundDoor.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { getOwn } from "../../utils/objectSafety.js";
import { isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { HOSTED_DESKTOP_ONLY_MESSAGE } from "../../utils/computerUse/toolRendering.js";
import { normalizeNameForMCP } from "./normalization.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { McpStructuredContentNotReadError } from "./mcpResultErrors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt } from "../../../vendor/zod/v4/classic/schemas.js";
import { oa } from "../../types/ids.js";

//@ chunk-aqt8xcjw.js:558-628 placement
var STRUCTURED_CONTENT_JSON_BASE64_KEY = "claude/structuredContentJsonBase64",
  d = /^[A-Za-z0-9+/]*={0,2}$/;
//@ chunk-aqt8xcjw.js:628-717 placement
function isStructuredContentBase64Envelope(e) {
  return (
    hasMcpInboundDoor() &&
    isPlainObject(e) &&
    typeof getOwn(e, STRUCTURED_CONTENT_JSON_BASE64_KEY) === "string" &&
    Object.keys(e).length === 1
  );
}
//@ chunk-aqt8xcjw.js:717-871 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  if (!isStructuredContentBase64Envelope(buffer)) return;
  let t = buffer[STRUCTURED_CONTENT_JSON_BASE64_KEY];
  if (t.length % 4 !== 0 || !d.test(t)) return;
  let str = Buffer.from(t, "base64").toString("utf8");
  return str.trim() ? str : void 0;
}
//@ chunk-aqt8xcjw.js:871-1041 placement
var CORE_WIRE_METHODS = new Set([
  "server/discover",
  "initialize",
  "notifications/initialized",
  "ping",
  "tools/list",
  "tools/call",
  "notifications/cancelled",
  "notifications/roots/list_changed",
]);
//@ chunk-aqt8xcjw.js:1041-1146 placement
function hostedDesktopRefusal(e) {
  return isComputerUseTool({ serverName: e.name })
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        HOSTED_DESKTOP_ONLY_MESSAGE,
        "hosted desktop reached past its tools",
      )
    : void 0;
}
//@ chunk-aqt8xcjw.js:1146-1393 placement
function guardTransportSend(e, t) {
  let o = hostedDesktopRefusal(e);
  if (o === void 0) return;
  let r = t.send.bind(t);
  t.send = async (n, ...s) => {
    if (
      !("method" in n
        ? typeof n.method === "string" && CORE_WIRE_METHODS.has(n.method)
        : !Array.isArray(n) && "id" in n && ("result" in n || "error" in n))
    )
      throw o;
    return r(n, ...s);
  };
}
//@ chunk-aqt8xcjw.js:1393-1647 placement
function remoteBrowserRefusal(e) {
  if (normalizeNameForMCP(e.name) !== REMOTE_BROWSER_SERVER_NAME) return;
  let t = require("./chunk-bm3bestd.js");
  return t.refusesRemoteBrowserCallOutsideChecks(e.name)
    ? Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          t.REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED,
          "cloud browser called outside its permission check",
        ),
      )
    : void 0;
}
//@ chunk-aqt8xcjw.js:1647-1711 placement
function i(e, t) {
  let o = hostedDesktopRefusal(e) ?? void 0;
  return o && Promise.reject(o);
}
//@ chunk-aqt8xcjw.js:1711-1748 placement
var TOOLBOX_TEXT_BLOCKS_LEFT_OUT = "toolbox.text_blocks_left_out";
/**
 * 调用 MCP 工具：先检查本地拒绝条件，再经 mcpClientModule 发出 tools/call。
 */
//@ chunk-aqt8xcjw.js:1748-2362 placement
async function callMcpTool(e, t, o, r = !1) {
  let n = await (i(e, r ? t.name : void 0) ??
    remoteBrowserRefusal(e) ??
    require("./chunk-asne9cp8.js").mcpClientModule().invokeToolRaw(e.client, t, o));
  if (isStructuredContentBase64Envelope(n.structuredContent))
    throw new McpStructuredContentNotReadError(e.name, t.name);
  if (
    n._meta?.[TOOLBOX_TEXT_BLOCKS_LEFT_OUT] !== void 0 &&
    !(Array.isArray(n.content) && n.content.some((s) => s.type === "text"))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The result of MCP tool "${t.name}" on server "${e.name}" arrived without its text. A result that is too large arrives this way. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.`,
      "MCP tool result arrived without its text blocks",
    );
  return n;
}
//@ chunk-aqt8xcjw.js:2362-2474 placement
function readMcpResource(e, t, o) {
  return i(e) ?? require("./chunk-asne9cp8.js").mcpClientModule().readResourceRaw(e.client, t, o);
}
//@ chunk-aqt8xcjw.js:2474-2579 placement
function listMcpTools(e, t) {
  return i(e) ?? require("./chunk-asne9cp8.js").mcpClientModule().listToolsRaw(e.client, t);
}
//@ chunk-aqt8xcjw.js:2579-2599 placement
var f = DoctorLazy(() => kt({}));
//@ chunk-aqt8xcjw.js:2599-2725 placement
function sendMcpRequest(e, t, o) {
  return (
    i(e) ??
    (t.method === "tools/call" ? remoteBrowserRefusal(e) : void 0) ??
    oa(e.client).request(t, f(), { ...o, cacheMode: "bypass" })
  );
}
//@ chunk-aqt8xcjw.js:2725-2818 placement
function onMcpNotification(e, t, o) {
  require("./chunk-asne9cp8.js").mcpClientModule().onMcpNotification(e, t, o);
}
//@ chunk-aqt8xcjw.js:2818-2859 placement
function setMcpOnClose(e, t) {
  oa(e.client).onclose = t;
}
//@ chunk-aqt8xcjw.js:2859-2934 placement
function addMcpOnClose(e, t) {
  let o = oa(e.client),
    onclose = o.onclose;
  o.onclose = () => {
    (onclose?.(), t());
  };
}
//@ chunk-aqt8xcjw.js:2934-2994 placement
function sendMcpNotification(e, t) {
  return i(e) ?? oa(e.client).notification(t);
}
//@ chunk-aqt8xcjw.js:2994-3052 placement
function injectMcpMessage(e, t) {
  oa(e.client)?.transport?.onmessage?.(t);
}

export {
  onMcpNotification,
  callMcpTool,
  guardTransportSend,
  hostedDesktopRefusal,
  base64URLEncode,
  injectMcpMessage,
  setMcpOnClose,
  listMcpTools,
  readMcpResource,
  isStructuredContentBase64Envelope,
  addMcpOnClose,
  sendMcpNotification,
  sendMcpRequest,
};
