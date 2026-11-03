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
import { Nue } from "../utils/contextAttachments/externalMessages.js";
import { PEER_MESSAGE_HEADER, PEER_MESSAGE_PREFIXES } from "../utils/crossSessionMessages.js";
import { _Ce } from "../services/remoteTools/remoteToolsDebug.js";
import { normalizeAttestationStatus } from "../bridge/deviceAttestation.js";

/**
 * 消息是否带工具结果或可识别的文本
 */
//@ chunk-08945j39.js:10591-10884 placement
function hasToolResultContent(e) {
  if (e.tool_use_result !== void 0) return !0;
  let n = e.message?.content;
  if (typeof n === "string") return isTaggedSystemUserText(n);
  return (
    Array.isArray(n) &&
    n.some(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        "type" in s &&
        (s.type === "tool_result" ||
          (s.type === "text" && "text" in s && typeof s.text === "string" && isTaggedSystemUserText(s.text))),
    )
  );
}
/**
 * 判断消息内容数组中是否有非文本块（或文本字段不是字符串）。
 */
//@ chunk-08945j39.js:10884-11040 placement
function hasNonTextContent(e) {
  let n = e.message?.content;
  return (
    Array.isArray(n) &&
    !n.every((s) => typeof s === "object" && s !== null && (s.type !== "text" || typeof s.text === "string"))
  );
}
//@ chunk-08945j39.js:11040-11078 placement
function Amo(e) {
  return hasToolResultContent(e) || hasNonTextContent(e);
}
/**
 * 判断消息是否像控制命令：有控制形状，或某个文本块是单行且以命令/本地命令前缀开头。
 */
//@ chunk-08945j39.js:11078-11300 placement
function isControlShapedMessage(e) {
  if (Amo(e)) return !0;
  let n = e.message?.content;
  return (
    typeof n === "string"
      ? [n]
      : Array.isArray(n)
        ? n.flatMap((i) =>
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
    (e.startsWith(Nue) ||
      e.startsWith(PEER_MESSAGE_HEADER) ||
      PEER_MESSAGE_PREFIXES.some((s) => e.startsWith(s.trimEnd())))
  );
}
//@ chunk-08945j39.js:11700-11773 placement
function ee(e) {
  return String(e)
    .slice(0, 64)
    .replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-08945j39.js:11928-11940 placement
var Ot = 2000;
//@ chunk-08945j39.js:12130-12592 placement
function isHookCallbackControlRequest(e) {
  let n = e.payload.type === "control_request" ? e.payload.request : void 0,
    s = typeof n === "object" && n !== null && "subtype" in n ? n.subtype : void 0,
    device_attestation_status = e.device_attestation_status;
  if (!(s === "hook_callback" || _Ce.some((v) => v === s))) return {};
  let remote_tool_gate = e.payload.remote_tool_gate,
    h =
      remote_tool_gate === void 0 || remote_tool_gate === null
        ? void 0
        : remote_tool_gate === "caller_reauthored"
          ? "present"
          : "other";
  return {
    ...(device_attestation_status !== void 0 &&
      device_attestation_status !== null && {
        attestationStatus: normalizeAttestationStatus(
          typeof device_attestation_status === "string"
            ? device_attestation_status.toUpperCase()
            : device_attestation_status,
        ),
      }),
    ...(h !== void 0 && { modeStamp: h }),
  };
}

export {
  Ot,
  hasToolResultContent,
  hasNonTextContent,
  ee,
  isHookCallbackControlRequest,
  isControlShapedMessage,
  Amo,
};
