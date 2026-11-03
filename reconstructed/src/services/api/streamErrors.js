/**
 * services/api/streamErrors.ts
 *
 * 流错误类（无响应、无事件、截断、格式错误）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gr2vfhah.js (8)
 * attribution: placement 8
 */
import { findInCauseChain } from "../../utils/errors.js";

//@ chunk-gr2vfhah.js:657-672 placement
var hAi = 600000;
//@ chunk-gr2vfhah.js:672-739 placement
function Poo(e) {
  return e.escalated ? e.retryWindowMs : e.firstWindowMs;
}
//@ chunk-gr2vfhah.js:739-946 placement
class StreamNoResponseError extends Error {
  deadline;
  sleptMs;
  code = "StreamNoResponse";
  constructor(e, t) {
    super("No response from API within the first-byte window");
    this.deadline = e;
    this.sleptMs = t;
    this.name = "StreamNoResponseError";
  }
}
//@ chunk-gr2vfhah.js:946-1029 placement
function Yxn(e) {
  let t = findInCauseChain(e, (r) => r instanceof StreamNoResponseError);
  return t instanceof StreamNoResponseError ? t : void 0;
}
//@ chunk-gr2vfhah.js:11749-11871 placement
class StreamNoEventsError extends Error {
  constructor() {
    super("Stream ended without receiving any events");
    this.name = "StreamNoEventsError";
  }
}
//@ chunk-gr2vfhah.js:11871-12130 placement
class StreamMalformedEventError extends Error {
  blockState;
  constructor(e) {
    super("Content block not found");
    if (((this.name = "StreamMalformedEventError"), (this.blockState = e), e === "closed"))
      this.message = "Content block already closed";
    if (e === "unreadable") this.message = "Stream event unreadable";
  }
}
//@ chunk-gr2vfhah.js:12130-12280 placement
class StreamTruncatedError extends Error {
  code = "StreamTruncated";
  constructor() {
    super("Stream ended before the response was complete");
    this.name = "StreamTruncatedError";
  }
}
//@ chunk-gr2vfhah.js:12280-12659 placement
function classifyStreamError({
  connDetails: connDetails,
  isStaleConnection: isStaleConnection,
  isContextHintSse: isContextHintSse,
  streamIdleAborted: streamIdleAborted,
  noEvents: noEvents,
  malformedStream: malformedStream,
}) {
  if (connDetails?.code === "StreamSuspended") return "stream_suspended";
  if (connDetails?.code === "StreamTruncated") return "stream_truncated";
  if (isStaleConnection) return "stale_connection";
  if (isContextHintSse) return "context_hint_sse";
  if (streamIdleAborted) return "watchdog";
  if (noEvents) return "no_events";
  if (malformedStream) return "malformed_stream";
  return "other";
}

export {
  StreamMalformedEventError,
  StreamTruncatedError,
  StreamNoEventsError,
  classifyStreamError,
  Yxn,
  Poo,
  hAi,
  StreamNoResponseError,
};
