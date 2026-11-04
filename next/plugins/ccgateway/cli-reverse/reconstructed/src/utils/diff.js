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
import { structuredPatch } from "../../vendor/diff/libesm/patch/create.js";
import { convertLeadingTabsToSpaces } from "./file.js";

//@ chunk-6zvepy0r.js:1397-1522 placement
function splitLinesKeepEol(text) {
  let lines = [];
  let lineStart = 0;
  while (lineStart < text.length) {
    let index = text.indexOf(
      `
`,
      lineStart,
    );
    let nextLineStart = index === -1 ? text.length : index + 1;
    lines.push(text.slice(lineStart, nextLineStart));
    lineStart = nextLineStart;
  }
  return lines;
}
//@ chunk-6zvepy0r.js:1522-1641 placement
function pushDiffRun(result, kind, count) {
  let lastIndex = result.kinds.length - 1;
  if (kind !== 0 && result.kinds[lastIndex] === kind) result.counts[lastIndex] += count;
  else {
    result.kinds.push(kind);
    result.counts.push(count);
  }
}
//@ chunk-6zvepy0r.js:1641-2464 placement
function myersDiff(oldIds, newIds, deadlineMs, maxSearchSteps) {
  let oldLength = oldIds.length;
  let newLength = newIds.length;
  let maxD = oldLength + newLength;
  let offset = maxD + 1;
  let frontier = new Int32Array(2 * maxD + 3).fill(-2);
  let prefixLength = -1;
  while (
    prefixLength + 1 < oldLength &&
    prefixLength + 1 < newLength &&
    oldIds[prefixLength + 1] === newIds[prefixLength + 1]
  )
    prefixLength++;
  if (prefixLength + 1 >= oldLength && prefixLength + 1 >= newLength) return new Uint8Array(0);
  frontier[offset] = prefixLength;
  let uint8Array = new Uint8Array(4096);
  let stepCount = 0;
  let traceSteps = [0];
  let traceBounds = [0];
  let minDiagonal = -maxD;
  let maxDiagonal = maxD;
  for (let idx = 1; idx <= maxD; idx++) {
    let max = Math.max(minDiagonal, -idx);
    let min = Math.min(maxDiagonal, idx);
    let diagonalSpan = min >= max ? ((min - max) >> 1) + 1 : 0;
    if (Date.now() > deadlineMs || stepCount + diagonalSpan > maxSearchSteps) return;
    traceSteps.push(stepCount);
    traceBounds.push(max);
    if (stepCount + diagonalSpan > uint8Array.length * 8) {
      let uint8Array_2 = new Uint8Array(
        Math.max(uint8Array.length * 2, ((stepCount + diagonalSpan) >> 3) + 1),
      );
      uint8Array_2.set(uint8Array);
      uint8Array = uint8Array_2;
    }
    for (let diagonal = max; diagonal <= min && diagonal <= maxDiagonal; diagonal += 2) {
      let stepIndex = stepCount++;
      let frontierIndex = diagonal + offset;
      let leftX = frontier[frontierIndex - 1];
      let rightX = frontier[frontierIndex + 1];
      if (leftX !== -2) frontier[frontierIndex - 1] = -2;
      let rightIsValid = rightX !== -2 && rightX - diagonal >= 0 && rightX - diagonal < newLength;
      let leftIsValid = leftX !== -2 && leftX + 1 < oldLength;
      if (!rightIsValid && !leftIsValid) {
        frontier[frontierIndex] = -2;
        continue;
      }
      if (!leftIsValid || (rightIsValid && leftX < rightX)) {
        prefixLength = rightX;
        uint8Array[stepIndex >> 3] |= 1 << (stepIndex & 7);
      } else prefixLength = leftX + 1;
      let otherDiagonal = prefixLength - diagonal;
      while (
        otherDiagonal + 1 < newLength &&
        prefixLength + 1 < oldLength &&
        oldIds[prefixLength + 1] === newIds[otherDiagonal + 1]
      ) {
        otherDiagonal++;
        prefixLength++;
      }
      if (prefixLength + 1 >= oldLength && otherDiagonal + 1 >= newLength)
        return traceMyersPath(uint8Array, traceSteps, traceBounds, idx, diagonal);
      frontier[frontierIndex] = prefixLength;
      if (prefixLength + 1 >= oldLength) maxDiagonal = Math.min(maxDiagonal, diagonal - 1);
      if (otherDiagonal + 1 >= newLength) minDiagonal = Math.max(minDiagonal, diagonal + 1);
    }
  }
  return;
}
//@ chunk-6zvepy0r.js:2464-2606 placement
function traceMyersPath(uint8Array, traceSteps, traceBounds, traceLength, endDiagonal) {
  let uint8Array_2 = new Uint8Array(traceLength);
  let diagonal = endDiagonal;
  for (let stepIndex = traceLength; stepIndex > 0; stepIndex--) {
    let stepIndexInTrace = traceSteps[stepIndex] + ((diagonal - traceBounds[stepIndex]) >> 1);
    let moveBit = (uint8Array[stepIndexInTrace >> 3] >> (stepIndexInTrace & 7)) & 1;
    uint8Array_2[stepIndex - 1] = moveBit;
    diagonal += moveBit ? 1 : -1;
  }
  return uint8Array_2;
}
//@ chunk-6zvepy0r.js:2606-2815 placement
function buildDiffRuns(oldIds, newIds, moves) {
  let runs = {
    kinds: [],
    counts: [],
  };
  let oldIndex = 0;
  let newIndex = 0;
  let flushEqualRun = () => {
    let equalCount = 0;
    while (oldIndex < oldIds.length && newIndex < newIds.length && oldIds[oldIndex] === newIds[newIndex]) {
      oldIndex++;
      newIndex++;
      equalCount++;
    }
    if (equalCount > 0) pushDiffRun(runs, 0, equalCount);
  };
  flushEqualRun();
  for (let removed of moves) {
    if (removed) {
      newIndex++;
      pushDiffRun(runs, 1, 1);
    } else {
      oldIndex++;
      pushDiffRun(runs, 2, 1);
    }
    flushEqualRun();
  }
  return runs;
}
//@ chunk-6zvepy0r.js:2815-3219 placement
/**
 * 去掉公共后缀后，若两侧没有共同元素则直接生成"全删+全增"的差异（受步数上限限制）；有共同元素时返回 "search" 表示需要完整搜索。
 */
function trySimpleDiff(oldIds, newIds, alphabetSize, maxSearchSteps) {
  let min = Math.min(oldIds.length, newIds.length);
  let suffixLength = 0;
  while (
    suffixLength < min &&
    oldIds[oldIds.length - 1 - suffixLength] === newIds[newIds.length - 1 - suffixLength]
  )
    suffixLength++;
  let oldMidLength = oldIds.length - suffixLength;
  let newMidLength = newIds.length - suffixLength;
  let uint8Array = new Uint8Array(alphabetSize);
  for (let lineId of newIds) uint8Array[lineId] = 1;
  for (let idx = 0; idx < oldMidLength; idx++) if (uint8Array[oldIds[idx]]) return "search";
  uint8Array.fill(0);
  for (let lineId of oldIds) uint8Array[lineId] = 1;
  for (let idx = 0; idx < newMidLength; idx++) if (uint8Array[newIds[idx]]) return "search";
  if (oldMidLength * newMidLength > maxSearchSteps) return;
  let runs = {
    kinds: [],
    counts: [],
  };
  if (oldMidLength > 0) pushDiffRun(runs, 2, oldMidLength);
  if (newMidLength > 0) pushDiffRun(runs, 1, newMidLength);
  if (suffixLength > 0) pushDiffRun(runs, 0, suffixLength);
  return runs;
}
//@ chunk-6zvepy0r.js:3219-3931 placement
function formatUnifiedDiff(runs, oldLines, newLines, context) {
  let hunks = [];
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let hunkLines = [];
  let oldLineNo = 1;
  let newLineNo = 1;
  let runCount = runs.kinds.length + 1;
  for (let idx = 0; idx < runCount; idx++) {
    let kind = runs.kinds[idx] ?? 0;
    let count = runs.counts[idx] ?? 0;
    if (kind !== 0) {
      if (!hunkOldStart) {
        hunkOldStart = oldLineNo;
        hunkNewStart = newLineNo;
        if (idx > 0 && context > 0) {
          let min = Math.min(context, runs.counts[idx - 1]);
          for (let idx = newLineNo - 1 - min; idx < newLineNo - 1; idx++) hunkLines.push(" " + newLines[idx]);
          hunkOldStart -= min;
          hunkNewStart -= min;
        }
      }
      if (kind === 1) {
        for (let idx = newLineNo - 1; idx < newLineNo - 1 + count; idx++) hunkLines.push("+" + newLines[idx]);
        newLineNo += count;
      } else {
        for (let idx = oldLineNo - 1; idx < oldLineNo - 1 + count; idx++) hunkLines.push("-" + oldLines[idx]);
        oldLineNo += count;
      }
      continue;
    }
    if (hunkOldStart) {
      let isLastRun = count <= context * 2 && idx < runCount - 2;
      let trailingContext = isLastRun ? count : Math.min(count, context);
      for (let idx = newLineNo - 1; idx < newLineNo - 1 + trailingContext; idx++)
        hunkLines.push(" " + newLines[idx]);
      if (!isLastRun) {
        hunks.push({
          oldStart: hunkOldStart,
          oldLines: oldLineNo - hunkOldStart + trailingContext,
          newStart: hunkNewStart,
          newLines: newLineNo - hunkNewStart + trailingContext,
          lines: hunkLines,
        });
        hunkOldStart = 0;
        hunkNewStart = 0;
        hunkLines = [];
      }
    }
    oldLineNo += count;
    newLineNo += count;
  }
  for (let hunk of hunks) {
    let annotatedLines = [];
    for (let line of hunk.lines)
      if (
        line.endsWith(`
`)
      )
        annotatedLines.push(line.slice(0, -1));
      else annotatedLines.push(line, "\\ No newline at end of file");
    hunk.lines = annotatedLines;
  }
  return hunks;
}
//@ chunk-6zvepy0r.js:3931-4539 placement
/**
 * 逐行计算两段文本的统一差异：剥离公共前后缀、把行映射为整数 id，先尝试简单情况，否则在时间与步数限制内运行 Myers 算法；超时或超限返回 undefined，否则按上下文行数格式化输出。
 */
function computeUnifiedDiff(oldText, newText, { context, timeout, maxSearchSteps = 268435456 }) {
  let deadlineMs = Date.now() + timeout;
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
  let toIds = (text, endIndex) => {
    let int32Array = new Int32Array(text.length - prefixLen);
    for (let lineIndex = prefixLen; lineIndex < endIndex; lineIndex++) {
      let line = text[lineIndex];
      let lineId = lineIds.get(line);
      if (lineId === undefined) {
        lineId = lineIds.size;
        lineIds.set(line, lineId);
      }
      int32Array[lineIndex - prefixLen] = lineId;
    }
    return int32Array;
  };
  let oldIds = toIds(oldLines, oldLines.length);
  let newIds = toIds(newLines, newLines.length - suffixLen);
  newIds.set(oldIds.subarray(oldIds.length - suffixLen), newIds.length - suffixLen);
  let runs = trySimpleDiff(oldIds, newIds, lineIds.size, maxSearchSteps);
  if (runs === "search") {
    let traceBits = myersDiff(oldIds, newIds, deadlineMs, maxSearchSteps);
    runs = traceBits && buildDiffRuns(oldIds, newIds, traceBits);
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
//@ chunk-6zvepy0r.js:4558-4666 fingerprint (2.1.88 match: adjustHunkLineNumbers, 1)
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
//@ chunk-6zvepy0r.js:4666-5013 fingerprint (2.1.88 match: countLinesChanged, 0.838)
/**
 * 统计 patch 的增删行数（新建文件时按内容行数），用于 tengu_file_changed 等。
 */
function countLinesChanged(patch, modelId, fallbackAdditions, fallbackRemovals) {
  let numAdditions = 0;
  let numRemovals = 0;
  if (patch.length === 0 && (fallbackAdditions || fallbackRemovals)) {
    numAdditions = fallbackAdditions
      ? countCharInString(
          fallbackAdditions,
          `
`,
        ) + 1
      : 0;
    numRemovals = fallbackRemovals
      ? countCharInString(
          fallbackRemovals,
          `
`,
        ) + 1
      : 0;
  } else {
    numAdditions = patch.reduce((acc, hunk) => acc + count(hunk.lines, (line) => line.startsWith("+")), 0);
    numRemovals = patch.reduce((acc, hunk) => acc + count(hunk.lines, (line) => line.startsWith("-")), 0);
  }
  addToTotalLinesChanged(numAdditions, numRemovals);
  getLocCounter()?.add(numAdditions, {
    type: "added",
    model: maskModelIdIfRelayed(modelId),
  });
  getLocCounter()?.add(numRemovals, {
    type: "removed",
    model: maskModelIdIfRelayed(modelId),
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
function logFileChanged(...args) {
  logEvent("tengu_file_changed", countLinesChanged(...args));
}
//@ chunk-6zvepy0r.js:5066-5360 fingerprint (2.1.88 match: getPatchFromContents, 0.8)
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
  let hunks =
    isForToolResult && !ignoreWhitespace
      ? computeUnifiedDiff(oldContent, newContent, {
          context,
          timeout: DIFF_TIMEOUT_MS,
        })
      : structuredPatch(filePath, filePath, oldContent, newContent, undefined, undefined, {
          ignoreWhitespace,
          context,
          timeout: DIFF_TIMEOUT_MS,
        })?.hunks;
  if (!hunks) return [];
  return convertTabs ? convertHunkLeadingTabs(hunks) : hunks;
}
//@ chunk-6zvepy0r.js:5360-5693 fingerprint (2.1.88 match: getPatchForDisplay, 0.963)
/**
 * 对原内容依次应用编辑后生成用于显示的 patch。
 */
function getPatchForDisplay({ filePath, fileContents, edits, ignoreWhitespace = false }) {
  let result = structuredPatch(
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
  return hunks.map((hunk) => ({
    ...hunk,
    lines: hunk.lines.map((line) => line.slice(0, 1) + convertLeadingTabsToSpaces(line.slice(1))),
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
