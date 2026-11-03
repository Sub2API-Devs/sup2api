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
import { looseObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { identityId2 } from "../../types/ids.js";

//@ chunk-aqt8xcjw.js:558-628 placement
/**
 * base64 字符串的正则。
 */
var STRUCTURED_CONTENT_JSON_BASE64_KEY = "claude/structuredContentJsonBase64";
var BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
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
  if (t.length % 4 !== 0 || !BASE64_RE.test(t)) return;
  let str = Buffer.from(t, "base64").toString("utf8");
  return str.trim() ? str : undefined;
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
function hostedDesktopRefusal_2(e) {
  return isComputerUseTool({
    serverName: e.name,
  })
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        HOSTED_DESKTOP_ONLY_MESSAGE,
        "hosted desktop reached past its tools",
      )
    : undefined;
}
//@ chunk-aqt8xcjw.js:1146-1393 placement
function guardTransportSend(e, t) {
  let o = hostedDesktopRefusal_2(e);
  if (o === undefined) return;
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
    : undefined;
}
//@ chunk-aqt8xcjw.js:1647-1711 placement
/**
 * 托管桌面环境下的拒绝（返回错误或 undefined）。
 */
function hostedDesktopRefusal(e, t) {
  let o = hostedDesktopRefusal_2(e) ?? undefined;
  return o && Promise.reject(o);
}
//@ chunk-aqt8xcjw.js:1711-1748 placement
var TOOLBOX_TEXT_BLOCKS_LEFT_OUT = "toolbox.text_blocks_left_out";
//@ chunk-aqt8xcjw.js:1748-2362 placement
/**
 * 调用 MCP 工具：先检查本地拒绝条件，再经 mcpClientModule 发出 tools/call。
 */
async function callMcpTool(e, t, o, r = false) {
  let n = await (hostedDesktopRefusal(e, r ? t.name : undefined) ??
    remoteBrowserRefusal(e) ??
    require("./chunk-asne9cp8.js").mcpClientModule().invokeToolRaw(e.client, t, o));
  if (isStructuredContentBase64Envelope(n.structuredContent))
    throw new McpStructuredContentNotReadError(e.name, t.name);
  if (
    n._meta?.[TOOLBOX_TEXT_BLOCKS_LEFT_OUT] !== undefined &&
    !(Array.isArray(n.content) && n.content.some((s) => s.type === "text"))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The result of MCP tool "${t.name}" on server "${e.name}" arrived without its text. A result that is too large arrives this way. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.`,
      "MCP tool result arrived without its text blocks",
    );
  return n;
}
//@ chunk-aqt8xcjw.js:2362-2474 placement
function readMcpResource(e, uri, o) {
  return (
    hostedDesktopRefusal(e) ??
    require("./chunk-asne9cp8.js").mcpClientModule().readResourceRaw(e.client, uri, o)
  );
}
//@ chunk-aqt8xcjw.js:2474-2579 placement
function listMcpTools(e, t) {
  return (
    hostedDesktopRefusal(e) ?? require("./chunk-asne9cp8.js").mcpClientModule().listToolsRaw(e.client, t)
  );
}
//@ chunk-aqt8xcjw.js:2579-2599 placement
/**
 * 空对象 schema（用于调用不带参数的请求）。
 */
var emptyObjectSchema = DoctorLazy(() => looseObject({}));
//@ chunk-aqt8xcjw.js:2599-2725 placement
function sendMcpRequest(e, t, o) {
  return (
    hostedDesktopRefusal(e) ??
    (t.method === "tools/call" ? remoteBrowserRefusal(e) : undefined) ??
    identityId2(e.client).request(t, emptyObjectSchema(), {
      ...o,
      cacheMode: "bypass",
    })
  );
}
//@ chunk-aqt8xcjw.js:2725-2818 placement
function onMcpNotification(e, t, o) {
  require("./chunk-asne9cp8.js").mcpClientModule().onMcpNotification(e, t, o);
}
//@ chunk-aqt8xcjw.js:2818-2859 placement
function setMcpOnClose(e, onclose) {
  identityId2(e.client).onclose = onclose;
}
//@ chunk-aqt8xcjw.js:2859-2934 placement
function addMcpOnClose(e, t) {
  let o = identityId2(e.client);
  let onclose = o.onclose;
  o.onclose = () => {
    onclose?.();
    t();
  };
}
//@ chunk-aqt8xcjw.js:2934-2994 placement
function sendMcpNotification(client, t) {
  return hostedDesktopRefusal(client) ?? identityId2(client.client).notification(t);
}
//@ chunk-aqt8xcjw.js:2994-3052 placement
function injectMcpMessage(e, message) {
  identityId2(e.client)?.transport?.onmessage?.(message);
}
export {
  onMcpNotification,
  callMcpTool,
  guardTransportSend,
  hostedDesktopRefusal_2,
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
