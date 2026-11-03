/**
 * services/api/unwatchedReplyHold.ts
 *
 * 2.1.316 新增：无人观看时按事件边界暂存流式回复的缓冲器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: placement 4
 */
import {
  LF,
  CR,
  UTF8_BOM_BYTES,
  EVENT_PREFIX_BYTES,
  CONTENT_BLOCK_DELTA_EVENT_BYTES,
  PING_EVENT_BYTES,
  MAX_HELD_BYTES,
  heldReplyState,
  NEWLINE_EVENT_BYTES,
} from "./requestHeaders.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import { Aa } from "../../utils/sleep.js";

/**
 * 流式回复读取器的缓冲器：在无人观看时按事件边界暂存 SSE 块，到期或结束时一次性交出，统计切分与空闲间隔。
 */
//@ chunk-hwmsct5x.js:266503-270138 placement
class UnwatchedReplyHold {
  reader;
  holdMs;
  clock;
  held = [];
  heldBytes = 0;
  isBetweenEvents = !1;
  holdsNothing = !1;
  isReading = !1;
  isDue = !1;
  ending;
  isCancelled = !1;
  cancelHold;
  chunksRead = 0;
  piecesHandedOn = 0;
  chunksNotHeld = 0;
  chunksSplitMidEvent = 0;
  chunksAfterIdleGap = 0;
  lastHandOverAt = Number.NEGATIVE_INFINITY;
  lastHandOverWallAt = Number.NEGATIVE_INFINITY;
  pulling;
  constructor(e, n, r) {
    this.reader = e;
    this.holdMs = n;
    this.clock = r;
  }
  pull(e) {
    return new Promise((n) => {
      if (((this.pulling = { controller: e, done: n }), this.isDue)) this.handOver();
      else if (!this.isReading) this.read();
    });
  }
  cancel(e) {
    return (
      (this.isCancelled = !0),
      (this.held = []),
      this.cancelHold?.(),
      (this.cancelHold = void 0),
      this.pulling?.done(),
      (this.pulling = void 0),
      this.reportFirstReply(),
      this.reader.cancel(e)
    );
  }
  read() {
    this.isReading = !0;
    try {
      this.reader.read().then(this.onRead, this.onReadFailed);
    } catch (error) {
      this.onReadFailed(error);
    }
  }
  onRead = (e) => {
    if (((this.isReading = !1), this.isCancelled)) return;
    try {
      if (e.done) {
        ((this.ending = { failed: !1 }), this.handOver());
        return;
      }
      let n = e.value;
      if (n.byteLength > 0) {
        (this.chunksRead++, this.held.push(n), (this.heldBytes += n.byteLength));
        let buffer = Buffer.from(n.buffer, n.byteOffset, n.byteLength),
          s = this.isBetweenEvents && !this.holdsNothing,
          h = !this.isBetweenEvents && this.chunksRead > 1;
        if (
          ((this.isBetweenEvents = buffer.at(-1) === LF && buffer.at(-2) === LF),
          (h || !this.isBetweenEvents) && !buffer.includes(CR))
        )
          this.chunksSplitMidEvent++;
        s &&= this.isBetweenEvents && !buffer.includes(CR) && !buffer.includes(UTF8_BOM_BYTES);
        for (
          let w = !s ? -1 : hasPrefix(buffer, 0, EVENT_PREFIX_BYTES) ? 0 : dh(buffer, 0);
          s && w !== -1;
          w = dh(buffer, w)
        )
          s = hasPrefix(buffer, w, CONTENT_BLOCK_DELTA_EVENT_BYTES) || hasPrefix(buffer, w, PING_EVENT_BYTES);
        let y =
          s &&
          (this.cancelHold === void 0
            ? this.clock.monotonicNow() - this.lastHandOverAt > this.holdMs ||
              this.clock.now() - this.lastHandOverWallAt > this.holdMs
            : this.hasStoodStillSinceHandOver(2));
        if (y) this.chunksAfterIdleGap++;
        if (!s || y || this.heldBytes >= MAX_HELD_BYTES) {
          (this.chunksNotHeld++, this.handOver());
          return;
        }
        this.cancelHold ??= this.clock.setTimeout(this.onHoldOver, this.holdMs);
      }
      if (this.pulling !== void 0) this.read();
    } catch (error) {
      if ((this.noteOwnThrow(error, "chunk_handling_threw"), this.held.length > 0)) this.handOver();
      else (this.letGoOfBody(error), this.onReadFailed(error));
    }
  };
  onReadFailed = (e) => {
    ((this.isReading = !1), (this.ending = { failed: !0, error: e }), this.handOver());
  };
  onHoldOver = () => {
    try {
      if (this.hasStoodStillSinceHandOver(3)) {
        this.cancelHold = void 0;
        return;
      }
    } catch (error) {
      this.noteOwnThrow(error, "hold_timer_threw");
    }
    this.handOver();
  };
  hasStoodStillSinceHandOver(e) {
    let n = this.clock.monotonicNow() - this.lastHandOverAt;
    return this.clock.now() - this.lastHandOverWallAt - n > this.holdMs || n > e * this.holdMs;
  }
  noteOwnThrow(e, n) {
    if (!this.holdsNothing) {
      this.holdsNothing = !0;
      try {
        (logError(toError(e)), logFeatureSad("api_unwatched_reply_hold", n));
      } catch {}
    }
  }
  reportFirstReply() {
    if (heldReplyState.isSent || this.chunksRead === 0 || this.holdsNothing) return;
    try {
      if (isDiskless()) return;
      ((heldReplyState.isSent = !0),
        logFeatureOk("api_unwatched_reply_hold", {
          hold_ms: this.holdMs,
          chunks_read: this.chunksRead,
          pieces_handed_on: this.piecesHandedOn,
          chunks_not_held: this.chunksNotHeld,
          chunks_split_mid_event: this.chunksSplitMidEvent,
          chunks_after_idle_gap: this.chunksAfterIdleGap,
        }));
    } catch (error) {
      try {
        logError(toError(error));
      } catch {}
    }
  }
  handOver() {
    let cancelHold = this.cancelHold;
    if (((this.cancelHold = void 0), cancelHold?.(), (this.isDue = !0), this.pulling === void 0)) return;
    let { controller: controller, done: r } = this.pulling;
    this.pulling = void 0;
    try {
      if (this.held.length > 0) {
        let [s, ...h] = this.held,
          y = s !== void 0 && h.length === 0 ? s : Buffer.concat(this.held);
        ((this.held = []),
          (this.heldBytes = 0),
          (this.isDue = this.ending !== void 0),
          controller.enqueue(y),
          this.piecesHandedOn++,
          (this.lastHandOverAt = this.clock.monotonicNow()),
          (this.lastHandOverWallAt = this.clock.now()));
      } else if (this.ending?.failed) (controller.error(this.ending.error), this.reportFirstReply());
      else if (this.ending !== void 0) (controller.close(), this.reportFirstReply());
    } catch (error) {
      try {
        controller.error(error);
      } catch {}
      (r(), this.letGoOfBody(error), this.noteOwnThrow(error, "hand_over_threw"));
      return;
    }
    r();
  }
  letGoOfBody(e) {
    try {
      this.reader.cancel(e).catch(() => {});
    } catch {}
  }
}
//@ chunk-hwmsct5x.js:270138-270231 placement
function hh(e, n, r = Aa) {
  return new ReadableStream(new UnwatchedReplyHold(e.getReader(), n, r), { highWaterMark: 0 });
}
//@ chunk-hwmsct5x.js:270231-270320 placement = hasPrefix (1)
function hasPrefix(e, n, r) {
  return n + r.length <= e.length && e.compare(r, 0, r.length, n, n + r.length) === 0;
}
//@ chunk-hwmsct5x.js:270320-270380 placement
function dh(e, n) {
  let index = e.indexOf(NEWLINE_EVENT_BYTES, n);
  return index === -1 ? -1 : index + 1;
}

export { hh };
