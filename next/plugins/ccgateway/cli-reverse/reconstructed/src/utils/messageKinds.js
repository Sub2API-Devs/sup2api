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
var TRANSIENT_MESSAGE_TYPES = ["compact_progress", "sdk_status", "stream_mode"];
//@ chunk-aepeg2w5.js:600097-600116 placement
var transientMessageTypeSet = new Set(TRANSIENT_MESSAGE_TYPES);
//@ chunk-aepeg2w5.js:600116-600154 placement
/**
 * 判断消息是否为不进入转录的临时类型。
 */
function isTransientMessage(streamEvent) {
  return transientMessageTypeSet.has(streamEvent.type);
}
//@ chunk-aepeg2w5.js:600154-600394 placement
/**
 * 消息内部标记符号与流事件类型表。
 */
var MESSAGE_MARK_SYMBOLS_2 = Symbol("apiErrorOrigin");
var MESSAGE_MARK_SYMBOLS = Symbol("seenHere");
var restoredTaskMarkSymbol = Symbol("restoredTaskMark");
var storedFormSymbol = Symbol("storedForm");
var replacedTurnStartSymbol = Symbol("replacedTurnStart");
var inputAsWrittenSymbol = Symbol("inputAsWritten");
var STREAM_EVENT_TYPES = [
  "stream_event",
  "stream_request_start",
  "response_length",
  ...TRANSIENT_MESSAGE_TYPES,
];
//@ chunk-aepeg2w5.js:600394-600413 placement
var streamEventTypeSet = new Set(STREAM_EVENT_TYPES);
//@ chunk-aepeg2w5.js:600413-600451 placement
/**
 * 是否为流事件类型。
 */
function isStreamEvent(message) {
  return streamEventTypeSet.has(message.type);
}
//@ chunk-aepeg2w5.js:600451-600991 placement
/**
 * 是否为不进入转录的临时消息。
 */
function isTransientMessage_2(message) {
  if (isStreamEvent(message)) return true;
  switch (message.type) {
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
      return true;
    case "user":
    case "assistant":
    case "attachment":
    case "progress":
    case "system":
      return false;
    default: {
      let otherMessage = message;
      return false;
    }
  }
}
export {
  isStreamEvent,
  isTransientMessage,
  inputAsWrittenSymbol,
  MESSAGE_MARK_SYMBOLS_2,
  restoredTaskMarkSymbol,
  MESSAGE_MARK_SYMBOLS,
  storedFormSymbol,
  replacedTurnStartSymbol,
  isTransientMessage_2,
};
