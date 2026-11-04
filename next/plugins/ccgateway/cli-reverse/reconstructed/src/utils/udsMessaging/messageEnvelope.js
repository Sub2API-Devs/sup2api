/**
 * utils/udsMessaging/messageEnvelope.ts
 *
 * 2.1.316 新增：跨会话消息信封（msgV、msg_id）与 UUID 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0xhrb5qv.js (5)
 * attribution: placement 5
 */
import { randomUUID as Ude } from "crypto";

//@ chunk-0xhrb5qv.js:228-236 placement
var ENVELOPE_VERSION = 1;
//@ chunk-0xhrb5qv.js:236-262 placement
function newMessageId() {
  return Ude();
}
//@ chunk-0xhrb5qv.js:262-334 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//@ chunk-0xhrb5qv.js:334-388 placement
function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}
//@ chunk-0xhrb5qv.js:388-428 placement
function createMessageEnvelope() {
  return {
    msgV: ENVELOPE_VERSION,
    msg_id: newMessageId(),
  };
}
export { isUuid, createMessageEnvelope };
