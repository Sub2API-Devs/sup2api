/**
 * ink/outputReplay.ts
 *
 * 2.1.316 新增：全屏输出回放写入器：记录上一帧，支持同步更新与重放策略。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (9)
 * attribution: placement 9
 */
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { Text } from "./components/Text.js";
import { HIDE_CURSOR, SHOW_CURSOR, BSU, ESU } from "./termio/dec.js";
import { repeatString } from "../utils/stringUtils.js";
import {
  setScrollRegion,
  RESET_SCROLL_REGION,
  CURSOR_HOME,
  ERASE_SCREEN,
  ERASE_SCROLLBACK,
  cursorPosition,
  ERASE_LINE,
} from "./termio/csi.js";
import { isSynchronizedOutputSupported } from "./terminal.js";
import { j, qt } from "../../vendor/react/cjs/react.production.js";
import { serializeScreenRow } from "./output.js";

//@ chunk-ag5x7vhf.js:11164-11179 placement
function $g() {}
/**
 * 持有当前输出回放句柄：attach 时替换并转发其订阅事件，返回解除函数；subscribe 订阅句柄变化通知。
 */
//@ chunk-ag5x7vhf.js:11179-11423 placement
class ReplayHandleSlot {
  #e = null;
  #t = $g;
  #o = createSignal();
  get handle() {
    return this.#e;
  }
  attach = (m) => (
    this.#n(m),
    () => {
      if (this.#e === m) this.#n(null);
    }
  );
  subscribe = (m) => this.#o.subscribe(m);
  #n(m) {
    if (m === this.#e) return;
    (this.#t(), (this.#e = m), (this.#t = m ? m.subscribe(this.#o.emit) : $g));
  }
}
//@ chunk-ag5x7vhf.js:11423-11472 placement
var ANSI_RESET = "\x1B[0m",
  Ru = "\x1B[K",
  kT = 100,
  Hr = 1e4,
  UXe = 4;
/**
 * 全屏模式的输出回放写入器：记录上一帧，支持同步更新、挂起/恢复与"replay/adjust"重放策略。
 */
//@ chunk-ag5x7vhf.js:11472-17834 placement
class ScreenReplayWriter {
  out;
  cols;
  rows;
  onWrite;
  buf = "";
  lastFrame = "";
  syncOpen = !1;
  suspended = !1;
  restored = !1;
  tailSlack = 0;
  contentOverlayRows = 0;
  overlayRatchet = 0;
  onScreen = [];
  replayPending = !1;
  committedTop = 0;
  nativeHistory = [];
  pumpCursor = -1;
  _backfillNeeded = !1;
  _gapRange = null;
  _suspendedCols = 0;
  _suspendedRows = 0;
  contentHeight;
  constructor(m, h, x, T) {
    this.out = m;
    this.cols = h;
    this.rows = x;
    this.onWrite = T;
    this.contentHeight = Math.max(2, x - UXe);
  }
  setup() {
    (this.resetTransientState(),
      (this.buf += HIDE_CURSOR),
      (this.buf += repeatString(
        `
`,
        this.rows - this.contentHeight,
      )),
      (this.buf += setScrollRegion(1, Math.max(2, this.contentHeight))));
    for (let contentHeight = this.contentHeight; contentHeight < this.rows; contentHeight++)
      this.clearLine(contentHeight);
    this.commitImmediate();
  }
  suspend() {
    ((this.suspended = !0),
      (this._suspendedCols = this.cols),
      (this._suspendedRows = this.rows),
      (this.buf += RESET_SCROLL_REGION),
      this.commitImmediate());
  }
  resume(m, h) {
    this.suspended = !1;
    let x = m !== this._suspendedCols || h !== this._suspendedRows;
    if (
      ((this.cols = m),
      (this.rows = h),
      (this.contentHeight = Math.max(2, h - UXe)),
      (this.buf += HIDE_CURSOR),
      (this.buf += setScrollRegion(1, this.contentHeight)),
      (this.buf += CURSOR_HOME),
      x)
    )
      ((this.buf += ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME),
        this.resetTransientState(),
        (this.replayPending = !0),
        (this.pumpCursor = this.nativeHistory.length > 0 ? 0 : -1),
        (this.lastFrame = ""));
    this.commitImmediate();
  }
  restore() {
    if (this.restored) return;
    ((this.restored = !0), (this.buf += ANSI_RESET));
    for (let contentHeight = this.contentHeight; contentHeight < this.rows; contentHeight++)
      this.clearLine(contentHeight);
    ((this.buf += RESET_SCROLL_REGION),
      (this.buf += cursorPosition(this.contentHeight + 1, 1)),
      (this.buf += SHOW_CURSOR),
      this.commitImmediate());
  }
  syncViewport(m, h) {
    if (this.suspended) return;
    if (this.pumpCursor >= 0) return;
    if (!this.syncOpen && isSynchronizedOutputSupported()) ((this.buf += BSU), (this.syncOpen = !0));
    if ((this.restoreUnderContentOverlay(), this.replayPending))
      ((this.replayPending = !1), (this.committedTop = Math.min(m.scrollTop, m.transcriptEnd)));
    let min = Math.min(m.scrollTop, m.transcriptEnd),
      max = Math.max(0, min - this.committedTop);
    if (max > 0) {
      let min_2 = Math.min(max, this.onScreen.length);
      if (min_2 > 0) {
        ((this.buf += cursorPosition(this.contentHeight, 1)),
          (this.buf += `
`.repeat(min_2)));
        for (let W = 0; W < min_2; W++) this.nativeHistory.push(this.onScreen.shift());
        if (this.nativeHistory.length > Hr) this.nativeHistory.splice(0, this.nativeHistory.length - Hr);
      }
      let V = this.committedTop + min_2;
      if (((this.committedTop = min), V < min)) this._gapRange = { from: V, to: min };
      if (this.nativeHistory.length === 0 && min > 0) this._backfillNeeded = !0;
    }
    if (h !== this.contentHeight)
      ((this.contentHeight = h), (this.buf += setScrollRegion(1, Math.max(2, h))));
    let max_2 = Math.max(0, this.committedTop - m.scrollTop),
      contentHeight = this.contentHeight,
      min_2 = Math.min(m.lines.length, contentHeight),
      max_3 = Math.max(0, min_2 - max_2),
      max_4 = Math.max(0, contentHeight - this.onScreen.length);
    if (this.onScreen.length > contentHeight) this.onScreen.length = contentHeight;
    while (this.onScreen.length < contentHeight) this.onScreen.push("");
    for (let L = 0; L < contentHeight; L++) {
      let V = L < max_3 ? m.lines[max_2 + L] : "";
      if (L < contentHeight - max_4 && this.onScreen[L] === V) continue;
      ((this.buf += cursorPosition(L + 1, 1) + V + ANSI_RESET + Ru), (this.onScreen[L] = V));
    }
    this.tailSlack = Math.max(0, contentHeight - max_3);
  }
  draw(m) {
    if (this.suspended) return;
    let syncOpen = this.syncOpen;
    if (!this.syncOpen && isSynchronizedOutputSupported()) this.buf += BSU;
    let x = this.buf.length;
    if (
      ((this.buf += HIDE_CURSOR), this.restoreUnderContentOverlay(), m.contentHeight !== this.contentHeight)
    )
      ((this.contentHeight = m.contentHeight),
        (this.buf += setScrollRegion(1, Math.max(2, m.contentHeight))));
    for (let contentHeight = this.contentHeight; contentHeight < this.rows; contentHeight++)
      this.clearLine(contentHeight);
    if (this.tailSlack > 0) {
      let _ = this.contentHeight - this.tailSlack;
      for (let I = _; I < this.contentHeight; I++) this.clearLine(I);
    }
    this.writeOverlayLines(m.bottomTop, m.bottomLines);
    let T = m.overlayLines.length;
    if (T > 0) {
      this.overlayRatchet = Math.max(this.overlayRatchet, T);
      let max = Math.max(0, this.rows - this.overlayRatchet);
      this.writeOverlayLines(max, m.overlayLines);
      for (let I = max + T; I < this.rows; I++) this.clearLine(I);
      this.contentOverlayRows = Math.max(0, this.contentHeight - Math.max(0, max - 1));
    } else ((this.overlayRatchet = 0), (this.contentOverlayRows = 0));
    let sliced = this.buf.slice(x);
    if (!syncOpen && sliced === this.lastFrame) {
      ((this.buf = ""), (this.syncOpen = !1));
      return;
    }
    if (((this.lastFrame = sliced), isSynchronizedOutputSupported())) this.buf += ESU;
    ((this.syncOpen = !1), this.commitImmediate());
  }
  computeLayout(m, h) {
    let max = Math.max(UXe, m.length);
    return {
      contentHeight: Math.max(2, this.rows - max),
      bottomTop: this.rows - max,
      bottomLines: m,
      overlayLines: h,
    };
  }
  handleResize(m, h) {
    if (m === this.cols && h === this.rows) return "noop";
    if (this.suspended) return ((this.cols = m), (this.rows = h), "noop");
    let x = m !== this.cols,
      rows = this.rows;
    ((this.cols = m), (this.rows = h));
    let max = Math.max(2, h - UXe);
    if (((this.contentHeight = max), x || h < rows))
      return (
        (this.buf += RESET_SCROLL_REGION + ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME),
        (this.buf += setScrollRegion(1, Math.max(2, max))),
        this.resetTransientState(),
        (this.replayPending = !0),
        (this.pumpCursor = this.nativeHistory.length > 0 ? 0 : -1),
        (this.lastFrame = ""),
        this.commitImmediate(),
        "replay"
      );
    return (
      (this.buf += setScrollRegion(1, Math.max(2, max))),
      (this.lastFrame = ""),
      this.commitImmediate(),
      "adjust"
    );
  }
  tickPump() {
    if (this.pumpCursor < 0) return !1;
    let nativeHistory = this.nativeHistory;
    this.buf += setScrollRegion(1, 2);
    let min = Math.min(this.pumpCursor + kT, nativeHistory.length);
    for (; this.pumpCursor < min; this.pumpCursor++)
      ((this.buf += cursorPosition(1, 1) + nativeHistory[this.pumpCursor] + ANSI_RESET + Ru),
        (this.buf +=
          cursorPosition(2, 1) +
          `
`));
    if (
      ((this.buf += setScrollRegion(1, Math.max(2, this.contentHeight))),
      (this.lastFrame = ""),
      this.commitImmediate(),
      this.pumpCursor >= nativeHistory.length)
    )
      this.pumpCursor = -1;
    return this.pumpCursor >= 0;
  }
  consumeBackfillNeeded() {
    if (!this._backfillNeeded) return !1;
    return ((this._backfillNeeded = !1), !0);
  }
  consumeGapRange() {
    let _gapRange = this._gapRange;
    return ((this._gapRange = null), _gapRange);
  }
  primeBackfill(m) {
    if (m.length === 0) return;
    let h = this.nativeHistory.length;
    for (let x of m) this.nativeHistory.push(x);
    if (this.nativeHistory.length > Hr) {
      let x = this.nativeHistory.length - Hr;
      (this.nativeHistory.splice(0, x), (this.pumpCursor = Math.max(0, h - x)));
    } else this.pumpCursor = h;
    if (((this.replayPending = !0), h > 0)) this.onScreen.length = 0;
  }
  switchTranscript() {
    ((this.buf += RESET_SCROLL_REGION + ERASE_SCREEN + ERASE_SCROLLBACK),
      (this.buf += CURSOR_HOME),
      (this.buf += setScrollRegion(1, Math.max(2, this.contentHeight))),
      this.resetTransientState(),
      (this.nativeHistory.length = 0),
      (this.pumpCursor = -1),
      (this.replayPending = !0),
      (this.lastFrame = ""),
      this.commitImmediate());
  }
  restoreUnderContentOverlay() {
    let contentOverlayRows = this.contentOverlayRows;
    if (contentOverlayRows === 0) return;
    this.contentOverlayRows = 0;
    let contentHeight = this.contentHeight,
      x = this.onScreen.length;
    for (let T = 0; T < contentOverlayRows; T++) {
      let k = contentHeight - 1 - T;
      if (k < 0) break;
      this.buf += cursorPosition(k + 1, 1) + ERASE_LINE;
      let _ = x - 1 - T;
      if (_ >= 0) this.buf += this.onScreen[_] + ANSI_RESET;
    }
  }
  resetTransientState() {
    ((this.tailSlack = 0),
      (this.contentOverlayRows = 0),
      (this.overlayRatchet = 0),
      (this.onScreen.length = 0),
      (this.committedTop = 0));
  }
  clearLine(m) {
    this.buf += cursorPosition(m + 1, 1) + ERASE_LINE;
  }
  writeOverlayLines(m, h) {
    for (let x = 0; x < h.length; x++) this.buf += cursorPosition(m + x + 1, 1) + h[x] + ANSI_RESET + Ru;
  }
  commitImmediate() {
    if (this.buf.length === 0) return;
    let startTime = performance.now();
    (this.out.write(this.buf), this.onWrite?.(startTime, Buffer.byteLength(this.buf)), (this.buf = ""));
  }
  _onScreen() {
    return this.onScreen;
  }
  _committedTop() {
    return this.committedTop;
  }
  _pumpCursor() {
    return this.pumpCursor;
  }
  _nativeHistory() {
    return this.nativeHistory;
  }
  _commitForTest() {
    this.commitImmediate();
  }
  _transient() {
    return { tailSlack: this.tailSlack, overlayRows: this.contentOverlayRows };
  }
}
//@ chunk-ag5x7vhf.js:17834-17851 placement = RESET (1)
var RESET = "\x1B[0m";
//@ chunk-ag5x7vhf.js:18348-18352 placement
j();
//@ chunk-ag5x7vhf.js:18352-18368 placement
var ScrollAnchorContext = qt(null);
/**
 * 把某个节点缓存布局覆盖的屏幕行逐行序列化（裁到屏幕高度内）；节点没有布局时返回空数组。
 */
//@ chunk-ag5x7vhf.js:21878-22079 placement
function serializeNodeScreenRows(m, h, x) {
  if (!x) return [];
  let cachedLayout = x.cachedLayout;
  if (!cachedLayout || cachedLayout.height <= 0) return [];
  let k = [],
    min = Math.min(cachedLayout.y + cachedLayout.height, m.screen.height);
  for (let max = Math.max(0, cachedLayout.y); max < min; max++) k.push(serializeScreenRow(m.screen, h, max));
  return k;
}
//@ chunk-ag5x7vhf.js:22079-22083 placement
j();

export { ReplayHandleSlot, UXe, ScrollAnchorContext, RESET, ScreenReplayWriter, serializeNodeScreenRows, Hr };
