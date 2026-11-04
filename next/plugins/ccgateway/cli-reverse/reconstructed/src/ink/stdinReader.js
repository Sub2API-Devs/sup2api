/**
 * ink/stdinReader.ts
 *
 * 2.1.316 新增：终端 stdin 读取状态机（按键解析推进、粘贴/鼠标前缀丢弃、超时刷出未完成转义序列），从 line-width-cache.ts 拆出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (7)
 * attribution: placement 7
 */
import {
  INITIAL_STATE,
  parseMultipleKeypresses,
  isPlausibleIncompleteSequence,
  discardIncompleteInput,
} from "./parse-keypress.js";
import { ESC } from "./termio/ansi.js";

//@ chunk-bzr73sfg.js:172812-172838 placement
var ESC_FLUSH_TIMEOUT_MS = 50;
var PASTE_FLUSH_TIMEOUT_MS = 2000;
var PARTIAL_PREFIX_DROP_MS = 2000;
//@ chunk-bzr73sfg.js:172838-172976 placement
/**
 * 新建 stdin 读取器状态：按键解析状态（INITIAL_STATE 的副本）、上次输入时间、UTF-8 字节串截止时间、鼠标前缀丢弃时间、被丢弃前缀的清理时间、是否有迟到读标记。
 */
function createInputReaderState(now) {
  return {
    parse: {
      ...INITIAL_STATE,
    },
    lastInputAt: now,
    byteRunDeadlineAt: null,
    mousePrefixDropAt: null,
    droppedPrefixDropAt: null,
    heldReadLate: false,
  };
}
//@ chunk-bzr73sfg.js:172976-173027 placement
function isEscPrefixedChunk(text) {
  return text.length > 1 && text.startsWith(ESC);
}
//@ chunk-bzr73sfg.js:173027-173153 placement
/**
 * 把以 ESC 开头的一段输入拆成单独的 ESC 和其余文本分别解析（用于 ESC 后紧跟文字被合并读入的情况）。
 */
function splitEscPrefixedChunk(text) {
  if (!isEscPrefixedChunk(text)) return [];
  return [ESC, text.slice(1)].flatMap((part) => {
    let [keys, prevState] = parseMultipleKeypresses(
      {
        ...INITIAL_STATE,
      },
      part,
    );
    return keys.concat(parseMultipleKeypresses(prevState, null)[0]);
  });
}
//@ chunk-bzr73sfg.js:173153-173259 placement
function hasPendingInput(reader) {
  let { parse } = reader;
  return parse.incomplete !== "" || parse.mode === "IN_PASTE" || parse.pendingByteEvents.length > 0;
}
//@ chunk-bzr73sfg.js:173259-174416 placement
/**
 * 推进输入解析状态机（粘贴、鼠标前缀丢弃），产出按键。
 */
function feedInputReader(reader, chunk, now, isReadLate = false) {
  let { parse, droppedPrefixDropAt } = reader;
  if (
    droppedPrefixDropAt !== null &&
    now >= droppedPrefixDropAt &&
    (parse.droppedMousePrefix || parse.flushedEscapePrefix)
  ) {
    parse = {
      ...parse,
      droppedMousePrefix: "",
      flushedEscapePrefix: "",
    };
    droppedPrefixDropAt = null;
  }
  let prevParse = parse;
  let [keys, nextParse] = parseMultipleKeypresses(parse, chunk);
  let inPaste = nextParse.mode === "IN_PASTE";
  let isLateNow = chunk !== null && isReadLate;
  let readLateNow =
    isLateNow ||
    reader.heldReadLate ||
    (chunk !== null && prevParse.incomplete === ESC && now - reader.lastInputAt >= ESC_FLUSH_TIMEOUT_MS);
  let heldReadLateNow = chunk === null ? reader.heldReadLate : isLateNow;
  let markedKeys =
    readLateNow || heldReadLateNow
      ? keys.map((key, keyIndex) =>
          key.kind === "key" && (keyIndex === 0 ? readLateNow : heldReadLateNow)
            ? {
                ...key,
                readLate: true,
              }
            : key,
        )
      : keys;
  let byteRunDeadlineAt = reader.byteRunDeadlineAt;
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
      : null;
  let byteRunWait = byteRunDeadlineAt === null || inPaste ? null : Math.max(0, byteRunDeadlineAt - now);
  let wait =
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
      byteRunDeadlineAt,
      mousePrefixDropAt,
      droppedPrefixDropAt,
      heldReadLate: nextParse.incomplete !== "" && (keys.length === 0 ? readLateNow : heldReadLateNow),
    },
    wakeAt: wait === null ? null : now + wait,
  };
}
//@ chunk-bzr73sfg.js:174416-174812 placement
/**
 * 超时后刷出未完成的转义序列。
 */
function flushInputReader(reader, now) {
  if (!hasPendingInput(reader))
    return {
      keys: [],
      reader,
      wakeAt: null,
    };
  let reader_2 = reader;
  if (
    reader_2.mousePrefixDropAt !== null &&
    now >= reader_2.mousePrefixDropAt &&
    reader_2.parse.mode !== "IN_PASTE" &&
    isPlausibleIncompleteSequence(reader_2.parse.incomplete)
  )
    reader_2 = {
      ...reader_2,
      parse: discardIncompleteInput(reader_2.parse),
      mousePrefixDropAt: null,
      droppedPrefixDropAt: now + PARTIAL_PREFIX_DROP_MS,
    };
  if (reader_2.parse.incomplete) {
    let wrapped =
      (reader_2.parse.mode === "IN_PASTE" ? PASTE_FLUSH_TIMEOUT_MS : ESC_FLUSH_TIMEOUT_MS) -
      (now - reader_2.lastInputAt);
    if (wrapped > 0)
      return {
        keys: [],
        reader: reader_2,
        wakeAt: now + wrapped,
      };
  }
  return feedInputReader(reader_2, null, now);
}
export {
  ESC_FLUSH_TIMEOUT_MS,
  createInputReaderState,
  hasPendingInput,
  flushInputReader,
  feedInputReader,
  splitEscPrefixedChunk,
  isEscPrefixedChunk,
};
