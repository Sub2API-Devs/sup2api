/**
 * utils/readEditContext.ts
 *
 * 在大文件中按字节流定位匹配串并截取上下文行（UTF-8 边界、CRLF 规整、读取上限）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/readEditContext.ts
 * pieces: chunk-6zvepy0r.js (8)
 * attribution: fingerprint 3, file-local 2, layout 3
 */
import {
  DIFF_CONTEXT_LINES_BEFORE,
  MAX_DIFF_CONTEXT_BYTES,
  MAX_SETTINGS_FILE_BYTES,
  DIFF_CONTEXT_LINES_AFTER,
} from "./settings/settingsReview.js";
import { detectEncodingFromBom, decodeTextBuffer } from "./fileRead.js";

//@ chunk-6zvepy0r.js:18882-19567 fingerprint = scanForContext (0.932)
async function scanForContext(handle, needle, contextLines) {
  if (needle === "")
    return {
      content: "",
      lineOffset: 1,
      truncated: false,
    };
  let needleLF = Buffer.from(needle, "utf8");
  let nlCount = 0;
  for (let i = 0; i < needleLF.length; i++) if (needleLF[i] === DIFF_CONTEXT_LINES_BEFORE) nlCount++;
  let needleCRLF;
  let overlap = needleLF.length + nlCount - 1;
  let max = Math.max(MAX_DIFF_CONTEXT_BYTES, overlap);
  let buf = Buffer.allocUnsafe(max + overlap);
  let pos = 0;
  let linesBeforePos = 0;
  let prevTail = 0;
  while (pos < MAX_SETTINGS_FILE_BYTES) {
    let { bytesRead } = await handle.read(buf, prevTail, max, pos);
    if (bytesRead === 0) break;
    let viewLen = prevTail + bytesRead;
    if (pos === 0 && detectEncodingFromBom(buf.subarray(0, viewLen)) !== "utf8")
      return {
        content: "",
        lineOffset: 1,
        truncated: false,
      };
    let matchAt = indexOfWithin(buf, needleLF, viewLen);
    let matchLen = needleLF.length;
    if (matchAt === -1 && nlCount > 0) {
      needleCRLF ??= Buffer.from(
        needle.replaceAll(
          `
`,
          `\r
`,
        ),
        "utf8",
      );
      matchAt = indexOfWithin(buf, needleCRLF, viewLen);
      matchLen = needleCRLF.length;
    }
    if (matchAt !== -1) {
      let absMatch = pos - prevTail + matchAt;
      return await sliceContext(
        handle,
        buf,
        absMatch,
        matchLen,
        contextLines,
        linesBeforePos + countLineBreaksInRange(buf, 0, matchAt),
      );
    }
    pos += bytesRead;
    let nextTail = Math.min(overlap, viewLen);
    linesBeforePos += countLineBreaksInRange(buf, 0, viewLen - nextTail);
    prevTail = nextTail;
    buf.copyWithin(0, viewLen - prevTail, viewLen);
  }
  return {
    content: "",
    lineOffset: 1,
    truncated: pos >= MAX_SETTINGS_FILE_BYTES,
  };
}
//@ chunk-6zvepy0r.js:19567-19838 fingerprint = readCapped (0.874)
async function readCapped(handle) {
  let buf = Buffer.allocUnsafe(MAX_DIFF_CONTEXT_BYTES);
  let total = 0;
  for (;;) {
    if (total === buf.length) {
      let grown = Buffer.allocUnsafe(
        Math.min(buf.length * 2, MAX_SETTINGS_FILE_BYTES + MAX_DIFF_CONTEXT_BYTES),
      );
      buf.copy(grown, 0, 0, total);
      buf = grown;
    }
    let { bytesRead } = await handle.read(buf, total, buf.length - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
    if (total > MAX_SETTINGS_FILE_BYTES) return null;
  }
  return decodeTextBuffer(buf.subarray(0, total));
}
//@ chunk-6zvepy0r.js:19838-19909 file-local
function indexOfWithin(buf, needle, end) {
  let at = buf.indexOf(needle);
  return at === -1 || at + needle.length > end ? -1 : at;
}
//@ chunk-6zvepy0r.js:19909-19982 layout
function countLineBreaksInRange(buf, start, end) {
  let n = 0;
  for (let i = start; i < end; i++) if (buf[i] === DIFF_CONTEXT_LINES_BEFORE) n++;
  return n;
}
//@ chunk-6zvepy0r.js:19982-20017 layout
function isUtf8ContinuationByte(byte) {
  return (byte & 192) === 128;
}
//@ chunk-6zvepy0r.js:20017-20068 layout
function utf8SequenceLength(byte) {
  return byte >= 240 ? 4 : byte >= 224 ? 3 : byte >= 192 ? 2 : 1;
}
//@ chunk-6zvepy0r.js:20068-20164 file-local
function normalizeCRLF(buf, len) {
  let str = buf.toString("utf8", 0, len);
  return str.includes("\r")
    ? str.replaceAll(
        `\r
`,
        `
`,
      )
    : str;
}
//@ chunk-6zvepy0r.js:20164-20776 fingerprint = sliceContext (1)
async function sliceContext(handle, scratch, matchStart, matchLen, contextLines, linesBeforeMatch) {
  let backChunk = Math.min(matchStart, MAX_DIFF_CONTEXT_BYTES);
  let { bytesRead: backRead } = await handle.read(scratch, 0, backChunk, matchStart - backChunk);
  let ctxStart = matchStart;
  let nlSeen = 0;
  for (let i = backRead - 1; i >= 0 && nlSeen <= contextLines; i--) {
    if (scratch[i] === DIFF_CONTEXT_LINES_BEFORE) {
      nlSeen++;
      if (nlSeen > contextLines) break;
    }
    ctxStart--;
  }
  let backOffset = matchStart - backRead;
  for (
    let idx = 0;
    idx < 3 && ctxStart < matchStart && isUtf8ContinuationByte(scratch[ctxStart - backOffset]);
    idx++
  )
    ctxStart++;
  let ctxLength = matchStart - ctxStart;
  let lineOffset = linesBeforeMatch - countLineBreaksInRange(scratch, backRead - ctxLength, backRead) + 1;
  let end = matchStart + matchLen;
  let { bytesRead: fwdRead } = await handle.read(scratch, 0, MAX_DIFF_CONTEXT_BYTES, end);
  let stop = end;
  nlSeen = 0;
  for (let i = 0; i < fwdRead; i++) {
    stop++;
    if (scratch[i] === DIFF_CONTEXT_LINES_BEFORE) {
      nlSeen++;
      if (nlSeen >= contextLines + 1) break;
    }
  }
  for (let idx = 0; idx <= 3 && stop - 1 - idx >= end; idx++) {
    let byte = scratch[stop - 1 - idx - end];
    if (isUtf8ContinuationByte(byte)) continue;
    if (byte >= 192 && utf8SequenceLength(byte) > idx + 1) stop -= idx + 1;
    break;
  }
  if (stop > end && scratch[stop - 1 - end] === DIFF_CONTEXT_LINES_AFTER) stop--;
  let len = stop - ctxStart;
  let out = len <= scratch.length ? scratch : Buffer.allocUnsafe(len);
  let { bytesRead: outRead } = await handle.read(out, 0, len, ctxStart);
  return {
    content: normalizeCRLF(out, outRead),
    lineOffset,
    truncated: false,
  };
}
export { scanForContext, readCapped };
