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
/**
 * 流错误重试窗口上限 10 分钟；取升级后或首次重试窗口。
 */
var MAX_RETRY_WINDOW_MS = 600000;
//@ chunk-gr2vfhah.js:672-739 placement
/**
 * 导出函数 `retryWindowFor`：参数 e，返回 e.escalated ? e.retryWindowMs : e.firstWindowMs。
 */
function retryWindowFor(deadline) {
  return deadline.escalated ? deadline.retryWindowMs : deadline.firstWindowMs;
}
//@ chunk-gr2vfhah.js:739-946 placement
class StreamNoResponseError extends Error {
  deadline;
  sleptMs;
  code = "StreamNoResponse";
  constructor(deadline, sleptMs) {
    super("No response from API within the first-byte window");
    this.deadline = deadline;
    this.sleptMs = sleptMs;
    this.name = "StreamNoResponseError";
  }
}
//@ chunk-gr2vfhah.js:946-1029 placement
/**
 * 导出函数 `findStreamNoResponseError`：参数 e，返回 t instanceof StreamNoResponseError ? t : void 0。
 */
function findStreamNoResponseError(error) {
  let inCauseChain = findInCauseChain(error, (cause) => cause instanceof StreamNoResponseError);
  return inCauseChain instanceof StreamNoResponseError ? inCauseChain : undefined;
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
  constructor(blockState) {
    super("Content block not found");
    this.name = "StreamMalformedEventError";
    this.blockState = blockState;
    if (blockState === "closed") this.message = "Content block already closed";
    if (blockState === "unreadable") this.message = "Stream event unreadable";
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
  connDetails,
  isStaleConnection,
  isContextHintSse,
  streamIdleAborted,
  noEvents,
  malformedStream,
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
  findStreamNoResponseError,
  retryWindowFor,
  MAX_RETRY_WINDOW_MS,
  StreamNoResponseError,
};
