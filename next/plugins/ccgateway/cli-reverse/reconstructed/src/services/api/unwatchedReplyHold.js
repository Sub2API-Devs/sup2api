/**
 * services/api/unwatchedReplyHold.ts
 *
 * 2.1.316 新增：无人观看时按事件边界暂存流式回复的缓冲器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (8)
 * attribution: placement 6, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import { systemClock } from "../../utils/sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:272146-272447 placement
/**
 * 未监视回复暂存流的常量：哪些查询来源的回复要暂存（subagent/auxiliary/compaction）、脉冲/增量事件字节前缀、LF/CR/BOM 字节、最多暂存 256 KB 与发送状态。
 */
var HELD_REPLY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONTENT_BLOCK_DELTA_EVENT_BYTES;
var PING_EVENT_BYTES;
var EVENT_PREFIX_BYTES;
var NEWLINE_EVENT_BYTES;
var LF;
var CR;
var UTF8_BOM_BYTES;
var MAX_HELD_BYTES;
var heldReplyState;
deferInit("chunk-vn3g7zt8.js:272146", () => {
  HELD_REPLY_SOURCES = new Set(["subagent", "auxiliary", "compaction"]);
  CONTENT_BLOCK_DELTA_EVENT_BYTES = Buffer.from(`event: content_block_delta
`);
  PING_EVENT_BYTES = Buffer.from(`event: ping
`);
  EVENT_PREFIX_BYTES = Buffer.from("event");
  NEWLINE_EVENT_BYTES = Buffer.from(`
event`);
  LF = 10;
  CR = 13;
  UTF8_BOM_BYTES = Buffer.from("\uFEFF");
  MAX_HELD_BYTES = 262144;
  heldReplyState = identity(
    {
      isSent: false,
      isSentForMain: false,
    },
    (state) => {
      state.isSent = false;
      state.isSentForMain = false;
    },
  );
});
//@ chunk-vn3g7zt8.js:272447-272534 placement
function heldReplyHoldMs(classKey) {
  return classKey !== undefined && HELD_REPLY_SOURCES.has(classKey)
    ? (env.CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS ?? 0)
    : 0;
}
//@ chunk-vn3g7zt8.js:272534-272599 layout
function mainReplyHoldMs() {
  return isRemoteManagedEnvironment() ? (env.CLAUDE_CODE_MAIN_REPLY_HOLD_MS ?? 0) : 0;
}
//@ chunk-vn3g7zt8.js:272599-276695 placement
/**
 * 流式回复读取器的缓冲器：在无人观看时按事件边界暂存 SSE 块，到期或结束时一次性交出，统计切分与空闲间隔。
 */
class UnwatchedReplyHold {
  reader;
  holdMs;
  clock;
  isMainReply;
  held = [];
  heldBytes = 0;
  isBetweenEvents = false;
  isBeforeBlocksFirstPiece = true;
  holdsNothing = false;
  isReading = false;
  isDue = false;
  ending;
  isCancelled = false;
  cancelHold;
  chunksRead = 0;
  piecesHandedOn = 0;
  chunksNotHeld = 0;
  chunksSplitMidEvent = 0;
  chunksAfterIdleGap = 0;
  lastHandOverAt = Number.NEGATIVE_INFINITY;
  lastHandOverWallAt = Number.NEGATIVE_INFINITY;
  pulling;
  constructor(reader, holdMs, clock, isMainReply) {
    this.reader = reader;
    this.holdMs = holdMs;
    this.clock = clock;
    this.isMainReply = isMainReply;
  }
  pull(controller) {
    return new Promise((resolve) => {
      this.pulling = {
        controller,
        done: resolve,
      };
      if (this.isDue) this.handOver();
      else if (!this.isReading) this.read();
    });
  }
  cancel(reason) {
    this.isCancelled = true;
    this.held = [];
    this.cancelHold?.();
    this.cancelHold = undefined;
    this.pulling?.done();
    this.pulling = undefined;
    this.reportFirstReply();
    return this.reader.cancel(reason);
  }
  read() {
    this.isReading = true;
    try {
      this.reader.read().then(this.onRead, this.onReadFailed);
    } catch (error) {
      this.onReadFailed(error);
    }
  }
  onRead = (result) => {
    this.isReading = false;
    if (this.isCancelled) return;
    try {
      if (result.done) {
        this.ending = {
          failed: false,
        };
        this.handOver();
        return;
      }
      let chunk = result.value;
      if (chunk.byteLength > 0) {
        this.chunksRead++;
        this.held.push(chunk);
        this.heldBytes += chunk.byteLength;
        let buffer = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        let candidateHold = this.isBetweenEvents && !this.holdsNothing;
        let continuedMidEvent = !this.isBetweenEvents && this.chunksRead > 1;
        this.isBetweenEvents = buffer.at(-1) === LF && buffer.at(-2) === LF;
        if ((continuedMidEvent || !this.isBetweenEvents) && !buffer.includes(CR)) this.chunksSplitMidEvent++;
        candidateHold &&= this.isBetweenEvents && !buffer.includes(CR) && !buffer.includes(UTF8_BOM_BYTES);
        let sawContentDelta = false;
        for (
          let offset = !candidateHold
            ? -1
            : hasPrefix(buffer, 0, EVENT_PREFIX_BYTES)
              ? 0
              : nextEventStart(buffer, 0);
          candidateHold && offset !== -1;
          offset = nextEventStart(buffer, offset)
        ) {
          let isContentDelta = hasPrefix(buffer, offset, CONTENT_BLOCK_DELTA_EVENT_BYTES);
          sawContentDelta ||= isContentDelta;
          candidateHold = isContentDelta || hasPrefix(buffer, offset, PING_EVENT_BYTES);
        }
        let idleGap =
          candidateHold &&
          (this.cancelHold === undefined
            ? this.clock.monotonicNow() - this.lastHandOverAt > this.holdMs ||
              this.clock.now() - this.lastHandOverWallAt > this.holdMs
            : this.hasStoodStillSinceHandOver(2));
        if (idleGap) this.chunksAfterIdleGap++;
        let beforeFirstPiece = false;
        if (this.isMainReply)
          if (candidateHold) {
            beforeFirstPiece = this.isBeforeBlocksFirstPiece && sawContentDelta;
            this.isBeforeBlocksFirstPiece &&= !sawContentDelta;
          } else
            this.isBeforeBlocksFirstPiece = !(
              !buffer.includes(CR) &&
              !buffer.includes(UTF8_BOM_BYTES) &&
              hasPrefix(buffer, buffer.lastIndexOf(NEWLINE_EVENT_BYTES) + 1, CONTENT_BLOCK_DELTA_EVENT_BYTES)
            );
        if (!candidateHold || idleGap || beforeFirstPiece || this.heldBytes >= MAX_HELD_BYTES) {
          this.chunksNotHeld++;
          this.handOver();
          return;
        }
        this.cancelHold ??= this.clock.setTimeout(this.onHoldOver, this.holdMs);
      }
      if (this.pulling !== undefined) this.read();
    } catch (error) {
      this.noteOwnThrow(error, "chunk_handling_threw");
      if (this.held.length > 0) this.handOver();
      else {
        this.letGoOfBody(error);
        this.onReadFailed(error);
      }
    }
  };
  onReadFailed = (error) => {
    this.isReading = false;
    this.ending = {
      failed: true,
      error,
    };
    this.handOver();
  };
  onHoldOver = () => {
    try {
      if (this.hasStoodStillSinceHandOver(3)) {
        this.cancelHold = undefined;
        return;
      }
    } catch (error) {
      this.noteOwnThrow(error, "hold_timer_threw");
    }
    this.handOver();
  };
  hasStoodStillSinceHandOver(factor) {
    let elapsedMs = this.clock.monotonicNow() - this.lastHandOverAt;
    return (
      this.clock.now() - this.lastHandOverWallAt - elapsedMs > this.holdMs || elapsedMs > factor * this.holdMs
    );
  }
  noteOwnThrow(error, reason) {
    if (!this.holdsNothing) {
      this.holdsNothing = true;
      try {
        logError(toError(error));
        if (this.isMainReply) logFeatureSad("api_main_reply_hold", reason);
        else logFeatureSad("api_unwatched_reply_hold", reason);
      } catch {}
    }
  }
  reportFirstReply() {
    if (
      (this.isMainReply ? heldReplyState.isSentForMain : heldReplyState.isSent) ||
      this.chunksRead === 0 ||
      this.holdsNothing
    )
      return;
    try {
      if (isDiskless()) return;
      let chunksRead = {
        hold_ms: this.holdMs,
        chunks_read: this.chunksRead,
        pieces_handed_on: this.piecesHandedOn,
        chunks_not_held: this.chunksNotHeld,
        chunks_split_mid_event: this.chunksSplitMidEvent,
        chunks_after_idle_gap: this.chunksAfterIdleGap,
      };
      if (this.isMainReply) {
        heldReplyState.isSentForMain = true;
        logFeatureOk("api_main_reply_hold", chunksRead);
      } else {
        heldReplyState.isSent = true;
        logFeatureOk("api_unwatched_reply_hold", chunksRead);
      }
    } catch (error) {
      try {
        logError(toError(error));
      } catch {}
    }
  }
  handOver() {
    let cancelHold = this.cancelHold;
    this.cancelHold = undefined;
    cancelHold?.();
    this.isDue = true;
    if (this.pulling === undefined) return;
    let { controller, done } = this.pulling;
    this.pulling = undefined;
    try {
      if (this.held.length > 0) {
        let [first, ...others] = this.held;
        let payload = first !== undefined && others.length === 0 ? first : Buffer.concat(this.held);
        this.held = [];
        this.heldBytes = 0;
        this.isDue = this.ending !== undefined;
        controller.enqueue(payload);
        this.piecesHandedOn++;
        this.lastHandOverAt = this.clock.monotonicNow();
        this.lastHandOverWallAt = this.clock.now();
      } else if (this.ending?.failed) {
        controller.error(this.ending.error);
        this.reportFirstReply();
      } else if (this.ending !== undefined) {
        controller.close();
        this.reportFirstReply();
      }
    } catch (error) {
      try {
        controller.error(error);
      } catch {}
      done();
      this.letGoOfBody(error);
      this.noteOwnThrow(error, "hand_over_threw");
      return;
    }
    done();
  }
  letGoOfBody(reason) {
    try {
      this.reader.cancel(reason).catch(() => {});
    } catch {}
  }
}
//@ chunk-vn3g7zt8.js:276695-276791 layout
function wrapWithUnwatchedHold(body, holdMs, clock = systemClock) {
  return new ReadableStream(new UnwatchedReplyHold(body.getReader(), holdMs, clock, false), {
    highWaterMark: 0,
  });
}
//@ chunk-vn3g7zt8.js:276791-276887 placement
function wrapWithUnwatchedHold_2(body, holdMs, clock = systemClock) {
  return new ReadableStream(new UnwatchedReplyHold(body.getReader(), holdMs, clock, true), {
    highWaterMark: 0,
  });
}
//@ chunk-vn3g7zt8.js:276887-276976 placement (2.1.88 match: hasPrefix, 1)
function hasPrefix(src, offset, bytes) {
  return (
    offset + bytes.length <= src.length &&
    src.compare(bytes, 0, bytes.length, offset, offset + bytes.length) === 0
  );
}
//@ chunk-vn3g7zt8.js:276976-277036 placement
function nextEventStart(buffer, fromIndex) {
  let index = buffer.indexOf(NEWLINE_EVENT_BYTES, fromIndex);
  return index === -1 ? -1 : index + 1;
}
export { mainReplyHoldMs, heldReplyHoldMs, wrapWithUnwatchedHold_2, wrapWithUnwatchedHold };
