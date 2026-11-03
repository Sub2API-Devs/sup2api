/**
 * ink/line-width-cache.ts
 *
 * 并入已有模块：推进输入解析状态机（粘贴、鼠标前缀丢弃），产出按键；超时后刷出未完成的转义序列等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/line-width-cache.ts
 * pieces: chunk-bzr73sfg.js (14)
 * attribution: placement 12, layout 1, callgraph-witnessed 1
 */
import {
  INITIAL_STATE,
  parseMultipleKeypresses,
  isPlausibleIncompleteSequence,
  discardIncompleteInput,
} from "./parse-keypress.js";
import { ESC } from "./termio/ansi.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { env } from "../utils/env.js";
import { logError } from "../utils/log.js";
import { Re } from "../../runtime/bun-runtime.js";
import { zy } from "../../vendor/react-reconciler/cjs/react-reconciler.production.js";
import { bunStringWidth } from "./stringWidth.js";

//@ chunk-bzr73sfg.js:172812-172838 placement
var ESC_FLUSH_TIMEOUT_MS = 50,
  PASTE_FLUSH_TIMEOUT_MS = 2000,
  PARTIAL_PREFIX_DROP_MS = 2000;
/**
 * 新建 stdin 读取器状态：按键解析状态（INITIAL_STATE 的副本）、上次输入时间、UTF-8 字节串截止时间、鼠标前缀丢弃时间、被丢弃前缀的清理时间、是否有迟到读标记。
 */
//@ chunk-bzr73sfg.js:172838-172976 placement
function createInputReaderState(now) {
  return {
    parse: { ...INITIAL_STATE },
    lastInputAt: now,
    byteRunDeadlineAt: null,
    mousePrefixDropAt: null,
    droppedPrefixDropAt: null,
    heldReadLate: !1,
  };
}
//@ chunk-bzr73sfg.js:172976-173027 placement
function isEscPrefixedChunk(text) {
  return text.length > 1 && text.startsWith(ESC);
}
/**
 * 把以 ESC 开头的一段输入拆成单独的 ESC 和其余文本分别解析（用于 ESC 后紧跟文字被合并读入的情况）。
 */
//@ chunk-bzr73sfg.js:173027-173153 placement
function splitEscPrefixedChunk(text) {
  if (!isEscPrefixedChunk(text)) return [];
  return [ESC, text.slice(1)].flatMap((u) => {
    let [f, m] = parseMultipleKeypresses({ ...INITIAL_STATE }, u);
    return f.concat(parseMultipleKeypresses(m, null)[0]);
  });
}
//@ chunk-bzr73sfg.js:173153-173259 placement
function hasPendingInput(reader) {
  let { parse: parse } = reader;
  return parse.incomplete !== "" || parse.mode === "IN_PASTE" || parse.pendingByteEvents.length > 0;
}
/**
 * 推进输入解析状态机（粘贴、鼠标前缀丢弃），产出按键。
 */
//@ chunk-bzr73sfg.js:173259-174416 placement
function feedInputReader(reader, chunk, now, isReadLate = !1) {
  let { parse: parse, droppedPrefixDropAt: droppedPrefixDropAt } = reader;
  if (
    droppedPrefixDropAt !== null &&
    now >= droppedPrefixDropAt &&
    (parse.droppedMousePrefix || parse.flushedEscapePrefix)
  )
    ((parse = { ...parse, droppedMousePrefix: "", flushedEscapePrefix: "" }), (droppedPrefixDropAt = null));
  let prevParse = parse,
    [keys, nextParse] = parseMultipleKeypresses(parse, chunk),
    inPaste = nextParse.mode === "IN_PASTE",
    O = chunk !== null && isReadLate,
    _ =
      O ||
      reader.heldReadLate ||
      (chunk !== null && prevParse.incomplete === ESC && now - reader.lastInputAt >= ESC_FLUSH_TIMEOUT_MS),
    U = chunk === null ? reader.heldReadLate : O,
    markedKeys =
      _ || U
        ? keys.map((q, Y) => (q.kind === "key" && (Y === 0 ? _ : U) ? { ...q, readLate: !0 } : q))
        : keys,
    byteRunDeadlineAt = reader.byteRunDeadlineAt;
  if (nextParse.pendingByteEvents.length === 0) byteRunDeadlineAt = null;
  else if (prevParse.pendingByteEvents !== nextParse.pendingByteEvents || byteRunDeadlineAt === null)
    byteRunDeadlineAt = now + ESC_FLUSH_TIMEOUT_MS;
  let mousePrefixDropAt = reader.mousePrefixDropAt;
  if (!inPaste && isPlausibleIncompleteSequence(nextParse.incomplete)) {
    if (!(
      mousePrefixDropAt !== null &&
      markedKeys.length === 0 &&
      isPlausibleIncompleteSequence(prevParse.incomplete) &&
      nextParse.incomplete.startsWith(prevParse.incomplete)
    ))
      mousePrefixDropAt = now + PARTIAL_PREFIX_DROP_MS;
  } else mousePrefixDropAt = null;
  if (nextParse.droppedMousePrefix || nextParse.flushedEscapePrefix) {
    if (!prevParse.droppedMousePrefix && !prevParse.flushedEscapePrefix)
      droppedPrefixDropAt = now + PARTIAL_PREFIX_DROP_MS;
  } else droppedPrefixDropAt = null;
  let incompleteWait =
      nextParse.incomplete || inPaste
        ? inPaste
          ? PASTE_FLUSH_TIMEOUT_MS
          : mousePrefixDropAt !== null
            ? Math.max(0, mousePrefixDropAt - now)
            : ESC_FLUSH_TIMEOUT_MS
        : null,
    byteRunWait = byteRunDeadlineAt === null || inPaste ? null : Math.max(0, byteRunDeadlineAt - now),
    wait =
      incompleteWait === null
        ? byteRunWait
        : byteRunWait === null
          ? incompleteWait
          : Math.min(incompleteWait, byteRunWait);
  return {
    keys: markedKeys,
    reader: {
      parse: nextParse,
      lastInputAt: chunk === null ? reader.lastInputAt : now,
      byteRunDeadlineAt: byteRunDeadlineAt,
      mousePrefixDropAt: mousePrefixDropAt,
      droppedPrefixDropAt: droppedPrefixDropAt,
      heldReadLate: nextParse.incomplete !== "" && (keys.length === 0 ? _ : U),
    },
    wakeAt: wait === null ? null : now + wait,
  };
}
/**
 * 超时后刷出未完成的转义序列。
 */
//@ chunk-bzr73sfg.js:174416-174812 placement
function flushInputReader(reader, now) {
  if (!hasPendingInput(reader)) return { keys: [], reader: reader, wakeAt: null };
  let f = reader;
  if (
    f.mousePrefixDropAt !== null &&
    now >= f.mousePrefixDropAt &&
    f.parse.mode !== "IN_PASTE" &&
    isPlausibleIncompleteSequence(f.parse.incomplete)
  )
    f = {
      ...f,
      parse: discardIncompleteInput(f.parse),
      mousePrefixDropAt: null,
      droppedPrefixDropAt: now + PARTIAL_PREFIX_DROP_MS,
    };
  if (f.parse.incomplete) {
    let p =
      (f.parse.mode === "IN_PASTE" ? PASTE_FLUSH_TIMEOUT_MS : ESC_FLUSH_TIMEOUT_MS) - (now - f.lastInputAt);
    if (p > 0) return { keys: [], reader: f, wakeAt: now + p };
  }
  return feedInputReader(f, null, now);
}
//@ chunk-bzr73sfg.js:174812-174921 placement
var REAL_CLOCK = {
  now: () => performance.now(),
  after: (n, u) => {
    let f = setTimeout(u, n);
    return (f.unref(), () => clearTimeout(f));
  },
};
/**
 * 监测事件循环延迟（引用计数式开启）。
 */
//@ chunk-bzr73sfg.js:174921-175309 placement
class EventLoopLagWatcher {
  #e;
  #r = 0;
  #t = null;
  #n = 0;
  #i = !1;
  constructor(clock = REAL_CLOCK) {
    this.#e = clock;
  }
  watch() {
    if ((this.#r++, this.#t === null)) ((this.#i = !1), this.#o(this.#e.now()));
    let n = !0;
    return () => {
      if (!n) return;
      if (((n = !1), --this.#r === 0)) (this.#t?.(), (this.#t = null));
    };
  }
  isLate(n) {
    return this.#t !== null && (this.#i || n - this.#n >= ESC_FLUSH_TIMEOUT_MS);
  }
  #o(n) {
    ((this.#n = n + ESC_FLUSH_TIMEOUT_MS), (this.#t = this.#e.after(ESC_FLUSH_TIMEOUT_MS, this.#l)));
  }
  #l = () => {
    let now = this.#e.now();
    ((this.#i = now - this.#n >= ESC_FLUSH_TIMEOUT_MS), this.#o(now));
  };
}
//@ chunk-bzr73sfg.js:175309-175327 placement
var ReactReconcilerModule = Re(zy(), 1);
//@ chunk-bzr73sfg.js:175327-175339 placement
var MAX_LINE_WIDTH_CACHE_SIZE = 4096;
/**
 * 按行字符串缓存显示宽度（bunStringWidth），满 4096 条清空。
 */
//@ chunk-bzr73sfg.js:175339-175544 placement
class LineWidthCache {
  #e = new Map();
  measure(n) {
    let u = this.#e.get(n);
    if (u !== void 0) return u;
    let f = bunStringWidth(n);
    if (this.#e.size >= MAX_LINE_WIDTH_CACHE_SIZE) this.#e.clear();
    return (this.#e.set(n, f), f);
  }
  get size() {
    return this.#e.size;
  }
  reset() {
    this.#e.clear();
  }
}
//@ chunk-bzr73sfg.js:175544-175558 layout
var lineWidthCache = new LineWidthCache();
/**
 * 取一行文本的显示宽度（带缓存）。
 */
//@ chunk-bzr73sfg.js:175558-175595 callgraph-witnessed = lineWidth (0)
function lineWidth(line) {
  return lineWidthCache.measure(line);
}

export {
  lineWidth,
  ReactReconcilerModule,
  createInputReaderState,
  EventLoopLagWatcher,
  hasPendingInput,
  ESC_FLUSH_TIMEOUT_MS,
  flushInputReader,
  feedInputReader,
  splitEscPrefixedChunk,
  isEscPrefixedChunk,
};
