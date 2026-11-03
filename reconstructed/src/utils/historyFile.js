/**
 * utils/historyFile.ts
 *
 * history.jsonl 安全读写与扫描（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (29)
 * attribution: placement 29
 */
import { createReadStream, constants } from "fs";
import { stat, open } from "fs/promises";
import { createHash } from "crypto";
import { transcriptLines } from "./backgroundSessionResume.js";
import { isENOENT, getErrnoCode } from "./errors.js";
import { publishWriteAtomic, O_NONBLOCK } from "./atomicPublishWrite.js";
import {
  OPENING_PUNCT_RE,
  CLOSING_PUNCT_RE,
  PASTED_CONTENT_OPEN_PREFIX,
  PASTED_CONTENT_CLOSE_PREFIX,
  PASTE_ID_LENGTH,
  isPasteIdHex,
  PASTED_CONTENT_LINE_END,
} from "./pastedContent.js";
import { uniq } from "./collections.js";

//@ chunk-s61vbvea.js:20915-21013 placement
/**
 * 取消息内容中的最后一段文本（字符串或末尾文本块）。
 */
function lastTextBlockText(e) {
  if (typeof e === "string") return e;
  let last = e.at(-1);
  return last?.type === "text" ? last.text : null;
}
//@ chunk-s61vbvea.js:21152-21206 placement
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
//@ chunk-s61vbvea.js:21206-21367 placement
/**
 * 按 \r 拆分历史文本行；含 U+2028/2029 的段若不是合法 JSON 则再按这两个字符拆开。
 */
function splitHistoryLines(e) {
  return e.split("\r").flatMap((n) => {
    if (!/[\u2028\u2029]/.test(n)) return [n];
    try {
      JSON.parse(n);
      return [n];
    } catch {
      return n.split(/[\u2028\u2029]/);
    }
  });
}
//@ chunk-s61vbvea.js:21367-21428 placement
/**
 * 流式拆分历史文件的行（按 \r 与 U+2028/2029 处理）。
 */
async function* splitHistoryStream(readStream) {
  for await (let n of transcriptLines(readStream)) yield* splitHistoryLines(n);
}
//@ chunk-s61vbvea.js:21428-21791 placement
/**
 * 流式扫描历史文件，统计匹配行；filter 模式下把未匹配的行原子写回（可保留原文件权限）。
 */
async function filterHistoryFile(e, n, r, { fileMode: s = "default", beforeWrite: h } = {}) {
  let y = [];
  let S = 0;
  try {
    for await (let R of splitHistoryStream(
      createReadStream(e, {
        encoding: "utf8",
      }),
    ))
      if (n(R)) S++;
      else if (r === "filter") y.push(R);
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw error;
  }
  if (r !== "filter" || S === 0) return S;
  h?.();
  let exactMode = s === "preserve" ? (await stat(e)).mode & 511 : undefined;
  await publishWriteAtomic(
    e,
    y.length
      ? `${y.join(`
`)}
`
      : "",
    {
      exactMode,
    },
  );
  return S;
}
//@ chunk-s61vbvea.js:21791-21816 placement
/**
 * history.jsonl 不是普通文件或扫描期间被改写时抛出的错误。
 */
class HistoryFileError extends Error {}
//@ chunk-s61vbvea.js:21816-21831 placement
var HISTORY_SCAN_CHUNK_BYTES = 4194304;
//@ chunk-s61vbvea.js:21831-23698 placement
/**
 * 安全打开 history.jsonl（拒绝符号链接、特殊文件，校验哈希）
 */
async function openHistoryFile(
  historyPath,
  shouldDrop,
  { start, end, tail, expect, verifiedHead, residueBytes = 0 },
) {
  let R = [];
  let x = 0;
  let P = (re) => {
    let he = re.endsWith("\r") ? re.slice(0, -1) : re;
    if (shouldDrop(he)) x++;
    else R.push(he);
  };
  let j = true;
  let split = false;
  let L = (re) => {
    j = false;
    let str = re.toString("utf8");
    let Se = str.endsWith("\r") ? str.slice(0, -1) : str;
    if (residueBytes <= 0 || re.length <= residueBytes || !shouldDrop(Se)) {
      P(str);
      return;
    }
    split = true;
    P(re.subarray(0, residueBytes).toString("utf8"));
    P(re.subarray(residueBytes).toString("utf8"));
  };
  let q = 0;
  let Q = Buffer.alloc(0);
  let hash = createHash("sha256");
  let ee;
  try {
    ee = await open(historyPath, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENXIO")
      throw new HistoryFileError("history.jsonl is not a regular file at open");
    throw error;
  }
  try {
    let stats = await ee.stat();
    if (
      !stats.isFile() ||
      (expect !== undefined &&
        ((expect.ino !== 0 && stats.ino !== expect.ino) || stats.birthtimeMs !== expect.birthtimeMs))
    )
      throw new HistoryFileError("history.jsonl changed between its screen and the scan");
    if (verifiedHead !== undefined) {
      let hash = createHash("sha256");
      let ce = 0;
      while (ce < verifiedHead.bytes) {
        let we = Buffer.alloc(Math.min(HISTORY_SCAN_CHUNK_BYTES, verifiedHead.bytes - ce));
        let { bytesRead } = await ee.read(we, 0, we.length, ce);
        if (bytesRead === 0) break;
        hash.update(we.subarray(0, bytesRead));
        ce += bytesRead;
      }
      if (ce !== verifiedHead.bytes || hash.digest("hex") !== verifiedHead.digest)
        throw new HistoryFileError("history.jsonl was rewritten under the head an earlier scan judged");
    }
    let max = Math.max(0, end - start);
    while (q < max) {
      let Se = Buffer.alloc(Math.min(HISTORY_SCAN_CHUNK_BYTES, max - q));
      let ce = 0;
      while (ce < Se.length) {
        let { bytesRead } = await ee.read(Se, ce, Se.length - ce, start + q + ce);
        if (bytesRead === 0) break;
        ce += bytesRead;
      }
      if (ce === 0) break;
      q += ce;
      let we = Q.length ? Buffer.concat([Q, Se.subarray(0, ce)]) : Se.subarray(0, ce);
      let index = we.lastIndexOf(10);
      if (index === -1) {
        Q = we;
        continue;
      }
      hash.update(we.subarray(0, index + 1));
      let Ee = 0;
      if (j) {
        let index = we.indexOf(10);
        L(we.subarray(0, index));
        Ee = index + 1;
      }
      let lines = we.toString("utf8", Ee, index + 1).split(`
`);
      lines.pop();
      for (let line of lines) P(line);
      Q = we.subarray(index + 1);
    }
  } finally {
    await ee.close();
  }
  let terminated = Q.length === 0;
  let se = q - Q.length;
  if (tail === "judge" && Q.length > 0) {
    hash.update(Q);
    if (j) L(Q);
    else P(Q.toString("utf8"));
    se = q;
  }
  return {
    kept: R,
    dropped: x,
    consumed: start + se,
    digest: hash.digest("hex"),
    terminated,
    split,
  };
}
//@ chunk-s61vbvea.js:23698-23802 placement
function toCharCodes(e) {
  let uint16Array = new Uint16Array(e.length);
  for (let j = 0; j < e.length; j++) uint16Array[j] = e.charCodeAt(j);
  return uint16Array;
}
//@ chunk-s61vbvea.js:23802-23947 placement
function kmpFailureTable(e) {
  let int32Array = new Int32Array(e.length);
  for (let j = 1, s = 0; j < e.length; j++) {
    while (s > 0 && e[j] !== e[s]) s = int32Array[s - 1];
    if (e[j] === e[s]) s++;
    int32Array[j] = s;
  }
  return int32Array;
}
//@ chunk-s61vbvea.js:23947-23964 placement
var FINDER_PREFIX_CHARS = 8;
var FINDER_CACHE_MAX = 1024;
//@ chunk-s61vbvea.js:23964-24692 placement
/**
 * 为大文本创建子串查找器：先用首段 indexOf 定位，再用 KMP 精确匹配，压缩周期性重复的命中，返回按位置二分查找下一次出现的函数（结果缓存）。
 */
function createSubstringFinder(e) {
  let haystackCodes;
  let cache = new Map();
  return (s) => {
    let cached = cache.get(s);
    if (cached !== undefined) return cached;
    let sliced = s.slice(0, FINDER_PREFIX_CHARS);
    let firstIndex = s.length > e.length ? -1 : e.indexOf(sliced);
    if (firstIndex === -1) {
      let q = () => -1;
      cache.set(s, q);
      return q;
    }
    let needleCodes = toCharCodes(s);
    let failure = kmpFailureTable(needleCodes);
    let period = needleCodes.length - failure.at(-1);
    let starts = [];
    let runEnds = [];
    let codes = (haystackCodes ??= toCharCodes(e));
    for (let q = firstIndex, Q = 0; q < codes.length; q++) {
      if (Q === 0) {
        let index = e.indexOf(sliced, q);
        if (index === -1) break;
        q = index + sliced.length - 1;
        Q = sliced.length - 1;
      }
      let Z = codes[q];
      while (Q > 0 && Z !== needleCodes[Q]) Q = failure[Q - 1];
      if (Z === needleCodes[Q]) Q++;
      if (Q === needleCodes.length) {
        let ee = q + 1 - needleCodes.length;
        let ae = runEnds.length - 1;
        if (ae >= 0 && ee - runEnds[ae] === period) runEnds[ae] = ee;
        else {
          starts.push(ee);
          runEnds.push(ee);
        }
        Q = failure[Q - 1];
      }
    }
    let findNext = (q) => {
      let Q = 0;
      let Z = runEnds.length;
      while (Q < Z) {
        let ae = (Q + Z) >> 1;
        if (runEnds[ae] < q) Q = ae + 1;
        else Z = ae;
      }
      let ee = starts[Q];
      if (ee === undefined) return -1;
      return q > ee ? ee + Math.ceil((q - ee) / period) * period : ee;
    };
    if (starts.length <= FINDER_CACHE_MAX) cache.set(s, findNext);
    return findNext;
  };
}
//@ chunk-s61vbvea.js:24692-24722 placement
var WORD_CHAR_RE = /[\p{L}\p{N}_@#./\\]/u;
//@ chunk-s61vbvea.js:24722-25109 placement
/**
 * 判断匹配是否独立成词：前面（跳过开括号类字符）不是词字符，后面（跳过闭括号类字符）是结尾或空白；带缓存区间。
 */
function isWordBoundaryMatch(e, n, r, s, h, y, S) {
  if (!y) {
    let R = n - 1;
    while (R >= s && OPENING_PUNCT_RE.test(e[R]))
      R = R <= S.openersTo && R >= S.openersFrom ? S.openersFrom - 1 : R - 1;
    if (n - 1 >= s && R < n - 1) {
      S.openersFrom = Math.max(R + 1, s);
      S.openersTo = n - 1;
    }
    if (R >= s && WORD_CHAR_RE.test(e[R])) return false;
  }
  let w = r;
  while (w < h && CLOSING_PUNCT_RE.test(e[w]))
    w = w >= S.closersFrom && w < S.closersTo ? S.closersTo : w + 1;
  w = Math.min(w, h);
  if (w > r) {
    S.closersFrom = r;
    S.closersTo = w;
  }
  return w >= h || /\s/.test(e[w]);
}
//@ chunk-s61vbvea.js:25109-25184 placement
function emptySpanBudget() {
  return {
    openersFrom: 0,
    openersTo: -1,
    closersFrom: 0,
    closersTo: 0,
  };
}
//@ chunk-s61vbvea.js:25184-25346 placement
/**
 * 找出文本中与历史内容相同的区间（多种匹配方式合并）。
 */
function findHistoryCopySpans(e, n, substringFinder = createSubstringFinder(e)) {
  let s = pickHistoryCopy(e, n, substringFinder, true, "anyCopy");
  return mergeSpans([
    ...s.spans,
    ...pickHistoryCopy(e, n, substringFinder, false, "anyCopy").spans,
    ...(s.skipped ? pickHistoryCopy(e, n, substringFinder, true, "standingCopy").spans : []),
  ]);
}
//@ chunk-s61vbvea.js:25346-26375 placement
function pickHistoryCopy(e, n, r, s, h) {
  let y = [];
  let S = [];
  let skipped = false;
  let sorted = uniq(n)
    .filter((x) => x !== "")
    .sort((x, P) => P.length - x.length);
  for (let x of sorted) {
    let P = r(x);
    let j = [];
    let G = [];
    let L = emptySpanBudget();
    let q = 0;
    let Q = 0;
    let Z = y[0]?.from ?? e.length;
    let ee = 0;
    let ae = 0;
    for (;;) {
      let se = P(ee);
      if (se === -1) break;
      let re = se + x.length;
      if (re > Z || se < Q) {
        while (q < y.length && se >= y[q].from) {
          Q = y[q].to;
          q++;
        }
        Z = y[q]?.from ?? e.length;
        if (re <= Q) {
          ee = Q - x.length + 1;
          continue;
        }
        let he = se >= Q && re <= Z;
        let Se = false;
        if (!he && isWordBoundaryMatch(e, se, re, Q, Z, se === ae, L)) {
          let ce = se < Q ? P(Q) : -1;
          let we = ce !== -1 && ce < Math.min(re, Z);
          if (we && h === "standingCopy") {
            let ie = Q;
            while (ie < ce && /\s/.test(e[ie])) ie++;
            we = ie === ce && isWordBoundaryMatch(e, ce, ce + x.length, Q, Z, ce === Q, emptySpanBudget());
          }
          if (we) skipped = true;
          else {
            G.push({
              from: se,
              to: re,
            });
            Se = true;
          }
        }
        if (se >= Q && re > Z) {
          Q = y[q].to;
          q++;
          Z = y[q]?.from ?? e.length;
          ee = re;
        } else ee = Math.max(se, Q);
        ae = s && Se ? Math.max(re, Q) : Q;
        continue;
      }
      if (isWordBoundaryMatch(e, se, re, Q, Z, se === ae, L)) {
        j.push({
          from: se,
          to: re,
        });
        ae = re;
      }
      ee = re;
    }
    if (s) {
      if (j.length > 0 || G.length > 0) y = mergeSpans([...y, ...j, ...G]);
      continue;
    }
    if (j.length > 0) y = [...y, ...j].sort((se, re) => se.from - re.from);
    if (G.length > 0) S = mergeSpans([...S, ...G]);
  }
  return {
    spans: S.length === 0 ? y : mergeSpans([...y, ...S]),
    skipped,
  };
}
//@ chunk-s61vbvea.js:26375-26538 placement
function mergeSpans(e) {
  let n = [];
  for (let r of e.sort((s, h) => s.from - h.from)) {
    let last = n.at(-1);
    if (last !== undefined && r.from < last.to) last.to = Math.max(last.to, r.to);
    else
      n.push({
        ...r,
      });
  }
  return n;
}
//@ chunk-s61vbvea.js:26538-26707 placement
/**
 * 合并重叠或相接的区间。
 */
function mergeAdjacentSpans(e) {
  let n = [];
  for (let r of [...e].sort((s, h) => s.from - h.from)) {
    let last = n.at(-1);
    if (last !== undefined && r.from <= last.to) last.to = Math.max(last.to, r.to);
    else
      n.push({
        ...r,
      });
  }
  return n;
}
//@ chunk-s61vbvea.js:26707-26978 placement
function findAllMatches(e, charCodes) {
  let r = kmpFailureTable(charCodes);
  if (r.at(-1) === 0) return;
  let s = [];
  for (let j = 0, y = 0; j < e.length; j++) {
    while (y > 0 && e[j] !== charCodes[y]) y = r[y - 1];
    if (e[j] === charCodes[y]) y++;
    if (y === charCodes.length) {
      let S = j + 1 - charCodes.length;
      let last = s.at(-1);
      if (last !== undefined && S <= last.to) last.to = j + 1;
      else
        s.push({
          from: S,
          to: j + 1,
        });
      y = r[y - 1];
    }
  }
  return s;
}
//@ chunk-s61vbvea.js:26978-27253 placement
/**
 * 在文本中找出各粘贴内容出现的区间（含 < 的内容用 KMP 全匹配），合并后返回。
 */
function findPasteSpans(e, n, substringFinder = createSubstringFinder(e)) {
  let s = [];
  let h;
  for (let y of uniq(n)) {
    if (y === "") continue;
    let S = substringFinder(y);
    let w =
      y.includes("<") && S(0) !== -1 ? findAllMatches((h ??= toCharCodes(e)), toCharCodes(y)) : undefined;
    if (w !== undefined) {
      for (let R of w) s.push(R);
      continue;
    }
    for (let R = S(0); R !== -1; R = S(R + y.length))
      s.push({
        from: R,
        to: R + y.length,
      });
  }
  return mergeAdjacentSpans(s);
}
//@ chunk-s61vbvea.js:27253-27619 placement
/**
 * 找出文本中带 id 的开/闭标签标记，按位置排序。
 */
function findTagMarkers(e) {
  let n = [];
  for (let [r, s] of [
    [PASTED_CONTENT_OPEN_PREFIX, true],
    [PASTED_CONTENT_CLOSE_PREFIX, false],
  ])
    for (let index = e.indexOf(r); index !== -1; index = e.indexOf(r, index + 1)) {
      let y = index + r.length;
      let sliced = e.slice(y, y + PASTE_ID_LENGTH);
      let w = y + PASTE_ID_LENGTH;
      if (!isPasteIdHex(sliced)) continue;
      if (s) {
        if (e.startsWith(PASTED_CONTENT_LINE_END, w))
          n.push({
            at: index,
            end: w + PASTED_CONTENT_LINE_END.length,
            id: sliced,
            opens: s,
          });
      } else if (
        e.startsWith('">', w) &&
        (index === 0 ||
          e[index - 1] ===
            `
`)
      )
        n.push({
          at: index,
          end: w + 2,
          id: sliced,
          opens: s,
        });
    }
  return n.sort((r, s) => r.at - s.at);
}
//@ chunk-s61vbvea.js:27619-28298 placement
/**
 * 在文本中配对开/闭标签标记，生成区块（含正文范围），跳过与排除区间重叠或被指定文本包含的标记。
 */
function findTaggedBlocks(e, n = [], r = []) {
  let markers = findTagMarkers(e);
  let isExcluded = (R) =>
    r.some((x) => x !== "" && e.slice(Math.max(0, R.at - x.length + 1), R.end + x.length - 1).includes(x));
  let y = Array(markers.length + 1).fill(markers.length);
  for (let j = markers.length - 1; j >= 0; j--) {
    let x = markers[j];
    y[j] = findOverlappingSpan(n, x.at, x.end) === -1 && !isExcluded(x) ? j : y[j + 1];
  }
  let closersById = new Map();
  markers.forEach((marker, x) => {
    if (!marker.opens) {
      let P = closersById.get(marker.id);
      if (P === undefined) closersById.set(marker.id, [x]);
      else P.push(x);
    }
  });
  let blocks = [];
  markers.forEach((marker, x) => {
    if (!marker.opens) return;
    let P = closersById.get(marker.id) ?? [];
    let j = y[x + 1];
    let G = 0;
    let L = P.length;
    while (G < L) {
      let Z = (G + L) >> 1;
      if (P[Z] <= j) G = Z + 1;
      else L = Z;
    }
    let q = P[G - 1];
    if (q === undefined || q <= x || markers[q].at < marker.end) return;
    let Q = markers[q];
    blocks.push({
      from: marker.at,
      to:
        e[Q.end] ===
        `
`
          ? Q.end + 1
          : Q.end,
      bodyFrom: marker.end,
      bodyTo: Math.max(marker.end, Q.at - 1),
    });
  });
  return blocks;
}
//@ chunk-s61vbvea.js:28298-28425 placement
function findOverlappingSpan(e, n, end) {
  let s = 0;
  let h = e.length;
  while (s < h) {
    let y = (s + h) >> 1;
    if (e[y].to <= n) s = y + 1;
    else h = y;
  }
  return s < e.length && e[s].from < end ? s : -1;
}
//@ chunk-s61vbvea.js:28425-28680 placement
/**
 * 合并区块与额外区间（取并集，保留正文范围）。
 */
function mergeBlocks(historyCopySpans, taggedBlocks) {
  let sorted = [
    ...taggedBlocks,
    ...historyCopySpans.map((h) => ({
      ...h,
      bodyFrom: h.from,
      bodyTo: h.to,
    })),
  ].sort((h, y) => h.from - y.from || y.to - h.to);
  let s = [];
  for (let h of sorted) {
    let last = s.at(-1);
    if (last !== undefined && h.from < last.to) {
      if (h.to > last.to) {
        last.to = h.to;
        last.bodyTo = h.bodyTo;
      }
    } else
      s.push({
        ...h,
      });
  }
  return s;
}
//@ chunk-s61vbvea.js:28680-29131 placement
/**
 * 按区块重组文本：区块外的片段经转换，区块内的正文经渲染并用开/闭标记包裹，控制前后空行。
 */
function renderWithBlocks(e, n, r, escapePastedContentTag) {
  let parts = [];
  let trailingNewlines = 0;
  let atStart = true;
  let push = (j) => {
    if (j === "") return;
    parts.push(j);
    atStart = false;
    let G = 0;
    while (
      G < j.length &&
      j[j.length - 1 - G] ===
        `
`
    )
      G++;
    trailingNewlines = G === j.length ? trailingNewlines + G : G;
  };
  let pos = 0;
  let afterBlock = false;
  let flushUntil = (j) => {
    let G = escapePastedContentTag(e.slice(pos, j));
    if (G !== "")
      push(
        (afterBlock
          ? `
`
          : "") + G,
      );
  };
  for (let j of n) {
    let from = j.from;
    while (
      from > pos &&
      e[from - 1] ===
        `
`
    )
      from--;
    flushUntil(from);
    let L = r(e.slice(j.bodyFrom, j.bodyTo));
    push(
      atStart || trailingNewlines === 0
        ? `

`
        : trailingNewlines === 1
          ? `
`
          : "",
    );
    push(`${L.opener}${L.body}
${L.closer}`);
    pos = j.to;
    while (
      e[pos] ===
      `
`
    )
      pos++;
    afterBlock = true;
  }
  flushUntil(e.length);
  return parts.join("");
}
//@ chunk-s61vbvea.js:29131-29220 placement
/**
 * 判断历史记录是否仍在等待/欠一次屏幕检查。
 */
var isScreeningPendingEntry = (e) =>
  e.promptSubmitted === undefined && (e.screeningPending === true || e.screeningOwed === true);
//@ chunk-s61vbvea.js:29220-29250 placement
/**
 * 值未变化时返回 undefined，否则返回新值。
 */
var unchangedOrUndefined = (e, text) => (text === e ? undefined : text);
//@ chunk-s61vbvea.js:29250-29487 placement
function getHistoryEntryForCommand(e, placed, r) {
  let { screened, unanswered } = r;
  let historyEntry = e.historyEntry;
  let S =
    screened?.dropped === true ||
    (unanswered === "skipped" && screened === undefined && isScreeningPendingEntry(e));
  if (historyEntry === undefined || S) return;
  let w =
    screened === undefined ? unchangedOrUndefined(e.value, e.promptSubmitted?.text) : screened.rewritten;
  return w === undefined ? historyEntry : placed(historyEntry, w);
}
export {
  lastTextBlockText,
  findHistoryCopySpans,
  HISTORY_FILE_RETRY_OPTIONS,
  getHistoryEntryForCommand,
  unchangedOrUndefined,
  isScreeningPendingEntry,
  openHistoryFile,
  HistoryFileError,
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
