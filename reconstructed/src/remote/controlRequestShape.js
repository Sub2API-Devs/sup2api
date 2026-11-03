/**
 * remote/controlRequestShape.ts
 *
 * control_request 形状判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-08945j39.js (8)
 * attribution: placement 8
 */
import { isTaggedSystemUserText } from "../utils/messages.js";
import { EXTERNAL_MESSAGE_PREFIX } from "../utils/contextAttachments/externalMessages.js";
import { PEER_MESSAGE_HEADER, PEER_MESSAGE_PREFIXES } from "../utils/crossSessionMessages.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../services/remoteTools/remoteToolsDebug.js";
import { normalizeAttestationStatus } from "../bridge/deviceAttestation.js";

//@ chunk-08945j39.js:10591-10884 placement
/**
 * 消息是否带工具结果或可识别的文本
 */
function hasToolResultContent(payload) {
  if (payload.tool_use_result !== undefined) return true;
  let content = payload.message?.content;
  if (typeof content === "string") return isTaggedSystemUserText(content);
  return (
    Array.isArray(content) &&
    content.some(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        "type" in s &&
        (s.type === "tool_result" ||
          (s.type === "text" && "text" in s && typeof s.text === "string" && isTaggedSystemUserText(s.text))),
    )
  );
}
//@ chunk-08945j39.js:10884-11040 placement
/**
 * 判断消息内容数组中是否有非文本块（或文本字段不是字符串）。
 */
function hasNonTextContent(e) {
  let content = e.message?.content;
  return (
    Array.isArray(content) &&
    !content.every(
      (s) => typeof s === "object" && s !== null && (s.type !== "text" || typeof s.text === "string"),
    )
  );
}
//@ chunk-08945j39.js:11040-11078 placement
/**
 * 导出函数 `isControlCommandLike`：参数 e，返回 hasToolResultContent(e) || hasNonTextContent(e)。
 */
function isControlCommandLike(e) {
  return hasToolResultContent(e) || hasNonTextContent(e);
}
//@ chunk-08945j39.js:11078-11300 placement
/**
 * 判断消息是否像控制命令：有控制形状，或某个文本块是单行且以命令/本地命令前缀开头。
 */
function isControlShapedMessage(e) {
  if (isControlCommandLike(e)) return true;
  let content = e.message?.content;
  return (
    typeof content === "string"
      ? [content]
      : Array.isArray(content)
        ? content.flatMap((i) =>
            typeof i === "object" && i !== null && i.type === "text" && typeof i.text === "string"
              ? [i.text]
              : [],
          )
        : []
  ).some(isCommandLine);
}
//@ chunk-08945j39.js:11300-11449 placement
function isCommandLine(e) {
  let index = e.indexOf(`
`);
  return (
    (index === -1 || index === e.length - 1) &&
    (e.startsWith(EXTERNAL_MESSAGE_PREFIX) ||
      e.startsWith(PEER_MESSAGE_HEADER) ||
      PEER_MESSAGE_PREFIXES.some((s) => e.startsWith(s.trimEnd())))
  );
}
//@ chunk-08945j39.js:11700-11773 placement
function toPrintableExcerpt(e) {
  return String(e)
    .slice(0, 64)
    .replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-08945j39.js:11928-11940 placement
var REPLAY_CLOCK_SKEW_MS = 2000;
//@ chunk-08945j39.js:12130-12592 placement
function isHookCallbackControlRequest(e) {
  let request = e.payload.type === "control_request" ? e.payload.request : undefined;
  let subtype =
    typeof request === "object" && request !== null && "subtype" in request ? request.subtype : undefined;
  let deviceAttestationStatus = e.device_attestation_status;
  if (!(subtype === "hook_callback" || REMOTE_TOOLS_LOG_EVENTS.some((v) => v === subtype))) return {};
  let remoteToolGate = e.payload.remote_tool_gate;
  let h =
    remoteToolGate === undefined || remoteToolGate === null
      ? undefined
      : remoteToolGate === "caller_reauthored"
        ? "present"
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
    ...(h !== undefined && {
      modeStamp: h,
    }),
  };
}
export {
  REPLAY_CLOCK_SKEW_MS,
  hasToolResultContent,
  hasNonTextContent,
  toPrintableExcerpt,
  isHookCallbackControlRequest,
  isControlShapedMessage,
  isControlCommandLike,
};
