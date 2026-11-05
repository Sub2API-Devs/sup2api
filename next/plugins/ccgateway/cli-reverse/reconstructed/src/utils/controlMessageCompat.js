/**
 * utils/controlMessageCompat.ts
 *
 * SDK 控制消息字段兼容（requestId ↔ request_id）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/controlMessageCompat.ts
 * pieces: chunk-gas4wctd.js (4)
 * attribution: placement 3, fingerprint 1
 */

//@ chunk-gas4wctd.js:191-352 placement (2.1.88 match: extractHttpStatus, 1)
/**
 * 兼容控制消息：requestId 转为 request_id。
 */
function normalizeControlMessage(err) {
  if (err === null || typeof err !== "object") return err;
  let message = err;
  normalizeControlMessageKeys(message);
  if ("response" in message && message.response !== null && typeof message.response === "object")
    normalizeControlMessageKeys(message.response);
  return err;
}
//@ chunk-gas4wctd.js:352-469 fingerprint (2.1.88 match: normalizeControlMessageKeys, 0.812)
function normalizeControlMessageKeys(obj) {
  if ("requestId" in obj && !("request_id" in obj)) {
    let controlRequestId = getControlRequestId(obj);
    delete obj.requestId;
    if (controlRequestId !== undefined) obj.request_id = controlRequestId;
  }
}
//@ chunk-gas4wctd.js:469-644 placement
function getControlRequestId(message) {
  if ("request_id" in message) return message.request_id;
  let requestId = "requestId" in message ? message.requestId : undefined;
  return typeof requestId === "string" && requestId.toLowerCase().startsWith("late-bind-")
    ? undefined
    : requestId;
}
//@ chunk-gas4wctd.js:644-656 placement
var MAX_REQUEST_ID_LENGTH = 128;
export { normalizeControlMessage, MAX_REQUEST_ID_LENGTH, getControlRequestId };
