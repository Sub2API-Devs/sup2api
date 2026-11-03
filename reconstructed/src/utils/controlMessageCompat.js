/**
 * utils/controlMessageCompat.ts
 *
 * SDK 控制消息字段兼容（requestId ↔ request_id）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/controlMessageCompat.ts
 * pieces: chunk-xw83kd7e.js (4)
 * attribution: placement 3, fingerprint 1
 */

//@ chunk-xw83kd7e.js:191-352 placement = extractHttpStatus (1)
/**
 * 兼容控制消息：requestId 转为 request_id。
 */
function normalizeControlMessage(err) {
  if (err === null || typeof err !== "object") return err;
  let e = err;
  normalizeControlMessageKeys(e);
  if ("response" in e && e.response !== null && typeof e.response === "object")
    normalizeControlMessageKeys(e.response);
  return err;
}
//@ chunk-xw83kd7e.js:352-469 fingerprint = normalizeControlMessageKeys (0.812)
function normalizeControlMessageKeys(obj) {
  if ("requestId" in obj && !("request_id" in obj)) {
    let controlRequestId = getControlRequestId(obj);
    delete obj.requestId;
    if (controlRequestId !== undefined) obj.request_id = controlRequestId;
  }
}
//@ chunk-xw83kd7e.js:469-644 placement
function getControlRequestId(n) {
  if ("request_id" in n) return n.request_id;
  let requestId = "requestId" in n ? n.requestId : undefined;
  return typeof requestId === "string" && requestId.toLowerCase().startsWith("late-bind-")
    ? undefined
    : requestId;
}
//@ chunk-xw83kd7e.js:644-656 placement
var MAX_REQUEST_ID_LENGTH = 128;
export { normalizeControlMessage, MAX_REQUEST_ID_LENGTH, getControlRequestId };
