/**
 * services/mcp/mcpWireUtils.ts
 *
 * 2.1.316 新增：MCP 线上调用辅助（调用工具、读资源、通知、拦截）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cg0d4t7m.js (18)
 * attribution: placement 18
 */
import { hasMcpInboundDoor } from "./mcpInboundDoor.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { getOwn } from "../../utils/objectSafety.js";
import { isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { HOSTED_DESKTOP_ONLY_MESSAGE } from "../../utils/computerUse/toolRendering.js";
import { CLAUDEAI_SERVER_PREFIX } from "./normalization.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { McpStructuredContentNotReadError } from "./mcpResultErrors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { identityId2 } from "../../types/ids.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cg0d4t7m.js:593-696 placement
/**
 * base64 字符串的正则。
 */
var STRUCTURED_CONTENT_JSON_BASE64_KEY = "claude/structuredContentJsonBase64";
var TOOLBOX_TEXT_BLOCKS_LEFT_OUT = "toolbox.text_blocks_left_out";
var BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
//@ chunk-cg0d4t7m.js:696-784 placement
function isStructuredContentBase64Envelope(value) {
  return (
    hasMcpInboundDoor() &&
    isPlainObject(value) &&
    typeof getOwn(value, STRUCTURED_CONTENT_JSON_BASE64_KEY) === "string" &&
    Object.keys(value).length === 1
  );
}
//@ chunk-cg0d4t7m.js:784-938 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  if (!isStructuredContentBase64Envelope(buffer)) return;
  let encoded = buffer[STRUCTURED_CONTENT_JSON_BASE64_KEY];
  if (encoded.length % 4 !== 0 || !BASE64_RE.test(encoded)) return;
  let str = Buffer.from(encoded, "base64").toString("utf8");
  return str.trim() ? str : undefined;
}
//@ chunk-cg0d4t7m.js:938-1108 placement
var CORE_WIRE_METHODS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cg0d4t7m.js:938", () => {
  CORE_WIRE_METHODS = new Set([
    "server/discover",
    "initialize",
    "notifications/initialized",
    "ping",
    "tools/list",
    "tools/call",
    "notifications/cancelled",
    "notifications/roots/list_changed",
  ]);
});
//@ chunk-cg0d4t7m.js:1108-1213 placement
function hostedDesktopRefusal_2(connection) {
  return isComputerUseTool({
    serverName: connection.name,
  })
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        HOSTED_DESKTOP_ONLY_MESSAGE,
        "hosted desktop reached past its tools",
      )
    : undefined;
}
//@ chunk-cg0d4t7m.js:1213-1460 placement
function guardTransportSend(connection, transport) {
  let refusal = hostedDesktopRefusal_2(connection);
  if (refusal === undefined) return;
  let originalSend = transport.send.bind(transport);
  transport.send = async (message, ...rest) => {
    if (
      !("method" in message
        ? typeof message.method === "string" && CORE_WIRE_METHODS.has(message.method)
        : !Array.isArray(message) && "id" in message && ("result" in message || "error" in message))
    )
      throw refusal;
    return originalSend(message, ...rest);
  };
}
//@ chunk-cg0d4t7m.js:1460-1714 placement
function remoteBrowserRefusal(connection) {
  if (CLAUDEAI_SERVER_PREFIX(connection.name) !== REMOTE_BROWSER_SERVER_NAME) return;
  let browserMod = require("./mcpStringUtils.lazy.js");
  return browserMod.refusesRemoteBrowserCallOutsideChecks(connection.name)
    ? Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          browserMod.REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED,
          "cloud browser called outside its permission check",
        ),
      )
    : undefined;
}
//@ chunk-cg0d4t7m.js:1714-1845 placement
/**
 * 托管桌面环境下的拒绝（返回错误或 undefined）。
 */
function hostedDesktopRefusal(connection, toolName) {
  let refusal =
    hostedDesktopRefusal_2(connection) ??
    (codeModeAccepted()
      ? require("../../utils/codeMode/inProcessBuiltinRefusal.lazy.js").inProcessBuiltinRefusal(
          connection,
          toolName,
        )
      : undefined);
  return refusal && Promise.reject(refusal);
}
//@ chunk-cg0d4t7m.js:1845-2459 placement
/**
 * 调用 MCP 工具：先检查本地拒绝条件，再经 mcpClientModule 发出 tools/call。
 */
async function callMcpTool(connection, tool, args, offCriticalPath = false) {
  let result = await (hostedDesktopRefusal(connection, offCriticalPath ? tool.name : undefined) ??
    remoteBrowserRefusal(connection) ??
    require("./emitTripwireEvent.lazy.js").mcpClientModule().invokeToolRaw(connection.client, tool, args));
  if (isStructuredContentBase64Envelope(result.structuredContent))
    throw new McpStructuredContentNotReadError(connection.name, tool.name);
  if (
    result._meta?.[TOOLBOX_TEXT_BLOCKS_LEFT_OUT] !== undefined &&
    !(Array.isArray(result.content) && result.content.some((block) => block.type === "text"))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The result of MCP tool "${tool.name}" on server "${connection.name}" arrived without its text. A result that is too large arrives this way. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.`,
      "MCP tool result arrived without its text blocks",
    );
  return result;
}
//@ chunk-cg0d4t7m.js:2459-2571 placement
function readMcpResource(connection, uri, options) {
  return (
    hostedDesktopRefusal(connection) ??
    require("./emitTripwireEvent.lazy.js").mcpClientModule().readResourceRaw(connection.client, uri, options)
  );
}
//@ chunk-cg0d4t7m.js:2571-2676 placement
function listMcpTools(connection, requestOptions) {
  return (
    hostedDesktopRefusal(connection) ??
    require("./emitTripwireEvent.lazy.js").mcpClientModule().listToolsRaw(connection.client, requestOptions)
  );
}
//@ chunk-cg0d4t7m.js:2676-2696 placement
/**
 * 空对象 schema（用于调用不带参数的请求）。
 */
var emptyObjectSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cg0d4t7m.js:2676", () => {
  emptyObjectSchema = DoctorLazy(() => looseObject({}));
});
//@ chunk-cg0d4t7m.js:2696-2822 placement
function sendMcpRequest(connection, request, options) {
  return (
    hostedDesktopRefusal(connection) ??
    (request.method === "tools/call" ? remoteBrowserRefusal(connection) : undefined) ??
    identityId2(connection.client).request(request, emptyObjectSchema(), {
      ...options,
      cacheMode: "bypass",
    })
  );
}
//@ chunk-cg0d4t7m.js:2822-2915 placement
function onMcpNotification(connection, schema, handler) {
  require("./emitTripwireEvent.lazy.js").mcpClientModule().onMcpNotification(connection, schema, handler);
}
//@ chunk-cg0d4t7m.js:2915-2956 placement
function setMcpOnClose(connection, onclose) {
  identityId2(connection.client).onclose = onclose;
}
//@ chunk-cg0d4t7m.js:2956-3031 placement
function addMcpOnClose(connection, onClose) {
  let client = identityId2(connection.client);
  let onclose = client.onclose;
  client.onclose = () => {
    onclose?.();
    onClose();
  };
}
//@ chunk-cg0d4t7m.js:3031-3091 placement
function sendMcpNotification(client, notification) {
  return hostedDesktopRefusal(client) ?? identityId2(client.client).notification(notification);
}
//@ chunk-cg0d4t7m.js:3091-3149 placement
function injectMcpMessage(connection, message) {
  identityId2(connection.client)?.transport?.onmessage?.(message);
}
export {
  setMcpOnClose,
  injectMcpMessage,
  onMcpNotification,
  guardTransportSend,
  hostedDesktopRefusal_2,
  base64URLEncode,
  listMcpTools,
  readMcpResource,
  callMcpTool,
  isStructuredContentBase64Envelope,
  sendMcpNotification,
  sendMcpRequest,
  addMcpOnClose,
};
