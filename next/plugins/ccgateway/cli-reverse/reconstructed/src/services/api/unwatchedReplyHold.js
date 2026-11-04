/**
 * services/api/unwatchedReplyHold.ts
 *
 * 2.1.316 新增：无人观看时按事件边界暂存流式回复的缓冲器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (6)
 * attribution: placement 6
 */
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import { systemClock } from "../../utils/sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:266151-266416 placement
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
deferInit("chunk-hwmsct5x.js:266151", () => {
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
    },
    (state) => {
      state.isSent = false;
    },
  );
});
//@ chunk-hwmsct5x.js:266416-266503 placement
function heldReplyHoldMs(classKey) {
  return classKey !== undefined && HELD_REPLY_SOURCES.has(classKey)
    ? (env.CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS ?? 0)
    : 0;
}
//@ chunk-hwmsct5x.js:266503-270138 placement
/**
 * 流式回复读取器的缓冲器：在无人观看时按事件边界暂存 SSE 块，到期或结束时一次性交出，统计切分与空闲间隔。
 */
class UnwatchedReplyHold {
  reader;
  holdMs;
  clock;
  held = [];
  heldBytes = 0;
  isBetweenEvents = false;
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
  constructor(reader, holdMs, clock) {
    this.reader = reader;
    this.holdMs = holdMs;
    this.clock = clock;
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
        let canHold = this.isBetweenEvents && !this.holdsNothing;
        let continuedMidEvent = !this.isBetweenEvents && this.chunksRead > 1;
        this.isBetweenEvents = buffer.at(-1) === LF && buffer.at(-2) === LF;
        if ((continuedMidEvent || !this.isBetweenEvents) && !buffer.includes(CR)) this.chunksSplitMidEvent++;
        canHold &&= this.isBetweenEvents && !buffer.includes(CR) && !buffer.includes(UTF8_BOM_BYTES);
        for (
          let offset = !canHold
            ? -1
            : hasPrefix(buffer, 0, EVENT_PREFIX_BYTES)
              ? 0
              : nextEventStart(buffer, 0);
          canHold && offset !== -1;
          offset = nextEventStart(buffer, offset)
        )
          canHold =
            hasPrefix(buffer, offset, CONTENT_BLOCK_DELTA_EVENT_BYTES) ||
            hasPrefix(buffer, offset, PING_EVENT_BYTES);
        let idleGap =
          canHold &&
          (this.cancelHold === undefined
            ? this.clock.monotonicNow() - this.lastHandOverAt > this.holdMs ||
              this.clock.now() - this.lastHandOverWallAt > this.holdMs
            : this.hasStoodStillSinceHandOver(2));
        if (idleGap) this.chunksAfterIdleGap++;
        if (!canHold || idleGap || this.heldBytes >= MAX_HELD_BYTES) {
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
        logFeatureSad("api_unwatched_reply_hold", reason);
      } catch {}
    }
  }
  reportFirstReply() {
    if (heldReplyState.isSent || this.chunksRead === 0 || this.holdsNothing) return;
    try {
      if (isDiskless()) return;
      heldReplyState.isSent = true;
      logFeatureOk("api_unwatched_reply_hold", {
        hold_ms: this.holdMs,
        chunks_read: this.chunksRead,
        pieces_handed_on: this.piecesHandedOn,
        chunks_not_held: this.chunksNotHeld,
        chunks_split_mid_event: this.chunksSplitMidEvent,
        chunks_after_idle_gap: this.chunksAfterIdleGap,
      });
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
//@ chunk-hwmsct5x.js:270138-270231 placement
function wrapWithUnwatchedHold(body, holdMs, clock = systemClock) {
  return new ReadableStream(new UnwatchedReplyHold(body.getReader(), holdMs, clock), {
    highWaterMark: 0,
  });
}
//@ chunk-hwmsct5x.js:270231-270320 placement = hasPrefix (1)
function hasPrefix(src, offset, bytes) {
  return (
    offset + bytes.length <= src.length &&
    src.compare(bytes, 0, bytes.length, offset, offset + bytes.length) === 0
  );
}
//@ chunk-hwmsct5x.js:270320-270380 placement
function nextEventStart(buffer, fromIndex) {
  let index = buffer.indexOf(NEWLINE_EVENT_BYTES, fromIndex);
  return index === -1 ? -1 : index + 1;
}
export { heldReplyHoldMs, wrapWithUnwatchedHold };
