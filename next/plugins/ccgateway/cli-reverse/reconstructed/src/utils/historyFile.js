/**
 * utils/historyFile.ts
 *
 * history.jsonl 安全读写与扫描（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (29)
 * attribution: placement 29
 */
import { createReadStream, constants } from "fs";
import { stat, open } from "fs/promises";
import { createHash } from "crypto";
import { transcriptLines } from "./backgroundSessionResume.js";
import { isENOENT, getErrnoCode } from "./errors.js";
import { filePath, O_NONBLOCK } from "./atomicPublishWrite.js";
import {
  OPENING_PUNCT_RE,
  CLOSING_PUNCT_RE,
  PASTED_CONTENT_OPEN_PREFIX,
  PASTED_CONTENT_CLOSE_PREFIX,
  PASTE_ID_LENGTH,
  isPasteIdHex,
  PASTED_CONTENT_LINE_END,
} from "./pastedContent.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";

//@ chunk-7jxyna5q.js:21490-21588 placement
/**
 * 取消息内容中的最后一段文本（字符串或末尾文本块）。
 */
function lastTextBlockText(text) {
  if (typeof text === "string") return text;
  let last = text.at(-1);
  return last?.type === "text" ? last.text : null;
}
//@ chunk-7jxyna5q.js:21727-21781 placement
/**
 * 读写 history.jsonl 的重试配置。
 */
var HISTORY_FILE_RETRY_OPTIONS = {
  stale: 1e4,
  retries: {
    retries: 3,
    minTimeout: 50,
  },
};
//@ chunk-7jxyna5q.js:21781-21942 placement
/**
 * 按 \r 拆分历史文本行；含 U+2028/2029 的段若不是合法 JSON 则再按这两个字符拆开。
 */
function splitHistoryLines(text) {
  return text.split("\r").flatMap((line) => {
    if (!/[\u2028\u2029]/.test(line)) return [line];
    try {
      JSON.parse(line);
      return [line];
    } catch {
      return line.split(/[\u2028\u2029]/);
    }
  });
}
//@ chunk-7jxyna5q.js:21942-22003 placement
/**
 * 流式拆分历史文件的行（按 \r 与 U+2028/2029 处理）。
 */
async function* splitHistoryStream(readStream) {
  for await (let line of transcriptLines(readStream)) yield* splitHistoryLines(line);
}
//@ chunk-7jxyna5q.js:22003-22365 placement
/**
 * 流式扫描历史文件，统计匹配行；filter 模式下把未匹配的行原子写回（可保留原文件权限）。
 */
async function filterHistoryFile(source, shouldDrop, mode, { fileMode = "default", beforeWrite } = {}) {
  let kept = [];
  let dropped = 0;
  try {
    for await (let line of splitHistoryStream(
      createReadStream(source, {
        encoding: "utf8",
      }),
    ))
      if (shouldDrop(line)) dropped++;
      else if (mode === "filter") kept.push(line);
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw error;
  }
  if (mode !== "filter" || dropped === 0) return dropped;
  beforeWrite?.();
  let exactMode = fileMode === "preserve" ? (await stat(source)).mode & 511 : undefined;
  await filePath(
    source,
    kept.length
      ? `${kept.join(`
`)}
`
      : "",
    {
      exactMode,
    },
  );
  return dropped;
}
//@ chunk-7jxyna5q.js:22365-22390 placement
/**
 * history.jsonl 不是普通文件或扫描期间被改写时抛出的错误。
 */
class HistoryFileError extends Error {}
//@ chunk-7jxyna5q.js:22390-22405 placement
var HISTORY_SCAN_CHUNK_BYTES = 4194304;
//@ chunk-7jxyna5q.js:22405-24276 placement
/**
 * 安全打开 history.jsonl（拒绝符号链接、特殊文件，校验哈希）
 */
async function openHistoryFile(
  historyPath,
  shouldDrop,
  { start, end, tail, expect, verifiedHead, residueBytes = 0 },
) {
  let kept = [];
  let dropped = 0;
  let handleLine = (raw) => {
    let line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (shouldDrop(line)) dropped++;
    else kept.push(line);
  };
  let hashing = true;
  let split = false;
  let scanLine = (buffer) => {
    hashing = false;
    let str = buffer.toString("utf8");
    let line = str.endsWith("\r") ? str.slice(0, -1) : str;
    if (residueBytes <= 0 || buffer.length <= residueBytes || !shouldDrop(line)) {
      handleLine(str);
      return;
    }
    split = true;
    handleLine(buffer.subarray(0, residueBytes).toString("utf8"));
    handleLine(buffer.subarray(residueBytes).toString("utf8"));
  };
  let offset = 0;
  let residue = Buffer.alloc(0);
  let hash = createHash("sha256");
  let handle;
  try {
    handle = await open(historyPath, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENXIO")
      throw new HistoryFileError("history.jsonl is not a regular file at open");
    throw error;
  }
  try {
    let stats = await handle.stat();
    if (
      !stats.isFile() ||
      (expect !== undefined &&
        ((expect.ino !== 0 && stats.ino !== expect.ino) || stats.birthtimeMs !== expect.birthtimeMs))
    )
      throw new HistoryFileError("history.jsonl changed between its screen and the scan");
    if (verifiedHead !== undefined) {
      let hash = createHash("sha256");
      let read = 0;
      while (read < verifiedHead.bytes) {
        let chunkBuffer = Buffer.alloc(Math.min(HISTORY_SCAN_CHUNK_BYTES, verifiedHead.bytes - read));
        let { bytesRead } = await handle.read(chunkBuffer, 0, chunkBuffer.length, read);
        if (bytesRead === 0) break;
        hash.update(chunkBuffer.subarray(0, bytesRead));
        read += bytesRead;
      }
      if (read !== verifiedHead.bytes || hash.digest("hex") !== verifiedHead.digest)
        throw new HistoryFileError("history.jsonl was rewritten under the head an earlier scan judged");
    }
    let max = Math.max(0, end - start);
    while (offset < max) {
      let chunkBuffer = Buffer.alloc(Math.min(HISTORY_SCAN_CHUNK_BYTES, max - offset));
      let offset_2 = 0;
      while (offset_2 < chunkBuffer.length) {
        let { bytesRead } = await handle.read(
          chunkBuffer,
          offset_2,
          chunkBuffer.length - offset_2,
          start + offset + offset_2,
        );
        if (bytesRead === 0) break;
        offset_2 += bytesRead;
      }
      if (offset_2 === 0) break;
      offset += offset_2;
      let chunk = residue.length
        ? Buffer.concat([residue, chunkBuffer.subarray(0, offset_2)])
        : chunkBuffer.subarray(0, offset_2);
      let index = chunk.lastIndexOf(10);
      if (index === -1) {
        residue = chunk;
        continue;
      }
      hash.update(chunk.subarray(0, index + 1));
      let lineStart = 0;
      if (hashing) {
        let index = chunk.indexOf(10);
        scanLine(chunk.subarray(0, index));
        lineStart = index + 1;
      }
      let lines = chunk.toString("utf8", lineStart, index + 1).split(`
`);
      lines.pop();
      for (let line of lines) handleLine(line);
      residue = chunk.subarray(index + 1);
    }
  } finally {
    await handle.close();
  }
  let terminated = residue.length === 0;
  let consumed = offset - residue.length;
  if (tail === "judge" && residue.length > 0) {
    hash.update(residue);
    if (hashing) scanLine(residue);
    else handleLine(residue.toString("utf8"));
    consumed = offset;
  }
  return {
    kept,
    dropped,
    consumed: start + consumed,
    digest: hash.digest("hex"),
    terminated,
    split,
  };
}
//@ chunk-7jxyna5q.js:24276-24380 placement
function toCharCodes(text) {
  let uint16Array = new Uint16Array(text.length);
  for (let j = 0; j < text.length; j++) uint16Array[j] = text.charCodeAt(j);
  return uint16Array;
}
//@ chunk-7jxyna5q.js:24380-24525 placement
function kmpFailureTable(pattern) {
  let int32Array = new Int32Array(pattern.length);
  for (let j = 1, matched = 0; j < pattern.length; j++) {
    while (matched > 0 && pattern[j] !== pattern[matched]) matched = int32Array[matched - 1];
    if (pattern[j] === pattern[matched]) matched++;
    int32Array[j] = matched;
  }
  return int32Array;
}
//@ chunk-7jxyna5q.js:24525-24542 placement
var FINDER_PREFIX_CHARS = 8;
var FINDER_CACHE_MAX = 1024;
//@ chunk-7jxyna5q.js:24542-25277 placement
/**
 * 为大文本创建子串查找器：先用首段 indexOf 定位，再用 KMP 精确匹配，压缩周期性重复的命中，返回按位置二分查找下一次出现的函数（结果缓存）。
 */
function createSubstringFinder(haystack) {
  let haystackCodes;
  let cache = new Map();
  return (needle) => {
    let cached = cache.get(needle);
    if (cached !== undefined) return cached;
    let sliced = needle.slice(0, FINDER_PREFIX_CHARS);
    let firstIndex = needle.length > haystack.length ? -1 : haystack.indexOf(sliced);
    if (firstIndex === -1) {
      let notFound = () => -1;
      cache.set(needle, notFound);
      return notFound;
    }
    let needleCodes = toCharCodes(needle);
    let failure = kmpFailureTable(needleCodes);
    let period = needleCodes.length - failure.at(-1);
    let starts = [];
    let runEnds = [];
    let codes = (haystackCodes ??= toCharCodes(haystack));
    for (let index = firstIndex, matchedSoFar = 0; index < codes.length; index++) {
      if (matchedSoFar === 0) {
        let index_2 = haystack.indexOf(sliced, index);
        if (index_2 === -1) break;
        index = index_2 + sliced.length - 1;
        matchedSoFar = sliced.length - 1;
      }
      let code = codes[index];
      while (matchedSoFar > 0 && code !== needleCodes[matchedSoFar]) matchedSoFar = failure[matchedSoFar - 1];
      if (code === needleCodes[matchedSoFar]) matchedSoFar++;
      if (matchedSoFar === needleCodes.length) {
        let start = index + 1 - needleCodes.length;
        let lastRun = runEnds.length - 1;
        if (lastRun >= 0 && start - runEnds[lastRun] === period) runEnds[lastRun] = start;
        else {
          starts.push(start);
          runEnds.push(start);
        }
        matchedSoFar = failure[matchedSoFar - 1];
      }
    }
    let findNext = (fromIndex) => {
      let low = 0;
      let high = runEnds.length;
      while (low < high) {
        let mid = (low + high) >> 1;
        if (runEnds[mid] < fromIndex) low = mid + 1;
        else high = mid;
      }
      let runStart = starts[low];
      if (runStart === undefined) return -1;
      return fromIndex > runStart ? runStart + Math.ceil((fromIndex - runStart) / period) * period : runStart;
    };
    if (starts.length <= FINDER_CACHE_MAX) cache.set(needle, findNext);
    return findNext;
  };
}
//@ chunk-7jxyna5q.js:25277-25307 placement
var WORD_CHAR_RE = /[\p{L}\p{N}_@#./\\]/u;
//@ chunk-7jxyna5q.js:25307-25694 placement
/**
 * 判断匹配是否独立成词：前面（跳过开括号类字符）不是词字符，后面（跳过闭括号类字符）是结尾或空白；带缓存区间。
 */
function isWordBoundaryMatch(text, start, end, windowFrom, windowTo, atWordStart, openers) {
  if (!atWordStart) {
    let beforeIndex = start - 1;
    while (beforeIndex >= windowFrom && OPENING_PUNCT_RE.test(text[beforeIndex]))
      beforeIndex =
        beforeIndex <= openers.openersTo && beforeIndex >= openers.openersFrom
          ? openers.openersFrom - 1
          : beforeIndex - 1;
    if (start - 1 >= windowFrom && beforeIndex < start - 1) {
      openers.openersFrom = Math.max(beforeIndex + 1, windowFrom);
      openers.openersTo = start - 1;
    }
    if (beforeIndex >= windowFrom && WORD_CHAR_RE.test(text[beforeIndex])) return false;
  }
  let afterIndex = end;
  while (afterIndex < windowTo && CLOSING_PUNCT_RE.test(text[afterIndex]))
    afterIndex =
      afterIndex >= openers.closersFrom && afterIndex < openers.closersTo
        ? openers.closersTo
        : afterIndex + 1;
  afterIndex = Math.min(afterIndex, windowTo);
  if (afterIndex > end) {
    openers.closersFrom = end;
    openers.closersTo = afterIndex;
  }
  return afterIndex >= windowTo || /\s/.test(text[afterIndex]);
}
//@ chunk-7jxyna5q.js:25694-25769 placement
function emptySpanBudget() {
  return {
    openersFrom: 0,
    openersTo: -1,
    closersFrom: 0,
    closersTo: 0,
  };
}
//@ chunk-7jxyna5q.js:25769-25931 placement
/**
 * 找出文本中与历史内容相同的区间（多种匹配方式合并）。
 */
function findHistoryCopySpans(text, needles, find = createSubstringFinder(text)) {
  let firstPass = pickHistoryCopy(text, needles, find, true, "anyCopy");
  return mergeSpans([
    ...firstPass.spans,
    ...pickHistoryCopy(text, needles, find, false, "anyCopy").spans,
    ...(firstPass.skipped ? pickHistoryCopy(text, needles, find, true, "standingCopy").spans : []),
  ]);
}
//@ chunk-7jxyna5q.js:25931-26970 placement
function pickHistoryCopy(text, needles, find, incremental, copyKind) {
  let spans = [];
  let standingSpans = [];
  let skipped = false;
  let sorted = normalizeCaseForComparison_2(needles)
    .filter((needle) => needle !== "")
    .sort((leftNeedle, rightNeedle) => rightNeedle.length - leftNeedle.length);
  for (let needle of sorted) {
    let findIn = find(needle);
    let placedSpans = [];
    let foreignSpans = [];
    let budget = emptySpanBudget();
    let placedIndex = 0;
    let occupiedUntil = 0;
    let nextFreeFrom = spans[0]?.from ?? text.length;
    let cursor = 0;
    let lastAcceptedEnd = 0;
    for (;;) {
      let at = findIn(cursor);
      if (at === -1) break;
      let end = at + needle.length;
      if (end > nextFreeFrom || at < occupiedUntil) {
        while (placedIndex < spans.length && at >= spans[placedIndex].from) {
          occupiedUntil = spans[placedIndex].to;
          placedIndex++;
        }
        nextFreeFrom = spans[placedIndex]?.from ?? text.length;
        if (end <= occupiedUntil) {
          cursor = occupiedUntil - needle.length + 1;
          continue;
        }
        let fits = at >= occupiedUntil && end <= nextFreeFrom;
        let accepted = false;
        if (
          !fits &&
          isWordBoundaryMatch(text, at, end, occupiedUntil, nextFreeFrom, at === lastAcceptedEnd, budget)
        ) {
          let retryAt = at < occupiedUntil ? findIn(occupiedUntil) : -1;
          let hasOccurrence = retryAt !== -1 && retryAt < Math.min(end, nextFreeFrom);
          if (hasOccurrence && copyKind === "standingCopy") {
            let spaceCursor = occupiedUntil;
            while (spaceCursor < retryAt && /\s/.test(text[spaceCursor])) spaceCursor++;
            hasOccurrence =
              spaceCursor === retryAt &&
              isWordBoundaryMatch(
                text,
                retryAt,
                retryAt + needle.length,
                occupiedUntil,
                nextFreeFrom,
                retryAt === occupiedUntil,
                emptySpanBudget(),
              );
          }
          if (hasOccurrence) skipped = true;
          else {
            foreignSpans.push({
              from: at,
              to: end,
            });
            accepted = true;
          }
        }
        if (at >= occupiedUntil && end > nextFreeFrom) {
          occupiedUntil = spans[placedIndex].to;
          placedIndex++;
          nextFreeFrom = spans[placedIndex]?.from ?? text.length;
          cursor = end;
        } else cursor = Math.max(at, occupiedUntil);
        lastAcceptedEnd = incremental && accepted ? Math.max(end, occupiedUntil) : occupiedUntil;
        continue;
      }
      if (isWordBoundaryMatch(text, at, end, occupiedUntil, nextFreeFrom, at === lastAcceptedEnd, budget)) {
        placedSpans.push({
          from: at,
          to: end,
        });
        lastAcceptedEnd = end;
      }
      cursor = end;
    }
    if (incremental) {
      if (placedSpans.length > 0 || foreignSpans.length > 0)
        spans = mergeSpans([...spans, ...placedSpans, ...foreignSpans]);
      continue;
    }
    if (placedSpans.length > 0)
      spans = [...spans, ...placedSpans].sort((left, right) => left.from - right.from);
    if (foreignSpans.length > 0) standingSpans = mergeSpans([...standingSpans, ...foreignSpans]);
  }
  return {
    spans: standingSpans.length === 0 ? spans : mergeSpans([...spans, ...standingSpans]),
    skipped,
  };
}
//@ chunk-7jxyna5q.js:26970-27133 placement
function mergeSpans(original) {
  let merged = [];
  for (let span of original.sort((left, right) => left.from - right.from)) {
    let last = merged.at(-1);
    if (last !== undefined && span.from < last.to) last.to = Math.max(last.to, span.to);
    else
      merged.push({
        ...span,
      });
  }
  return merged;
}
//@ chunk-7jxyna5q.js:27133-27302 placement
/**
 * 合并重叠或相接的区间。
 */
function mergeAdjacentSpans(original) {
  let merged = [];
  for (let span of [...original].sort((left, right) => left.from - right.from)) {
    let last = merged.at(-1);
    if (last !== undefined && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else
      merged.push({
        ...span,
      });
  }
  return merged;
}
//@ chunk-7jxyna5q.js:27302-27573 placement
function findAllMatches(haystack, pattern) {
  let failure = kmpFailureTable(pattern);
  if (failure.at(-1) === 0) return;
  let spans = [];
  for (let j = 0, matched = 0; j < haystack.length; j++) {
    while (matched > 0 && haystack[j] !== pattern[matched]) matched = failure[matched - 1];
    if (haystack[j] === pattern[matched]) matched++;
    if (matched === pattern.length) {
      let start = j + 1 - pattern.length;
      let last = spans.at(-1);
      if (last !== undefined && start <= last.to) last.to = j + 1;
      else
        spans.push({
          from: start,
          to: j + 1,
        });
      matched = failure[matched - 1];
    }
  }
  return spans;
}
//@ chunk-7jxyna5q.js:27573-27848 placement
/**
 * 在文本中找出各粘贴内容出现的区间（含 < 的内容用 KMP 全匹配），合并后返回。
 */
function findPasteSpans(text, needles, substringFinder = createSubstringFinder(text)) {
  let spans = [];
  let haystack;
  for (let needle of normalizeCaseForComparison_2(needles)) {
    if (needle === "") continue;
    let findIn = substringFinder(needle);
    let probed =
      needle.includes("<") && findIn(0) !== -1
        ? findAllMatches((haystack ??= toCharCodes(text)), toCharCodes(needle))
        : undefined;
    if (probed !== undefined) {
      for (let span of probed) spans.push(span);
      continue;
    }
    for (let at = findIn(0); at !== -1; at = findIn(at + needle.length))
      spans.push({
        from: at,
        to: at + needle.length,
      });
  }
  return mergeAdjacentSpans(spans);
}
//@ chunk-7jxyna5q.js:27848-28214 placement
/**
 * 找出文本中带 id 的开/闭标签标记，按位置排序。
 */
function findTagMarkers(text) {
  let markers = [];
  for (let [prefix, opens] of [
    [PASTED_CONTENT_OPEN_PREFIX, true],
    [PASTED_CONTENT_CLOSE_PREFIX, false],
  ])
    for (let index = text.indexOf(prefix); index !== -1; index = text.indexOf(prefix, index + 1)) {
      let idStart = index + prefix.length;
      let candidate = text.slice(idStart, idStart + PASTE_ID_LENGTH);
      let idEnd = idStart + PASTE_ID_LENGTH;
      if (!isPasteIdHex(candidate)) continue;
      if (opens) {
        if (text.startsWith(PASTED_CONTENT_LINE_END, idEnd))
          markers.push({
            at: index,
            end: idEnd + PASTED_CONTENT_LINE_END.length,
            id: candidate,
            opens,
          });
      } else if (
        text.startsWith('">', idEnd) &&
        (index === 0 ||
          text[index - 1] ===
            `
`)
      )
        markers.push({
          at: index,
          end: idEnd + 2,
          id: candidate,
          opens,
        });
    }
  return markers.sort((left, right) => left.at - right.at);
}
//@ chunk-7jxyna5q.js:28214-28897 placement
/**
 * 在文本中配对开/闭标签标记，生成区块（含正文范围），跳过与排除区间重叠或被指定文本包含的标记。
 */
function findTaggedBlocks(text, spans = [], excludes = []) {
  let markers = findTagMarkers(text);
  let isExcluded = (marker) =>
    excludes.some(
      (needle) =>
        needle !== "" &&
        text
          .slice(Math.max(0, marker.at - needle.length + 1), marker.end + needle.length - 1)
          .includes(needle),
    );
  let nextAllowed = Array(markers.length + 1).fill(markers.length);
  for (let j = markers.length - 1; j >= 0; j--) {
    let marker = markers[j];
    nextAllowed[j] =
      findOverlappingSpan(spans, marker.at, marker.end) === -1 && !isExcluded(marker)
        ? j
        : nextAllowed[j + 1];
  }
  let closersById = new Map();
  markers.forEach((marker, marker_2) => {
    if (!marker.opens) {
      let closers = closersById.get(marker.id);
      if (closers === undefined) closersById.set(marker.id, [marker_2]);
      else closers.push(marker_2);
    }
  });
  let blocks = [];
  markers.forEach((marker, marker_2) => {
    if (!marker.opens) return;
    let closers = closersById.get(marker.id) ?? [];
    let nextAllowed_2 = nextAllowed[marker_2 + 1];
    let low = 0;
    let high = closers.length;
    while (low < high) {
      let mid = (low + high) >> 1;
      if (closers[mid] <= nextAllowed_2) low = mid + 1;
      else high = mid;
    }
    let closerIndex = closers[low - 1];
    if (closerIndex === undefined || closerIndex <= marker_2 || markers[closerIndex].at < marker.end) return;
    let closer = markers[closerIndex];
    blocks.push({
      from: marker.at,
      to:
        text[closer.end] ===
        `
`
          ? closer.end + 1
          : closer.end,
      bodyFrom: marker.end,
      bodyTo: Math.max(marker.end, closer.at - 1),
    });
  });
  return blocks;
}
//@ chunk-7jxyna5q.js:28897-29024 placement
function findOverlappingSpan(spans, from, end) {
  let low = 0;
  let high = spans.length;
  while (low < high) {
    let mid = (low + high) >> 1;
    if (spans[mid].to <= from) low = mid + 1;
    else high = mid;
  }
  return low < spans.length && spans[low].from < end ? low : -1;
}
//@ chunk-7jxyna5q.js:29024-29279 placement
/**
 * 合并区块与额外区间（取并集，保留正文范围）。
 */
function mergeBlocks(historyCopySpans, taggedBlocks) {
  let sorted = [
    ...taggedBlocks,
    ...historyCopySpans.map((span) => ({
      ...span,
      bodyFrom: span.from,
      bodyTo: span.to,
    })),
  ].sort((left, right) => left.from - right.from || right.to - left.to);
  let merged = [];
  for (let block of sorted) {
    let last = merged.at(-1);
    if (last !== undefined && block.from < last.to) {
      if (block.to > last.to) {
        last.to = block.to;
        last.bodyTo = block.bodyTo;
      }
    } else
      merged.push({
        ...block,
      });
  }
  return merged;
}
//@ chunk-7jxyna5q.js:29279-29730 placement
/**
 * 按区块重组文本：区块外的片段经转换，区块内的正文经渲染并用开/闭标记包裹，控制前后空行。
 */
function renderWithBlocks(text, blocks, renderBlock, escapePastedContentTag) {
  let parts = [];
  let trailingNewlines = 0;
  let atStart = true;
  let push = (piece) => {
    if (piece === "") return;
    parts.push(piece);
    atStart = false;
    let trailingCount = 0;
    while (
      trailingCount < piece.length &&
      piece[piece.length - 1 - trailingCount] ===
        `
`
    )
      trailingCount++;
    trailingNewlines = trailingCount === piece.length ? trailingNewlines + trailingCount : trailingCount;
  };
  let pos = 0;
  let afterBlock = false;
  let flushUntil = (until) => {
    let plainText = escapePastedContentTag(text.slice(pos, until));
    if (plainText !== "")
      push(
        (afterBlock
          ? `
`
          : "") + plainText,
      );
  };
  for (let block of blocks) {
    let from = block.from;
    while (
      from > pos &&
      text[from - 1] ===
        `
`
    )
      from--;
    flushUntil(from);
    let rendered = renderBlock(text.slice(block.bodyFrom, block.bodyTo));
    push(
      atStart || trailingNewlines === 0
        ? `

`
        : trailingNewlines === 1
          ? `
`
          : "",
    );
    push(`${rendered.opener}${rendered.body}
${rendered.closer}`);
    pos = block.to;
    while (
      text[pos] ===
      `
`
    )
      pos++;
    afterBlock = true;
  }
  flushUntil(text.length);
  return parts.join("");
}
//@ chunk-7jxyna5q.js:29730-29819 placement
/**
 * 判断历史记录是否仍在等待/欠一次屏幕检查。
 */
var isScreeningPendingEntry = (command) =>
  command.promptSubmitted === undefined &&
  (command.screeningPending === true || command.screeningOwed === true);
//@ chunk-7jxyna5q.js:29819-29849 placement
/**
 * 值未变化时返回 undefined，否则返回新值。
 */
var unchangedOrUndefined = (text, text_2) => (text_2 === text ? undefined : text_2);
//@ chunk-7jxyna5q.js:29849-30086 placement
function getHistoryEntryForCommand(command, placed, options) {
  let { screened, unanswered } = options;
  let historyEntry = command.historyEntry;
  let skip =
    screened?.dropped === true ||
    (unanswered === "skipped" && screened === undefined && isScreeningPendingEntry(command));
  if (historyEntry === undefined || skip) return;
  let replacement =
    screened === undefined
      ? unchangedOrUndefined(command.value, command.promptSubmitted?.text)
      : screened.rewritten;
  return replacement === undefined ? historyEntry : placed(historyEntry, replacement);
}
export {
  lastTextBlockText,
  findHistoryCopySpans,
  HISTORY_FILE_RETRY_OPTIONS,
  getHistoryEntryForCommand,
  unchangedOrUndefined,
  openHistoryFile,
  HistoryFileError,
  isScreeningPendingEntry,
  splitHistoryStream,
  splitHistoryLines,
  filterHistoryFile,
  createSubstringFinder,
  renderWithBlocks,
  mergeBlocks,
  findTaggedBlocks,
  mergeAdjacentSpans,
  findPasteSpans,
};
