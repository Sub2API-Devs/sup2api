/**
 * utils/diff.ts
 *
 * 结构化 patch 生成、行号平移、增删行统计与 tengu_file_changed 事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/diff.ts
 * pieces: chunk-6zvepy0r.js (15)
 * attribution: placement 10, fingerprint 4, layout 1
 */
import { countCharInString } from "./stringUtils.js";
import { count } from "./collections.js";
import { addToTotalLinesChanged, getLocCounter } from "../bootstrap/state.js";
import { pTn } from "./telemetry/otlpRelay.js";
import { logEvent } from "../services/analytics/index.js";
import { P3 } from "../../vendor/diff/libesm/patch/create.js";
import { convertLeadingTabsToSpaces } from "./file.js";

//@ chunk-6zvepy0r.js:1397-1522 placement
function splitLinesKeepEol(e) {
  let n = [],
    r = 0;
  while (r < e.length) {
    let index = e.indexOf(
        `
`,
        r,
      ),
      s = index === -1 ? e.length : index + 1;
    (n.push(e.slice(r, s)), (r = s));
  }
  return n;
}
//@ chunk-6zvepy0r.js:1522-1641 placement
function pushDiffRun(e, n, r) {
  let i = e.kinds.length - 1;
  if (n !== 0 && e.kinds[i] === n) e.counts[i] += r;
  else (e.kinds.push(n), e.counts.push(r));
}
//@ chunk-6zvepy0r.js:1641-2464 placement
function myersDiff(e, n, r, i) {
  let s = e.length,
    f = n.length,
    h = s + f,
    S = h + 1,
    fill = new Int32Array(2 * h + 3).fill(-2),
    y = -1;
  while (y + 1 < s && y + 1 < f && e[y + 1] === n[y + 1]) y++;
  if (y + 1 >= s && y + 1 >= f) return new Uint8Array(0);
  fill[S] = y;
  let uint8Array = new Uint8Array(4096),
    P = 0,
    x = [0],
    v = [0],
    E = -h,
    O = h;
  for (let D = 1; D <= h; D++) {
    let max = Math.max(E, -D),
      min = Math.min(O, D),
      R = min >= max ? ((min - max) >> 1) + 1 : 0;
    if (Date.now() > r || P + R > i) return;
    if ((x.push(P), v.push(max), P + R > uint8Array.length * 8)) {
      let uint8Array_2 = new Uint8Array(Math.max(uint8Array.length * 2, ((P + R) >> 3) + 1));
      (uint8Array_2.set(uint8Array), (uint8Array = uint8Array_2));
    }
    for (let N = max; N <= min && N <= O; N += 2) {
      let W = P++,
        G = N + S,
        H = fill[G - 1],
        B = fill[G + 1];
      if (H !== -2) fill[G - 1] = -2;
      let q = B !== -2 && B - N >= 0 && B - N < f,
        he = H !== -2 && H + 1 < s;
      if (!q && !he) {
        fill[G] = -2;
        continue;
      }
      if (!he || (q && H < B)) ((y = B), (uint8Array[W >> 3] |= 1 << (W & 7)));
      else y = H + 1;
      let Z = y - N;
      while (Z + 1 < f && y + 1 < s && e[y + 1] === n[Z + 1]) (Z++, y++);
      if (y + 1 >= s && Z + 1 >= f) return traceMyersPath(uint8Array, x, v, D, N);
      if (((fill[G] = y), y + 1 >= s)) O = Math.min(O, N - 1);
      if (Z + 1 >= f) E = Math.max(E, N + 1);
    }
  }
  return;
}
//@ chunk-6zvepy0r.js:2464-2606 placement
function traceMyersPath(e, n, r, i, s) {
  let uint8Array = new Uint8Array(i),
    h = s;
  for (let S = i; S > 0; S--) {
    let w = n[S] + ((h - r[S]) >> 1),
      y = (e[w >> 3] >> (w & 7)) & 1;
    ((uint8Array[S - 1] = y), (h += y ? 1 : -1));
  }
  return uint8Array;
}
//@ chunk-6zvepy0r.js:2606-2815 placement
function buildDiffRuns(e, n, r) {
  let i = { kinds: [], counts: [] },
    s = 0,
    f = 0,
    h = () => {
      let S = 0;
      while (s < e.length && f < n.length && e[s] === n[f]) (s++, f++, S++);
      if (S > 0) pushDiffRun(i, 0, S);
    };
  h();
  for (let S of r) {
    if (S) (f++, pushDiffRun(i, 1, 1));
    else (s++, pushDiffRun(i, 2, 1));
    h();
  }
  return i;
}
/**
 * 去掉公共后缀后，若两侧没有共同元素则直接生成"全删+全增"的差异（受步数上限限制）；有共同元素时返回 "search" 表示需要完整搜索。
 */
//@ chunk-6zvepy0r.js:2815-3219 placement
function trySimpleDiff(e, n, r, i) {
  let min = Math.min(e.length, n.length),
    f = 0;
  while (f < min && e[e.length - 1 - f] === n[n.length - 1 - f]) f++;
  let h = e.length - f,
    S = n.length - f,
    uint8Array = new Uint8Array(r);
  for (let b of n) uint8Array[b] = 1;
  for (let b = 0; b < h; b++) if (uint8Array[e[b]]) return "search";
  uint8Array.fill(0);
  for (let b of e) uint8Array[b] = 1;
  for (let b = 0; b < S; b++) if (uint8Array[n[b]]) return "search";
  if (h * S > i) return;
  let y = { kinds: [], counts: [] };
  if (h > 0) pushDiffRun(y, 2, h);
  if (S > 0) pushDiffRun(y, 1, S);
  if (f > 0) pushDiffRun(y, 0, f);
  return y;
}
//@ chunk-6zvepy0r.js:3219-3931 placement
function formatUnifiedDiff(e, n, r, i) {
  let s = [],
    f = 0,
    h = 0,
    S = [],
    w = 1,
    y = 1,
    b = e.kinds.length + 1;
  for (let P = 0; P < b; P++) {
    let x = e.kinds[P] ?? 0,
      v = e.counts[P] ?? 0;
    if (x !== 0) {
      if (!f) {
        if (((f = w), (h = y), P > 0 && i > 0)) {
          let min = Math.min(i, e.counts[P - 1]);
          for (let O = y - 1 - min; O < y - 1; O++) S.push(" " + r[O]);
          ((f -= min), (h -= min));
        }
      }
      if (x === 1) {
        for (let E = y - 1; E < y - 1 + v; E++) S.push("+" + r[E]);
        y += v;
      } else {
        for (let E = w - 1; E < w - 1 + v; E++) S.push("-" + n[E]);
        w += v;
      }
      continue;
    }
    if (f) {
      let E = v <= i * 2 && P < b - 2,
        O = E ? v : Math.min(v, i);
      for (let D = y - 1; D < y - 1 + O; D++) S.push(" " + r[D]);
      if (!E)
        (s.push({ oldStart: f, oldLines: w - f + O, newStart: h, newLines: y - h + O, lines: S }),
          (f = 0),
          (h = 0),
          (S = []));
    }
    ((w += v), (y += v));
  }
  for (let P of s) {
    let x = [];
    for (let line of P.lines)
      if (
        line.endsWith(`
`)
      )
        x.push(line.slice(0, -1));
      else x.push(line, "\\ No newline at end of file");
    P.lines = x;
  }
  return s;
}
/**
 * 逐行计算两段文本的统一差异：剥离公共前后缀、把行映射为整数 id，先尝试简单情况，否则在时间与步数限制内运行 Myers 算法；超时或超限返回 undefined，否则按上下文行数格式化输出。
 */
//@ chunk-6zvepy0r.js:3931-4539 placement
function computeUnifiedDiff(
  oldText,
  newText,
  { context: context, timeout: timeout, maxSearchSteps: maxSearchSteps = 268435456 },
) {
  let f = Date.now() + timeout,
    oldLines = splitLinesKeepEol(oldText),
    newLines = splitLinesKeepEol(newText),
    min = Math.min(oldLines.length, newLines.length),
    prefixLen = 0;
  while (prefixLen < min && oldLines[prefixLen] === newLines[prefixLen]) prefixLen++;
  let suffixLen = 0;
  while (
    suffixLen < min - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  )
    suffixLen++;
  let lineIds = new Map(),
    toIds = (D, M) => {
      let int32Array = new Int32Array(D.length - prefixLen);
      for (let R = prefixLen; R < M; R++) {
        let N = D[R],
          W = lineIds.get(N);
        if (W === void 0) ((W = lineIds.size), lineIds.set(N, W));
        int32Array[R - prefixLen] = W;
      }
      return int32Array;
    },
    oldIds = toIds(oldLines, oldLines.length),
    newIds = toIds(newLines, newLines.length - suffixLen);
  newIds.set(oldIds.subarray(oldIds.length - suffixLen), newIds.length - suffixLen);
  let runs = trySimpleDiff(oldIds, newIds, lineIds.size, maxSearchSteps);
  if (runs === "search") {
    let D = myersDiff(oldIds, newIds, f, maxSearchSteps);
    runs = D && buildDiffRuns(oldIds, newIds, D);
  }
  if (runs === void 0) return;
  if (prefixLen > 0) (runs.kinds.unshift(0), runs.counts.unshift(prefixLen));
  return formatUnifiedDiff(runs, oldLines, newLines, context);
}
//@ chunk-6zvepy0r.js:4539-4558 placement
var zEt = 3,
  I7n = 5000;
/**
 * 把 hunks 的 oldStart/newStart 统一平移 offset。
 */
//@ chunk-6zvepy0r.js:4558-4666 fingerprint = adjustHunkLineNumbers (1)
function adjustHunkLineNumbers(hunks, offset) {
  if (offset === 0) return hunks;
  return hunks.map((r) => ({ ...r, oldStart: r.oldStart + offset, newStart: r.newStart + offset }));
}
/**
 * 统计 patch 的增删行数（新建文件时按内容行数），用于 tengu_file_changed 等。
 */
//@ chunk-6zvepy0r.js:4666-5013 fingerprint = countLinesChanged (0.838)
function countLinesChanged(e, n, r, i) {
  let s = 0,
    f = 0;
  if (e.length === 0 && (r || i))
    ((s = r
      ? countCharInString(
          r,
          `
`,
        ) + 1
      : 0),
      (f = i
        ? countCharInString(
            i,
            `
`,
          ) + 1
        : 0));
  else
    ((s = e.reduce((acc, hunk) => acc + count(hunk.lines, (w) => w.startsWith("+")), 0)),
      (f = e.reduce((acc, hunk) => acc + count(hunk.lines, (w) => w.startsWith("-")), 0)));
  return (
    addToTotalLinesChanged(s, f),
    getLocCounter()?.add(s, { type: "added", model: pTn(n) }),
    getLocCounter()?.add(f, { type: "removed", model: pTn(n) }),
    { lines_added: s, lines_removed: f }
  );
}
/**
 * 记 tengu_file_changed 事件（参数同 countLinesChanged）。
 */
//@ chunk-6zvepy0r.js:5013-5066 layout
function logFileChanged(...e) {
  logEvent("tengu_file_changed", countLinesChanged(...e));
}
/**
 * 由新旧内容生成结构化 patch：工具结果用快速 diff（带超时），显示用 structuredPatch；可忽略空白、单 hunk、制表符转空格。
 */
//@ chunk-6zvepy0r.js:5066-5360 fingerprint = getPatchFromContents (0.8)
function getPatchFromContents({
  filePath: filePath,
  oldContent: oldContent,
  newContent: newContent,
  ignoreWhitespace: ignoreWhitespace = !1,
  singleHunk: singleHunk = !1,
  convertTabs: convertTabs = !1,
  isForToolResult: isForToolResult = !1,
}) {
  let S = singleHunk ? 1e5 : zEt,
    w =
      isForToolResult && !ignoreWhitespace
        ? computeUnifiedDiff(oldContent, newContent, { context: S, timeout: I7n })
        : P3(filePath, filePath, oldContent, newContent, void 0, void 0, {
            ignoreWhitespace: ignoreWhitespace,
            context: S,
            timeout: I7n,
          })?.hunks;
  if (!w) return [];
  return convertTabs ? convertHunkLeadingTabs(w) : w;
}
/**
 * 对原内容依次应用编辑后生成用于显示的 patch。
 */
//@ chunk-6zvepy0r.js:5360-5693 fingerprint = getPatchForDisplay (0.963)
function getPatchForDisplay({
  filePath: filePath,
  fileContents: fileContents,
  edits: edits,
  ignoreWhitespace: ignoreWhitespace = !1,
}) {
  let result = P3(
    filePath,
    filePath,
    fileContents,
    edits.reduce((f, edit) => {
      let { old_string: old_string, new_string: new_string } = edit;
      if ("replace_all" in edit ? edit.replace_all : !1) return f.replaceAll(old_string, () => new_string);
      else return f.replace(old_string, () => new_string);
    }, fileContents),
    void 0,
    void 0,
    { context: zEt, ignoreWhitespace: ignoreWhitespace, timeout: I7n },
  );
  if (!result) return [];
  return convertHunkLeadingTabs(result.hunks);
}
/**
 * hunk 每行内容的行首制表符转为空格。
 */
//@ chunk-6zvepy0r.js:5693-5790 placement
function convertHunkLeadingTabs(e) {
  return e.map((n) => ({
    ...n,
    lines: n.lines.map((line) => line.slice(0, 1) + convertLeadingTabsToSpaces(line.slice(1))),
  }));
}

export {
  getPatchForDisplay,
  zEt,
  adjustHunkLineNumbers,
  getPatchFromContents,
  I7n,
  convertHunkLeadingTabs,
  logFileChanged,
  countLinesChanged,
};
