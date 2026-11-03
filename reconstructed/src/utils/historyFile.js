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
import {
  createReadStream,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { transcriptLines } from "./backgroundSessionResume.js";
import { isENOENT, getErrnoCode } from "./errors.js";
import { publishWriteAtomic, O_NONBLOCK } from "./atomicPublishWrite.js";
import { K_s, V_s, CDi, RDi, GDn, isPasteIdHex, G_s } from "./pastedContent.js";
import { uniq } from "./collections.js";

//@ chunk-s61vbvea.js:20915-21013 placement
function aO(e) {
  if (typeof e === "string") return e;
  let at = e.at(-1);
  return at?.type === "text" ? at.text : null;
}
//@ chunk-s61vbvea.js:21152-21206 placement
var xnt = { stale: 1e4, retries: { retries: 3, minTimeout: 50 } };
/**
 * 按 \r 拆分历史文本行；含 U+2028/2029 的段若不是合法 JSON 则再按这两个字符拆开。
 */
//@ chunk-s61vbvea.js:21206-21367 placement
function splitHistoryLines(e) {
  return e.split("\r").flatMap((n) => {
    if (!/[\u2028\u2029]/.test(n)) return [n];
    try {
      return (JSON.parse(n), [n]);
    } catch {
      return n.split(/[\u2028\u2029]/);
    }
  });
}
//@ chunk-s61vbvea.js:21367-21428 placement
async function* SVo(e) {
  for await (let n of transcriptLines(e)) yield* splitHistoryLines(n);
}
/**
 * 流式扫描历史文件，统计匹配行；filter 模式下把未匹配的行原子写回（可保留原文件权限）。
 */
//@ chunk-s61vbvea.js:21428-21791 placement
async function filterHistoryFile(e, n, r, { fileMode: s = "default", beforeWrite: h } = {}) {
  let y = [],
    S = 0;
  try {
    for await (let R of SVo(createReadStream(e, { encoding: "utf8" })))
      if (n(R)) S++;
      else if (r === "filter") y.push(R);
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw error;
  }
  if (r !== "filter" || S === 0) return S;
  h?.();
  let w = s === "preserve" ? (await stat(e)).mode & 511 : void 0;
  return (
    await publishWriteAtomic(
      e,
      y.length
        ? `${y.join(`
`)}
`
        : "",
      { exactMode: w },
    ),
    S
  );
}
//@ chunk-s61vbvea.js:21791-21816 placement
class J2t extends Error {}
//@ chunk-s61vbvea.js:21816-21831 placement
var im = 4194304;
/**
 * 安全打开 history.jsonl（拒绝符号链接、特殊文件，校验哈希）
 */
//@ chunk-s61vbvea.js:21831-23698 placement
async function openHistoryFile(
  e,
  n,
  {
    start: start,
    end: end,
    tail: tail,
    expect: expect,
    verifiedHead: verifiedHead,
    residueBytes: residueBytes = 0,
  },
) {
  let R = [],
    x = 0,
    P = (re) => {
      let he = re.endsWith("\r") ? re.slice(0, -1) : re;
      if (n(he)) x++;
      else R.push(he);
    },
    j = !0,
    G = !1,
    L = (re) => {
      j = !1;
      let str = re.toString("utf8"),
        Se = str.endsWith("\r") ? str.slice(0, -1) : str;
      if (residueBytes <= 0 || re.length <= residueBytes || !n(Se)) {
        P(str);
        return;
      }
      ((G = !0),
        P(re.subarray(0, residueBytes).toString("utf8")),
        P(re.subarray(residueBytes).toString("utf8")));
    },
    q = 0,
    alloc = Buffer.alloc(0),
    Z = createHash("sha256"),
    ee;
  try {
    ee = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    let he = getErrnoCode(error);
    if (he === "ELOOP" || he === "ENXIO") throw new J2t("history.jsonl is not a regular file at open");
    throw error;
  }
  try {
    let stats = await ee.stat();
    if (
      !stats.isFile() ||
      (expect !== void 0 &&
        ((expect.ino !== 0 && stats.ino !== expect.ino) || stats.birthtimeMs !== expect.birthtimeMs))
    )
      throw new J2t("history.jsonl changed between its screen and the scan");
    if (verifiedHead !== void 0) {
      let Se = createHash("sha256"),
        ce = 0;
      while (ce < verifiedHead.bytes) {
        let alloc = Buffer.alloc(Math.min(im, verifiedHead.bytes - ce)),
          { bytesRead: bytesRead } = await ee.read(alloc, 0, alloc.length, ce);
        if (bytesRead === 0) break;
        (Se.update(alloc.subarray(0, bytesRead)), (ce += bytesRead));
      }
      if (ce !== verifiedHead.bytes || Se.digest("hex") !== verifiedHead.digest)
        throw new J2t("history.jsonl was rewritten under the head an earlier scan judged");
    }
    let max = Math.max(0, end - start);
    while (q < max) {
      let alloc_2 = Buffer.alloc(Math.min(im, max - q)),
        ce = 0;
      while (ce < alloc_2.length) {
        let { bytesRead: bytesRead } = await ee.read(alloc_2, ce, alloc_2.length - ce, start + q + ce);
        if (bytesRead === 0) break;
        ce += bytesRead;
      }
      if (ce === 0) break;
      q += ce;
      let we = alloc.length ? Buffer.concat([alloc, alloc_2.subarray(0, ce)]) : alloc_2.subarray(0, ce),
        index = we.lastIndexOf(10);
      if (index === -1) {
        alloc = we;
        continue;
      }
      Z.update(we.subarray(0, index + 1));
      let Ee = 0;
      if (j) {
        let index = we.indexOf(10);
        (L(we.subarray(0, index)), (Ee = index + 1));
      }
      let parts = we.toString("utf8", Ee, index + 1).split(`
`);
      parts.pop();
      for (let Me of parts) P(Me);
      alloc = we.subarray(index + 1);
    }
  } finally {
    await ee.close();
  }
  let ae = alloc.length === 0,
    se = q - alloc.length;
  if (tail === "judge" && alloc.length > 0) {
    if ((Z.update(alloc), j)) L(alloc);
    else P(alloc.toString("utf8"));
    se = q;
  }
  return { kept: R, dropped: x, consumed: start + se, digest: Z.digest("hex"), terminated: ae, split: G };
}
//@ chunk-s61vbvea.js:23698-23802 placement
function toCharCodes(e) {
  let uint16Array = new Uint16Array(e.length);
  for (let r = 0; r < e.length; r++) uint16Array[r] = e.charCodeAt(r);
  return uint16Array;
}
//@ chunk-s61vbvea.js:23802-23947 placement
function kmpFailureTable(e) {
  let int32Array = new Int32Array(e.length);
  for (let r = 1, s = 0; r < e.length; r++) {
    while (s > 0 && e[r] !== e[s]) s = int32Array[s - 1];
    if (e[r] === e[s]) s++;
    int32Array[r] = s;
  }
  return int32Array;
}
//@ chunk-s61vbvea.js:23947-23964 placement
var Px = 8,
  Ox = 1024;
/**
 * 为大文本创建子串查找器：先用首段 indexOf 定位，再用 KMP 精确匹配，压缩周期性重复的命中，返回按位置二分查找下一次出现的函数（结果缓存）。
 */
//@ chunk-s61vbvea.js:23964-24692 placement
function createSubstringFinder(e) {
  let haystackCodes,
    cache = new Map();
  return (s) => {
    let cached = cache.get(s);
    if (cached !== void 0) return cached;
    let sliced = s.slice(0, Px),
      firstIndex = s.length > e.length ? -1 : e.indexOf(sliced);
    if (firstIndex === -1) {
      let q = () => -1;
      return (cache.set(s, q), q);
    }
    let needleCodes = toCharCodes(s),
      failure = kmpFailureTable(needleCodes),
      period = needleCodes.length - failure.at(-1),
      starts = [],
      runEnds = [],
      codes = (haystackCodes ??= toCharCodes(e));
    for (let q = firstIndex, Q = 0; q < codes.length; q++) {
      if (Q === 0) {
        let index = e.indexOf(sliced, q);
        if (index === -1) break;
        ((q = index + sliced.length - 1), (Q = sliced.length - 1));
      }
      let Z = codes[q];
      while (Q > 0 && Z !== needleCodes[Q]) Q = failure[Q - 1];
      if (Z === needleCodes[Q]) Q++;
      if (Q === needleCodes.length) {
        let ee = q + 1 - needleCodes.length,
          ae = runEnds.length - 1;
        if (ae >= 0 && ee - runEnds[ae] === period) runEnds[ae] = ee;
        else (starts.push(ee), runEnds.push(ee));
        Q = failure[Q - 1];
      }
    }
    let findNext = (q) => {
      let Q = 0,
        Z = runEnds.length;
      while (Q < Z) {
        let ae = (Q + Z) >> 1;
        if (runEnds[ae] < q) Q = ae + 1;
        else Z = ae;
      }
      let ee = starts[Q];
      if (ee === void 0) return -1;
      return q > ee ? ee + Math.ceil((q - ee) / period) * period : ee;
    };
    if (starts.length <= Ox) cache.set(s, findNext);
    return findNext;
  };
}
//@ chunk-s61vbvea.js:24692-24722 placement
var Ix = /[\p{L}\p{N}_@#./\\]/u;
/**
 * 判断匹配是否独立成词：前面（跳过开括号类字符）不是词字符，后面（跳过闭括号类字符）是结尾或空白；带缓存区间。
 */
//@ chunk-s61vbvea.js:24722-25109 placement
function isWordBoundaryMatch(e, n, r, s, h, y, S) {
  if (!y) {
    let R = n - 1;
    while (R >= s && K_s.test(e[R])) R = R <= S.openersTo && R >= S.openersFrom ? S.openersFrom - 1 : R - 1;
    if (n - 1 >= s && R < n - 1) ((S.openersFrom = Math.max(R + 1, s)), (S.openersTo = n - 1));
    if (R >= s && Ix.test(e[R])) return !1;
  }
  let w = r;
  while (w < h && V_s.test(e[w])) w = w >= S.closersFrom && w < S.closersTo ? S.closersTo : w + 1;
  if (((w = Math.min(w, h)), w > r)) ((S.closersFrom = r), (S.closersTo = w));
  return w >= h || /\s/.test(e[w]);
}
//@ chunk-s61vbvea.js:25109-25184 placement
function am() {
  return { openersFrom: 0, openersTo: -1, closersFrom: 0, closersTo: 0 };
}
/**
 * 找出文本中与历史内容相同的区间（多种匹配方式合并）。
 */
//@ chunk-s61vbvea.js:25184-25346 placement
function findHistoryCopySpans(e, n, r = createSubstringFinder(e)) {
  let s = pickHistoryCopy(e, n, r, !0, "anyCopy");
  return mergeSpans([
    ...s.spans,
    ...pickHistoryCopy(e, n, r, !1, "anyCopy").spans,
    ...(s.skipped ? pickHistoryCopy(e, n, r, !0, "standingCopy").spans : []),
  ]);
}
//@ chunk-s61vbvea.js:25346-26375 placement
function pickHistoryCopy(e, n, r, s, h) {
  let y = [],
    S = [],
    w = !1,
    sorted = uniq(n)
      .filter((x) => x !== "")
      .sort((x, P) => P.length - x.length);
  for (let x of sorted) {
    let P = r(x),
      j = [],
      G = [],
      L = am(),
      q = 0,
      Q = 0,
      Z = y[0]?.from ?? e.length,
      ee = 0,
      ae = 0;
    for (;;) {
      let se = P(ee);
      if (se === -1) break;
      let re = se + x.length;
      if (re > Z || se < Q) {
        while (q < y.length && se >= y[q].from) ((Q = y[q].to), q++);
        if (((Z = y[q]?.from ?? e.length), re <= Q)) {
          ee = Q - x.length + 1;
          continue;
        }
        let he = se >= Q && re <= Z,
          Se = !1;
        if (!he && isWordBoundaryMatch(e, se, re, Q, Z, se === ae, L)) {
          let ce = se < Q ? P(Q) : -1,
            we = ce !== -1 && ce < Math.min(re, Z);
          if (we && h === "standingCopy") {
            let ie = Q;
            while (ie < ce && /\s/.test(e[ie])) ie++;
            we = ie === ce && isWordBoundaryMatch(e, ce, ce + x.length, Q, Z, ce === Q, am());
          }
          if (we) w = !0;
          else (G.push({ from: se, to: re }), (Se = !0));
        }
        if (se >= Q && re > Z) ((Q = y[q].to), q++, (Z = y[q]?.from ?? e.length), (ee = re));
        else ee = Math.max(se, Q);
        ae = s && Se ? Math.max(re, Q) : Q;
        continue;
      }
      if (isWordBoundaryMatch(e, se, re, Q, Z, se === ae, L)) (j.push({ from: se, to: re }), (ae = re));
      ee = re;
    }
    if (s) {
      if (j.length > 0 || G.length > 0) y = mergeSpans([...y, ...j, ...G]);
      continue;
    }
    if (j.length > 0) y = [...y, ...j].sort((se, re) => se.from - re.from);
    if (G.length > 0) S = mergeSpans([...S, ...G]);
  }
  return { spans: S.length === 0 ? y : mergeSpans([...y, ...S]), skipped: w };
}
//@ chunk-s61vbvea.js:26375-26538 placement
function mergeSpans(e) {
  let n = [];
  for (let r of e.sort((s, h) => s.from - h.from)) {
    let at = n.at(-1);
    if (at !== void 0 && r.from < at.to) at.to = Math.max(at.to, r.to);
    else n.push({ ...r });
  }
  return n;
}
/**
 * 合并重叠或相接的区间。
 */
//@ chunk-s61vbvea.js:26538-26707 placement
function mergeAdjacentSpans(e) {
  let n = [];
  for (let r of [...e].sort((s, h) => s.from - h.from)) {
    let at = n.at(-1);
    if (at !== void 0 && r.from <= at.to) at.to = Math.max(at.to, r.to);
    else n.push({ ...r });
  }
  return n;
}
//@ chunk-s61vbvea.js:26707-26978 placement
function findAllMatches(e, n) {
  let r = kmpFailureTable(n);
  if (r.at(-1) === 0) return;
  let s = [];
  for (let h = 0, y = 0; h < e.length; h++) {
    while (y > 0 && e[h] !== n[y]) y = r[y - 1];
    if (e[h] === n[y]) y++;
    if (y === n.length) {
      let S = h + 1 - n.length,
        at = s.at(-1);
      if (at !== void 0 && S <= at.to) at.to = h + 1;
      else s.push({ from: S, to: h + 1 });
      y = r[y - 1];
    }
  }
  return s;
}
/**
 * 在文本中找出各粘贴内容出现的区间（含 < 的内容用 KMP 全匹配），合并后返回。
 */
//@ chunk-s61vbvea.js:26978-27253 placement
function findPasteSpans(e, n, r = createSubstringFinder(e)) {
  let s = [],
    h;
  for (let y of uniq(n)) {
    if (y === "") continue;
    let S = r(y),
      w = y.includes("<") && S(0) !== -1 ? findAllMatches((h ??= toCharCodes(e)), toCharCodes(y)) : void 0;
    if (w !== void 0) {
      for (let R of w) s.push(R);
      continue;
    }
    for (let R = S(0); R !== -1; R = S(R + y.length)) s.push({ from: R, to: R + y.length });
  }
  return mergeAdjacentSpans(s);
}
/**
 * 找出文本中带 id 的开/闭标签标记，按位置排序。
 */
//@ chunk-s61vbvea.js:27253-27619 placement
function findTagMarkers(e) {
  let n = [];
  for (let [r, s] of [
    [CDi, !0],
    [RDi, !1],
  ])
    for (let index = e.indexOf(r); index !== -1; index = e.indexOf(r, index + 1)) {
      let y = index + r.length,
        sliced = e.slice(y, y + GDn),
        w = y + GDn;
      if (!isPasteIdHex(sliced)) continue;
      if (s) {
        if (e.startsWith(G_s, w)) n.push({ at: index, end: w + G_s.length, id: sliced, opens: s });
      } else if (
        e.startsWith('">', w) &&
        (index === 0 ||
          e[index - 1] ===
            `
`)
      )
        n.push({ at: index, end: w + 2, id: sliced, opens: s });
    }
  return n.sort((r, s) => r.at - s.at);
}
/**
 * 在文本中配对开/闭标签标记，生成区块（含正文范围），跳过与排除区间重叠或被指定文本包含的标记。
 */
//@ chunk-s61vbvea.js:27619-28298 placement
function findTaggedBlocks(e, n = [], r = []) {
  let markers = findTagMarkers(e),
    isExcluded = (R) =>
      r.some((x) => x !== "" && e.slice(Math.max(0, R.at - x.length + 1), R.end + x.length - 1).includes(x)),
    fill = Array(markers.length + 1).fill(markers.length);
  for (let R = markers.length - 1; R >= 0; R--) {
    let x = markers[R];
    fill[R] = findOverlappingSpan(n, x.at, x.end) === -1 && !isExcluded(x) ? R : fill[R + 1];
  }
  let closersById = new Map();
  markers.forEach((R, x) => {
    if (!R.opens) {
      let P = closersById.get(R.id);
      if (P === void 0) closersById.set(R.id, [x]);
      else P.push(x);
    }
  });
  let blocks = [];
  return (
    markers.forEach((R, x) => {
      if (!R.opens) return;
      let P = closersById.get(R.id) ?? [],
        j = fill[x + 1],
        G = 0,
        L = P.length;
      while (G < L) {
        let Z = (G + L) >> 1;
        if (P[Z] <= j) G = Z + 1;
        else L = Z;
      }
      let q = P[G - 1];
      if (q === void 0 || q <= x || markers[q].at < R.end) return;
      let Q = markers[q];
      blocks.push({
        from: R.at,
        to:
          e[Q.end] ===
          `
`
            ? Q.end + 1
            : Q.end,
        bodyFrom: R.end,
        bodyTo: Math.max(R.end, Q.at - 1),
      });
    }),
    blocks
  );
}
//@ chunk-s61vbvea.js:28298-28425 placement
function findOverlappingSpan(e, n, r) {
  let s = 0,
    h = e.length;
  while (s < h) {
    let y = (s + h) >> 1;
    if (e[y].to <= n) s = y + 1;
    else h = y;
  }
  return s < e.length && e[s].from < r ? s : -1;
}
/**
 * 合并区块与额外区间（取并集，保留正文范围）。
 */
//@ chunk-s61vbvea.js:28425-28680 placement
function mergeBlocks(e, n) {
  let sorted = [...n, ...e.map((h) => ({ ...h, bodyFrom: h.from, bodyTo: h.to }))].sort(
      (h, y) => h.from - y.from || y.to - h.to,
    ),
    s = [];
  for (let h of sorted) {
    let at = s.at(-1);
    if (at !== void 0 && h.from < at.to) {
      if (h.to > at.to) ((at.to = h.to), (at.bodyTo = h.bodyTo));
    } else s.push({ ...h });
  }
  return s;
}
/**
 * 按区块重组文本：区块外的片段经转换，区块内的正文经渲染并用开/闭标记包裹，控制前后空行。
 */
//@ chunk-s61vbvea.js:28680-29131 placement
function renderWithBlocks(e, n, r, s) {
  let parts = [],
    trailingNewlines = 0,
    atStart = !0,
    push = (j) => {
      if (j === "") return;
      (parts.push(j), (atStart = !1));
      let G = 0;
      while (
        G < j.length &&
        j[j.length - 1 - G] ===
          `
`
      )
        G++;
      trailingNewlines = G === j.length ? trailingNewlines + G : G;
    },
    pos = 0,
    afterBlock = !1,
    flushUntil = (j) => {
      let G = s(e.slice(pos, j));
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
    (push(
      atStart || trailingNewlines === 0
        ? `

`
        : trailingNewlines === 1
          ? `
`
          : "",
    ),
      push(`${L.opener}${L.body}
${L.closer}`),
      (pos = j.to));
    while (
      e[pos] ===
      `
`
    )
      pos++;
    afterBlock = !0;
  }
  return (flushUntil(e.length), parts.join(""));
}
//@ chunk-s61vbvea.js:29131-29220 placement
var Znt = (e) => e.promptSubmitted === void 0 && (e.screeningPending === !0 || e.screeningOwed === !0);
//@ chunk-s61vbvea.js:29220-29250 placement
var EKt = (e, n) => (n === e ? void 0 : n);
//@ chunk-s61vbvea.js:29250-29487 placement
function getHistoryEntryForCommand(e, n, r) {
  let { screened: screened, unanswered: unanswered } = r,
    historyEntry = e.historyEntry,
    S = screened?.dropped === !0 || (unanswered === "skipped" && screened === void 0 && Znt(e));
  if (historyEntry === void 0 || S) return;
  let w = screened === void 0 ? EKt(e.value, e.promptSubmitted?.text) : screened.rewritten;
  return w === void 0 ? historyEntry : n(historyEntry, w);
}

export {
  aO,
  findHistoryCopySpans,
  xnt,
  getHistoryEntryForCommand,
  EKt,
  Znt,
  openHistoryFile,
  J2t,
  SVo,
  splitHistoryLines,
  filterHistoryFile,
  createSubstringFinder,
  renderWithBlocks,
  mergeBlocks,
  findTaggedBlocks,
  mergeAdjacentSpans,
  findPasteSpans,
};
