/**
 * utils/messageKinds.ts
 *
 * 2.1.316 新增：是否为不进入转录的临时消息；消息内部标记符号与流事件类型表等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: placement 7
 */

//@ chunk-aepeg2w5.js:600042-600097 placement
var Nm = ["compact_progress", "sdk_status", "stream_mode"];
//@ chunk-aepeg2w5.js:600097-600116 placement
var dW = new Set(Nm);
//@ chunk-aepeg2w5.js:600116-600154 placement
function rki(e) {
  return dW.has(e.type);
}
/**
 * 消息内部标记符号与流事件类型表。
 */
//@ chunk-aepeg2w5.js:600154-600394 placement
var MESSAGE_MARK_SYMBOLS = Symbol("apiErrorOrigin"),
  gge = Symbol("seenHere"),
  B6e = Symbol("restoredTaskMark"),
  hPt = Symbol("storedForm"),
  Yno = Symbol("replacedTurnStart"),
  Xno = Symbol("inputAsWritten"),
  cW = ["stream_event", "stream_request_start", "response_length", ...Nm];
//@ chunk-aepeg2w5.js:600394-600413 placement
var fW = new Set(cW);
/**
 * 是否为流事件类型。
 */
//@ chunk-aepeg2w5.js:600413-600451 placement
function isStreamEvent(e) {
  return fW.has(e.type);
}
/**
 * 是否为不进入转录的临时消息。
 */
//@ chunk-aepeg2w5.js:600451-600991 placement
function isTransientMessage(e) {
  if (isStreamEvent(e)) return !0;
  switch (e.type) {
    case "tombstone":
    case "tool_use_summary":
    case "notification":
    case "set_expanded_view":
    case "post_turn_summary":
    case "active_goal":
    case "set_in_progress_tool_use_ids":
    case "conversation_reset":
    case "hint_clears":
    case "api_metrics":
    case "os_notification":
    case "open_message_selector":
    case "apply_flag_settings":
    case "command_lifecycle":
    case "refusal_continuation":
    case "query_model_change":
      return !0;
    case "user":
    case "assistant":
    case "attachment":
    case "progress":
    case "system":
      return !1;
    default: {
      let n = e;
      return !1;
    }
  }
}

export { isStreamEvent, rki, Xno, MESSAGE_MARK_SYMBOLS, B6e, gge, hPt, Yno, isTransientMessage };
