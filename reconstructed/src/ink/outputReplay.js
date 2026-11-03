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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { string } from "../../vendor/zod/v4/classic/schemas.js";
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
import { init_react_production, qt } from "../../vendor/react/cjs/react.production.js";
import { serializeScreenRow } from "./output.js";

//@ chunk-ag5x7vhf.js:11164-11179 placement
/**
 * 空函数，用作“没有输出回放句柄”时的占位。
 */
function noop_3() {}
//@ chunk-ag5x7vhf.js:11179-11423 placement
/**
 * 持有当前输出回放句柄：attach 时替换并转发其订阅事件，返回解除函数；subscribe 订阅句柄变化通知。
 */
class ReplayHandleSlot {
  #e = null;
  #t = noop_3;
  #o = createSignal();
  get handle() {
    return this.#e;
  }
  attach = (m) => {
    this.#n(m);
    return () => {
      if (this.#e === m) this.#n(null);
    };
  };
  subscribe = (m) => this.#o.subscribe(m);
  #n(m) {
    if (m === this.#e) return;
    this.#t();
    this.#e = m;
    this.#t = m ? m.subscribe(this.#o.emit) : noop_3;
  }
}
//@ chunk-ag5x7vhf.js:11423-11472 placement
/**
 * 全屏输出回放用的 ANSI 常量：复位、擦到行尾、每批回放行数 100、原生历史行上限 1 万，以及顶部/底部装饰占用行数 4。
 */
var ANSI_RESET = "\x1B[0m";
var CLEAR_TO_EOL = "\x1B[K";
var HISTORY_PUMP_BATCH = 100;
var MAX_NATIVE_HISTORY_ROWS = 1e4;
var CHROME_ROWS = 4;
//@ chunk-ag5x7vhf.js:11472-17834 placement
/**
 * 全屏模式的输出回放写入器：记录上一帧，支持同步更新、挂起/恢复与"replay/adjust"重放策略。
 */
class ScreenReplayWriter {
  out;
  cols;
  rows;
  onWrite;
  buf = "";
  lastFrame = "";
  syncOpen = false;
  suspended = false;
  restored = false;
  tailSlack = 0;
  contentOverlayRows = 0;
  overlayRatchet = 0;
  onScreen = [];
  replayPending = false;
  committedTop = 0;
  nativeHistory = [];
  pumpCursor = -1;
  _backfillNeeded = false;
  _gapRange = null;
  _suspendedCols = 0;
  _suspendedRows = 0;
  contentHeight;
  constructor(out, cols, rows, onWrite) {
    this.out = out;
    this.cols = cols;
    this.rows = rows;
    this.onWrite = onWrite;
    this.contentHeight = Math.max(2, rows - CHROME_ROWS);
  }
  setup() {
    this.resetTransientState();
    this.buf += HIDE_CURSOR;
    this.buf += repeatString(
      `
`,
      this.rows - this.contentHeight,
    );
    this.buf += setScrollRegion(1, Math.max(2, this.contentHeight));
    for (let contentHeight = this.contentHeight; contentHeight < this.rows; contentHeight++)
      this.clearLine(contentHeight);
    this.commitImmediate();
  }
  suspend() {
    this.suspended = true;
    this._suspendedCols = this.cols;
    this._suspendedRows = this.rows;
    this.buf += RESET_SCROLL_REGION;
    this.commitImmediate();
  }
  resume(m, h) {
    this.suspended = false;
    let x = m !== this._suspendedCols || h !== this._suspendedRows;
    this.cols = m;
    this.rows = h;
    this.contentHeight = Math.max(2, h - CHROME_ROWS);
    this.buf += HIDE_CURSOR;
    this.buf += setScrollRegion(1, this.contentHeight);
    this.buf += CURSOR_HOME;
    if (x) {
      this.buf += ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME;
      this.resetTransientState();
      this.replayPending = true;
      this.pumpCursor = this.nativeHistory.length > 0 ? 0 : -1;
      this.lastFrame = "";
    }
    this.commitImmediate();
  }
  restore() {
    if (this.restored) return;
    this.restored = true;
    this.buf += ANSI_RESET;
    for (let contentHeight = this.contentHeight; contentHeight < this.rows; contentHeight++)
      this.clearLine(contentHeight);
    this.buf += RESET_SCROLL_REGION;
    this.buf += cursorPosition(this.contentHeight + 1, 1);
    this.buf += SHOW_CURSOR;
    this.commitImmediate();
  }
  syncViewport(m, h) {
    if (this.suspended) return;
    if (this.pumpCursor >= 0) return;
    if (!this.syncOpen && isSynchronizedOutputSupported()) {
      this.buf += BSU;
      this.syncOpen = true;
    }
    this.restoreUnderContentOverlay();
    if (this.replayPending) {
      this.replayPending = false;
      this.committedTop = Math.min(m.scrollTop, m.transcriptEnd);
    }
    let min = Math.min(m.scrollTop, m.transcriptEnd);
    let max = Math.max(0, min - this.committedTop);
    if (max > 0) {
      let min_2 = Math.min(max, this.onScreen.length);
      if (min_2 > 0) {
        this.buf += cursorPosition(this.contentHeight, 1);
        this.buf += `
`.repeat(min_2);
        for (let idx = 0; idx < min_2; idx++) this.nativeHistory.push(this.onScreen.shift());
        if (this.nativeHistory.length > MAX_NATIVE_HISTORY_ROWS)
          this.nativeHistory.splice(0, this.nativeHistory.length - MAX_NATIVE_HISTORY_ROWS);
      }
      let V = this.committedTop + min_2;
      this.committedTop = min;
      if (V < min)
        this._gapRange = {
          from: V,
          to: min,
        };
      if (this.nativeHistory.length === 0 && min > 0) this._backfillNeeded = true;
    }
    if (h !== this.contentHeight) {
      this.contentHeight = h;
      this.buf += setScrollRegion(1, Math.max(2, h));
    }
    let max_2 = Math.max(0, this.committedTop - m.scrollTop);
    let contentHeight = this.contentHeight;
    let min_2 = Math.min(m.lines.length, contentHeight);
    let max_3 = Math.max(0, min_2 - max_2);
    let max_4 = Math.max(0, contentHeight - this.onScreen.length);
    if (this.onScreen.length > contentHeight) this.onScreen.length = contentHeight;
    while (this.onScreen.length < contentHeight) this.onScreen.push("");
    for (let idx = 0; idx < contentHeight; idx++) {
      let V = idx < max_3 ? m.lines[max_2 + idx] : "";
      if (idx < contentHeight - max_4 && this.onScreen[idx] === V) continue;
      this.buf += cursorPosition(idx + 1, 1) + V + ANSI_RESET + CLEAR_TO_EOL;
      this.onScreen[idx] = V;
    }
    this.tailSlack = Math.max(0, contentHeight - max_3);
  }
  draw(m) {
    if (this.suspended) return;
    let syncOpen = this.syncOpen;
    if (!this.syncOpen && isSynchronizedOutputSupported()) this.buf += BSU;
    let x = this.buf.length;
    this.buf += HIDE_CURSOR;
    this.restoreUnderContentOverlay();
    if (m.contentHeight !== this.contentHeight) {
      this.contentHeight = m.contentHeight;
      this.buf += setScrollRegion(1, Math.max(2, m.contentHeight));
    }
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
      for (let idx = max + T; idx < this.rows; idx++) this.clearLine(idx);
      this.contentOverlayRows = Math.max(0, this.contentHeight - Math.max(0, max - 1));
    } else {
      this.overlayRatchet = 0;
      this.contentOverlayRows = 0;
    }
    let sliced = this.buf.slice(x);
    if (!syncOpen && sliced === this.lastFrame) {
      this.buf = "";
      this.syncOpen = false;
      return;
    }
    this.lastFrame = sliced;
    if (isSynchronizedOutputSupported()) this.buf += ESU;
    this.syncOpen = false;
    this.commitImmediate();
  }
  computeLayout(m, overlayLines) {
    let max = Math.max(CHROME_ROWS, m.length);
    return {
      contentHeight: Math.max(2, this.rows - max),
      bottomTop: this.rows - max,
      bottomLines: m,
      overlayLines,
    };
  }
  handleResize(m, h) {
    if (m === this.cols && h === this.rows) return "noop";
    if (this.suspended) {
      this.cols = m;
      this.rows = h;
      return "noop";
    }
    let x = m !== this.cols;
    let rows = this.rows;
    this.cols = m;
    this.rows = h;
    let max = Math.max(2, h - CHROME_ROWS);
    this.contentHeight = max;
    if (x || h < rows) {
      this.buf += RESET_SCROLL_REGION + ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME;
      this.buf += setScrollRegion(1, Math.max(2, max));
      this.resetTransientState();
      this.replayPending = true;
      this.pumpCursor = this.nativeHistory.length > 0 ? 0 : -1;
      this.lastFrame = "";
      this.commitImmediate();
      return "replay";
    }
    this.buf += setScrollRegion(1, Math.max(2, max));
    this.lastFrame = "";
    this.commitImmediate();
    return "adjust";
  }
  tickPump() {
    if (this.pumpCursor < 0) return false;
    let nativeHistory = this.nativeHistory;
    this.buf += setScrollRegion(1, 2);
    let min = Math.min(this.pumpCursor + HISTORY_PUMP_BATCH, nativeHistory.length);
    for (; this.pumpCursor < min; this.pumpCursor++) {
      this.buf += cursorPosition(1, 1) + nativeHistory[this.pumpCursor] + ANSI_RESET + CLEAR_TO_EOL;
      this.buf +=
        cursorPosition(2, 1) +
        `
`;
    }
    this.buf += setScrollRegion(1, Math.max(2, this.contentHeight));
    this.lastFrame = "";
    this.commitImmediate();
    if (this.pumpCursor >= nativeHistory.length) this.pumpCursor = -1;
    return this.pumpCursor >= 0;
  }
  consumeBackfillNeeded() {
    if (!this._backfillNeeded) return false;
    this._backfillNeeded = false;
    return true;
  }
  consumeGapRange() {
    let _gapRange = this._gapRange;
    this._gapRange = null;
    return _gapRange;
  }
  primeBackfill(m) {
    if (m.length === 0) return;
    let h = this.nativeHistory.length;
    for (let x of m) this.nativeHistory.push(x);
    if (this.nativeHistory.length > MAX_NATIVE_HISTORY_ROWS) {
      let x = this.nativeHistory.length - MAX_NATIVE_HISTORY_ROWS;
      this.nativeHistory.splice(0, x);
      this.pumpCursor = Math.max(0, h - x);
    } else this.pumpCursor = h;
    this.replayPending = true;
    if (h > 0) this.onScreen.length = 0;
  }
  switchTranscript() {
    this.buf += RESET_SCROLL_REGION + ERASE_SCREEN + ERASE_SCROLLBACK;
    this.buf += CURSOR_HOME;
    this.buf += setScrollRegion(1, Math.max(2, this.contentHeight));
    this.resetTransientState();
    this.nativeHistory.length = 0;
    this.pumpCursor = -1;
    this.replayPending = true;
    this.lastFrame = "";
    this.commitImmediate();
  }
  restoreUnderContentOverlay() {
    let contentOverlayRows = this.contentOverlayRows;
    if (contentOverlayRows === 0) return;
    this.contentOverlayRows = 0;
    let contentHeight = this.contentHeight;
    let x = this.onScreen.length;
    for (let idx = 0; idx < contentOverlayRows; idx++) {
      let k = contentHeight - 1 - idx;
      if (k < 0) break;
      this.buf += cursorPosition(k + 1, 1) + ERASE_LINE;
      let _ = x - 1 - idx;
      if (_ >= 0) this.buf += this.onScreen[_] + ANSI_RESET;
    }
  }
  resetTransientState() {
    this.tailSlack = 0;
    this.contentOverlayRows = 0;
    this.overlayRatchet = 0;
    this.onScreen.length = 0;
    this.committedTop = 0;
  }
  clearLine(m) {
    this.buf += cursorPosition(m + 1, 1) + ERASE_LINE;
  }
  writeOverlayLines(m, h) {
    for (let k = 0; k < h.length; k++)
      this.buf += cursorPosition(m + k + 1, 1) + h[k] + ANSI_RESET + CLEAR_TO_EOL;
  }
  commitImmediate() {
    if (this.buf.length === 0) return;
    let startTime = performance.now();
    this.out.write(this.buf);
    this.onWrite?.(startTime, Buffer.byteLength(this.buf));
    this.buf = "";
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
    return {
      tailSlack: this.tailSlack,
      overlayRows: this.contentOverlayRows,
    };
  }
}
//@ chunk-ag5x7vhf.js:17834-17851 placement = RESET (1)
var RESET = "\x1B[0m";
//@ chunk-ag5x7vhf.js:18348-18352 placement
init_react_production();
//@ chunk-ag5x7vhf.js:18352-18368 placement
var ScrollAnchorContext = qt(null);
//@ chunk-ag5x7vhf.js:21878-22079 placement
/**
 * 把某个节点缓存布局覆盖的屏幕行逐行序列化（裁到屏幕高度内）；节点没有布局时返回空数组。
 */
function serializeNodeScreenRows(m, stylePool, x) {
  if (!x) return [];
  let cachedLayout = x.cachedLayout;
  if (!cachedLayout || cachedLayout.height <= 0) return [];
  let k = [];
  let min = Math.min(cachedLayout.y + cachedLayout.height, m.screen.height);
  for (let max = Math.max(0, cachedLayout.y); max < min; max++)
    k.push(serializeScreenRow(m.screen, stylePool, max));
  return k;
}
//@ chunk-ag5x7vhf.js:22079-22083 placement
init_react_production();
export {
  ReplayHandleSlot,
  CHROME_ROWS,
  ScrollAnchorContext,
  ScreenReplayWriter,
  serializeNodeScreenRows,
  RESET,
  MAX_NATIVE_HISTORY_ROWS,
};
