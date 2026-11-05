/**
 * utils/messageKinds.ts
 *
 * 2.1.316 新增：是否为不进入转录的临时消息；消息内部标记符号与流事件类型表等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-exfmq47h.js:612526-612581 placement
var TRANSIENT_MESSAGE_TYPES = ["compact_progress", "sdk_status", "stream_mode"];
//@ chunk-exfmq47h.js:612581-612600 placement
var transientMessageTypeSet = new Set(TRANSIENT_MESSAGE_TYPES);
//@ chunk-exfmq47h.js:612600-612638 placement
/**
 * 判断消息是否为不进入转录的临时类型。
 */
function isTransientMessage(streamEvent) {
  return transientMessageTypeSet.has(streamEvent.type);
}
//@ chunk-exfmq47h.js:612638-612907 placement
/**
 * 消息内部标记符号与流事件类型表。
 */
var MESSAGE_MARK_SYMBOLS_2 = Symbol("apiErrorOrigin");
var MESSAGE_MARK_SYMBOLS = Symbol("seenHere");
var restoredTaskMarkSymbol = Symbol("restoredTaskMark");
var storedFormSymbol = Symbol("storedForm");
var BUILT_IN_TOOL_RUN_SYMBOL = Symbol("builtInToolRun");
var replacedTurnStartSymbol = Symbol("replacedTurnStart");
var inputAsWrittenSymbol = Symbol("inputAsWritten");
var STREAM_EVENT_TYPES = [
  "stream_event",
  "stream_request_start",
  "response_length",
  ...TRANSIENT_MESSAGE_TYPES,
];
//@ chunk-exfmq47h.js:612907-612926 placement
var streamEventTypeSet = new Set(STREAM_EVENT_TYPES);
//@ chunk-exfmq47h.js:612926-612964 placement
/**
 * 是否为流事件类型。
 */
function isStreamEvent(message) {
  return streamEventTypeSet.has(message.type);
}
//@ chunk-exfmq47h.js:612964-613504 placement
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
  inputAsWrittenSymbol,
  restoredTaskMarkSymbol,
  isStreamEvent,
  isTransientMessage,
  storedFormSymbol,
  MESSAGE_MARK_SYMBOLS,
  MESSAGE_MARK_SYMBOLS_2,
  isTransientMessage_2,
  BUILT_IN_TOOL_RUN_SYMBOL,
  replacedTurnStartSymbol,
};
