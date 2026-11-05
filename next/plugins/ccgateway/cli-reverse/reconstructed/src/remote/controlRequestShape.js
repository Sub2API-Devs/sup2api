/**
 * remote/controlRequestShape.ts
 *
 * control_request 形状判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h29vk4wn.js (8)
 * attribution: placement 8
 */
import { isTaggedSystemUserText } from "../utils/messages.js";
import { EXTERNAL_MESSAGE_PREFIX } from "../utils/contextAttachments/externalMessages.js";
import { PEER_MESSAGE_HEADER, PEER_MESSAGE_PREFIXES } from "../utils/crossSessionMessages.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../services/remoteTools/remoteToolsDebug.js";
import { REQUEST_REAUTHORED } from "./tools/reauthoredRequest.js";
import { normalizeAttestationStatus } from "../bridge/deviceAttestation.js";

//@ chunk-h29vk4wn.js:12175-12494 placement
/**
 * 消息是否带工具结果或可识别的文本
 */
function hasToolResultContent(payload) {
  if (payload.tool_use_result !== undefined || payload.plugin_prompt !== undefined) return true;
  let content = payload.message?.content;
  if (typeof content === "string") return isTaggedSystemUserText(content);
  return (
    Array.isArray(content) &&
    content.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        (block.type === "tool_result" ||
          (block.type === "text" &&
            "text" in block &&
            typeof block.text === "string" &&
            isTaggedSystemUserText(block.text))),
    )
  );
}
//@ chunk-h29vk4wn.js:12494-12650 placement
/**
 * 判断消息内容数组中是否有非文本块（或文本字段不是字符串）。
 */
function hasNonTextContent(payload) {
  let content = payload.message?.content;
  return (
    Array.isArray(content) &&
    !content.every(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        (block.type !== "text" || typeof block.text === "string"),
    )
  );
}
//@ chunk-h29vk4wn.js:12650-12688 placement
/**
 * 导出函数 `isControlCommandLike`：参数 e，返回 hasToolResultContent(e) || hasNonTextContent(e)。
 */
function isControlCommandLike(payload) {
  return hasToolResultContent(payload) || hasNonTextContent(payload);
}
//@ chunk-h29vk4wn.js:12688-12910 placement
/**
 * 判断消息是否像控制命令：有控制形状，或某个文本块是单行且以命令/本地命令前缀开头。
 */
function isControlShapedMessage(payload) {
  if (isControlCommandLike(payload)) return true;
  let content = payload.message?.content;
  return (
    typeof content === "string"
      ? [content]
      : Array.isArray(content)
        ? content.flatMap((block) =>
            typeof block === "object" &&
            block !== null &&
            block.type === "text" &&
            typeof block.text === "string"
              ? [block.text]
              : [],
          )
        : []
  ).some(isCommandLine);
}
//@ chunk-h29vk4wn.js:12910-13059 placement
function isCommandLine(text) {
  let index = text.indexOf(`
`);
  return (
    (index === -1 || index === text.length - 1) &&
    (text.startsWith(EXTERNAL_MESSAGE_PREFIX) ||
      text.startsWith(PEER_MESSAGE_HEADER) ||
      PEER_MESSAGE_PREFIXES.some((prefix) => text.startsWith(prefix.trimEnd())))
  );
}
//@ chunk-h29vk4wn.js:13310-13383 placement
function toPrintableExcerpt(value) {
  return String(value)
    .slice(0, 64)
    .replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-h29vk4wn.js:13538-13550 placement
var REPLAY_CLOCK_SKEW_MS = 2000;
//@ chunk-h29vk4wn.js:13740-14265 placement
function isHookCallbackControlRequest(message) {
  let request = message.payload.type === "control_request" ? message.payload.request : undefined;
  let subtype =
    typeof request === "object" && request !== null && "subtype" in request ? request.subtype : undefined;
  let deviceAttestationStatus = message.device_attestation_status;
  if (!(subtype === "hook_callback" || REMOTE_TOOLS_LOG_EVENTS.some((name) => name === subtype))) return {};
  let remoteToolGate = Object.hasOwn(message.payload, "remote_tool_gate")
    ? message.payload.remote_tool_gate
    : undefined;
  let gateMode =
    remoteToolGate === undefined || remoteToolGate === null
      ? undefined
      : remoteToolGate === "caller_reauthored"
        ? "present"
        : remoteToolGate === REQUEST_REAUTHORED
          ? REQUEST_REAUTHORED
          : "other";
  return {
    ...(deviceAttestationStatus !== undefined &&
      deviceAttestationStatus !== null && {
        attestationStatus: normalizeAttestationStatus(
          typeof deviceAttestationStatus === "string"
            ? deviceAttestationStatus.toUpperCase()
            : deviceAttestationStatus,
        ),
      }),
    ...(gateMode !== undefined && {
      modeStamp: gateMode,
    }),
  };
}
export {
  hasToolResultContent,
  REPLAY_CLOCK_SKEW_MS,
  hasNonTextContent,
  toPrintableExcerpt,
  isHookCallbackControlRequest,
  isControlShapedMessage,
  isControlCommandLike,
};
