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
import { maskModelIdIfRelayed } from "./telemetry/otlpRelay.js";
import { logEvent } from "../services/analytics/index.js";
import { P3 } from "../../vendor/diff/libesm/patch/create.js";
import { convertLeadingTabsToSpaces } from "./file.js";

//@ chunk-6zvepy0r.js:1397-1522 placement
function splitLinesKeepEol(e) {
  let n = [];
  let r = 0;
  while (r < e.length) {
    let index = e.indexOf(
      `
`,
      r,
    );
    let s = index === -1 ? e.length : index + 1;
    n.push(e.slice(r, s));
    r = s;
  }
  return n;
}
//@ chunk-6zvepy0r.js:1522-1641 placement
function pushDiffRun(e, n, r) {
  let i = e.kinds.length - 1;
  if (n !== 0 && e.kinds[i] === n) e.counts[i] += r;
  else {
    e.kinds.push(n);
    e.counts.push(r);
  }
}
//@ chunk-6zvepy0r.js:1641-2464 placement
function myersDiff(oldIds, newIds, r, maxSearchSteps) {
  let s = oldIds.length;
  let f = newIds.length;
  let h = s + f;
  let S = h + 1;
  let w = new Int32Array(2 * h + 3).fill(-2);
  let y = -1;
  while (y + 1 < s && y + 1 < f && oldIds[y + 1] === newIds[y + 1]) y++;
  if (y + 1 >= s && y + 1 >= f) return new Uint8Array(0);
  w[S] = y;
  let uint8Array = new Uint8Array(4096);
  let P = 0;
  let x = [0];
  let v = [0];
  let E = -h;
  let O = h;
  for (let idx = 1; idx <= h; idx++) {
    let max = Math.max(E, -idx);
    let min = Math.min(O, idx);
    let R = min >= max ? ((min - max) >> 1) + 1 : 0;
    if (Date.now() > r || P + R > maxSearchSteps) return;
    x.push(P);
    v.push(max);
    if (P + R > uint8Array.length * 8) {
      let uint8Array_2 = new Uint8Array(Math.max(uint8Array.length * 2, ((P + R) >> 3) + 1));
      uint8Array_2.set(uint8Array);
      uint8Array = uint8Array_2;
    }
    for (let N = max; N <= min && N <= O; N += 2) {
      let W = P++;
      let G = N + S;
      let H = w[G - 1];
      let B = w[G + 1];
      if (H !== -2) w[G - 1] = -2;
      let q = B !== -2 && B - N >= 0 && B - N < f;
      let he = H !== -2 && H + 1 < s;
      if (!q && !he) {
        w[G] = -2;
        continue;
      }
      if (!he || (q && H < B)) {
        y = B;
        uint8Array[W >> 3] |= 1 << (W & 7);
      } else y = H + 1;
      let Z = y - N;
      while (Z + 1 < f && y + 1 < s && oldIds[y + 1] === newIds[Z + 1]) {
        Z++;
        y++;
      }
      if (y + 1 >= s && Z + 1 >= f) return traceMyersPath(uint8Array, x, v, idx, N);
      w[G] = y;
      if (y + 1 >= s) O = Math.min(O, N - 1);
      if (Z + 1 >= f) E = Math.max(E, N + 1);
    }
  }
  return;
}
//@ chunk-6zvepy0r.js:2464-2606 placement
function traceMyersPath(uint8Array, n, r, i, s) {
  let uint8Array_2 = new Uint8Array(i);
  let h = s;
  for (let S = i; S > 0; S--) {
    let w = n[S] + ((h - r[S]) >> 1);
    let y = (uint8Array[w >> 3] >> (w & 7)) & 1;
    uint8Array_2[S - 1] = y;
    h += y ? 1 : -1;
  }
  return uint8Array_2;
}
//@ chunk-6zvepy0r.js:2606-2815 placement
function buildDiffRuns(oldIds, newIds, r) {
  let i = {
    kinds: [],
    counts: [],
  };
  let s = 0;
  let f = 0;
  let h = () => {
    let S = 0;
    while (s < oldIds.length && f < newIds.length && oldIds[s] === newIds[f]) {
      s++;
      f++;
      S++;
    }
    if (S > 0) pushDiffRun(i, 0, S);
  };
  h();
  for (let S of r) {
    if (S) {
      f++;
      pushDiffRun(i, 1, 1);
    } else {
      s++;
      pushDiffRun(i, 2, 1);
    }
    h();
  }
  return i;
}
//@ chunk-6zvepy0r.js:2815-3219 placement
/**
 * 去掉公共后缀后，若两侧没有共同元素则直接生成"全删+全增"的差异（受步数上限限制）；有共同元素时返回 "search" 表示需要完整搜索。
 */
function trySimpleDiff(oldIds, newIds, r, maxSearchSteps) {
  let min = Math.min(oldIds.length, newIds.length);
  let f = 0;
  while (f < min && oldIds[oldIds.length - 1 - f] === newIds[newIds.length - 1 - f]) f++;
  let h = oldIds.length - f;
  let S = newIds.length - f;
  let uint8Array = new Uint8Array(r);
  for (let b of newIds) uint8Array[b] = 1;
  for (let idx = 0; idx < h; idx++) if (uint8Array[oldIds[idx]]) return "search";
  uint8Array.fill(0);
  for (let b of oldIds) uint8Array[b] = 1;
  for (let idx = 0; idx < S; idx++) if (uint8Array[newIds[idx]]) return "search";
  if (h * S > maxSearchSteps) return;
  let y = {
    kinds: [],
    counts: [],
  };
  if (h > 0) pushDiffRun(y, 2, h);
  if (S > 0) pushDiffRun(y, 1, S);
  if (f > 0) pushDiffRun(y, 0, f);
  return y;
}
//@ chunk-6zvepy0r.js:3219-3931 placement
function formatUnifiedDiff(runs, oldLines, newLines, context) {
  let s = [];
  let f = 0;
  let h = 0;
  let S = [];
  let w = 1;
  let y = 1;
  let b = runs.kinds.length + 1;
  for (let idx = 0; idx < b; idx++) {
    let x = runs.kinds[idx] ?? 0;
    let v = runs.counts[idx] ?? 0;
    if (x !== 0) {
      if (!f) {
        f = w;
        h = y;
        if (idx > 0 && context > 0) {
          let min = Math.min(context, runs.counts[idx - 1]);
          for (let idx = y - 1 - min; idx < y - 1; idx++) S.push(" " + newLines[idx]);
          f -= min;
          h -= min;
        }
      }
      if (x === 1) {
        for (let idx = y - 1; idx < y - 1 + v; idx++) S.push("+" + newLines[idx]);
        y += v;
      } else {
        for (let idx = w - 1; idx < w - 1 + v; idx++) S.push("-" + oldLines[idx]);
        w += v;
      }
      continue;
    }
    if (f) {
      let E = v <= context * 2 && idx < b - 2;
      let O = E ? v : Math.min(v, context);
      for (let idx = y - 1; idx < y - 1 + O; idx++) S.push(" " + newLines[idx]);
      if (!E) {
        s.push({
          oldStart: f,
          oldLines: w - f + O,
          newStart: h,
          newLines: y - h + O,
          lines: S,
        });
        f = 0;
        h = 0;
        S = [];
      }
    }
    w += v;
    y += v;
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
//@ chunk-6zvepy0r.js:3931-4539 placement
/**
 * 逐行计算两段文本的统一差异：剥离公共前后缀、把行映射为整数 id，先尝试简单情况，否则在时间与步数限制内运行 Myers 算法；超时或超限返回 undefined，否则按上下文行数格式化输出。
 */
function computeUnifiedDiff(oldText, newText, { context, timeout, maxSearchSteps = 268435456 }) {
  let f = Date.now() + timeout;
  let oldLines = splitLinesKeepEol(oldText);
  let newLines = splitLinesKeepEol(newText);
  let min = Math.min(oldLines.length, newLines.length);
  let prefixLen = 0;
  while (prefixLen < min && oldLines[prefixLen] === newLines[prefixLen]) prefixLen++;
  let suffixLen = 0;
  while (
    suffixLen < min - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  )
    suffixLen++;
  let lineIds = new Map();
  let toIds = (D, M) => {
    let int32Array = new Int32Array(D.length - prefixLen);
    for (let R = prefixLen; R < M; R++) {
      let N = D[R];
      let W = lineIds.get(N);
      if (W === undefined) {
        W = lineIds.size;
        lineIds.set(N, W);
      }
      int32Array[R - prefixLen] = W;
    }
    return int32Array;
  };
  let oldIds = toIds(oldLines, oldLines.length);
  let newIds = toIds(newLines, newLines.length - suffixLen);
  newIds.set(oldIds.subarray(oldIds.length - suffixLen), newIds.length - suffixLen);
  let runs = trySimpleDiff(oldIds, newIds, lineIds.size, maxSearchSteps);
  if (runs === "search") {
    let D = myersDiff(oldIds, newIds, f, maxSearchSteps);
    runs = D && buildDiffRuns(oldIds, newIds, D);
  }
  if (runs === undefined) return;
  if (prefixLen > 0) {
    runs.kinds.unshift(0);
    runs.counts.unshift(prefixLen);
  }
  return formatUnifiedDiff(runs, oldLines, newLines, context);
}
//@ chunk-6zvepy0r.js:4539-4558 placement
/**
 * 生成差异时的上下文行数（3）。
 */
var DIFF_CONTEXT_LINES = 3;
var DIFF_TIMEOUT_MS = 5000;
//@ chunk-6zvepy0r.js:4558-4666 fingerprint = adjustHunkLineNumbers (1)
/**
 * 把 hunks 的 oldStart/newStart 统一平移 offset。
 */
function adjustHunkLineNumbers(hunks, offset) {
  if (offset === 0) return hunks;
  return hunks.map((hunk) => ({
    ...hunk,
    oldStart: hunk.oldStart + offset,
    newStart: hunk.newStart + offset,
  }));
}
//@ chunk-6zvepy0r.js:4666-5013 fingerprint = countLinesChanged (0.838)
/**
 * 统计 patch 的增删行数（新建文件时按内容行数），用于 tengu_file_changed 等。
 */
function countLinesChanged(patch, n, r, i) {
  let numAdditions = 0;
  let numRemovals = 0;
  if (patch.length === 0 && (r || i)) {
    numAdditions = r
      ? countCharInString(
          r,
          `
`,
        ) + 1
      : 0;
    numRemovals = i
      ? countCharInString(
          i,
          `
`,
        ) + 1
      : 0;
  } else {
    numAdditions = patch.reduce((acc, hunk) => acc + count(hunk.lines, (w) => w.startsWith("+")), 0);
    numRemovals = patch.reduce((acc, hunk) => acc + count(hunk.lines, (w) => w.startsWith("-")), 0);
  }
  addToTotalLinesChanged(numAdditions, numRemovals);
  getLocCounter()?.add(numAdditions, {
    type: "added",
    model: maskModelIdIfRelayed(n),
  });
  getLocCounter()?.add(numRemovals, {
    type: "removed",
    model: maskModelIdIfRelayed(n),
  });
  return {
    lines_added: numAdditions,
    lines_removed: numRemovals,
  };
}
//@ chunk-6zvepy0r.js:5013-5066 layout
/**
 * 记 tengu_file_changed 事件（参数同 countLinesChanged）。
 */
function logFileChanged(...e) {
  logEvent("tengu_file_changed", countLinesChanged(...e));
}
//@ chunk-6zvepy0r.js:5066-5360 fingerprint = getPatchFromContents (0.8)
/**
 * 由新旧内容生成结构化 patch：工具结果用快速 diff（带超时），显示用 structuredPatch；可忽略空白、单 hunk、制表符转空格。
 */
function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
  convertTabs = false,
  isForToolResult = false,
}) {
  let context = singleHunk ? 1e5 : DIFF_CONTEXT_LINES;
  let w =
    isForToolResult && !ignoreWhitespace
      ? computeUnifiedDiff(oldContent, newContent, {
          context,
          timeout: DIFF_TIMEOUT_MS,
        })
      : P3(filePath, filePath, oldContent, newContent, undefined, undefined, {
          ignoreWhitespace,
          context,
          timeout: DIFF_TIMEOUT_MS,
        })?.hunks;
  if (!w) return [];
  return convertTabs ? convertHunkLeadingTabs(w) : w;
}
//@ chunk-6zvepy0r.js:5360-5693 fingerprint = getPatchForDisplay (0.963)
/**
 * 对原内容依次应用编辑后生成用于显示的 patch。
 */
function getPatchForDisplay({ filePath, fileContents, edits, ignoreWhitespace = false }) {
  let result = P3(
    filePath,
    filePath,
    fileContents,
    edits.reduce((acc, edit) => {
      let { old_string, new_string } = edit;
      if ("replace_all" in edit ? edit.replace_all : false)
        return acc.replaceAll(old_string, () => new_string);
      else return acc.replace(old_string, () => new_string);
    }, fileContents),
    undefined,
    undefined,
    {
      context: DIFF_CONTEXT_LINES,
      ignoreWhitespace,
      timeout: DIFF_TIMEOUT_MS,
    },
  );
  if (!result) return [];
  return convertHunkLeadingTabs(result.hunks);
}
//@ chunk-6zvepy0r.js:5693-5790 placement
/**
 * hunk 每行内容的行首制表符转为空格。
 */
function convertHunkLeadingTabs(hunks) {
  return hunks.map((n) => ({
    ...n,
    lines: n.lines.map((line) => line.slice(0, 1) + convertLeadingTabsToSpaces(line.slice(1))),
  }));
}
export {
  getPatchForDisplay,
  DIFF_CONTEXT_LINES,
  adjustHunkLineNumbers,
  getPatchFromContents,
  DIFF_TIMEOUT_MS,
  convertHunkLeadingTabs,
  logFileChanged,
  countLinesChanged,
};
