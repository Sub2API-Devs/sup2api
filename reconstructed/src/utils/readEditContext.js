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
import { ae, ee, rnt, st } from "./settings/settingsReview.js";
import { detectEncodingFromBom, decodeTextBuffer } from "./fileRead.js";

//@ chunk-6zvepy0r.js:18882-19567 fingerprint = scanForContext (0.932)
async function scanForContext(handle, needle, contextLines) {
  if (needle === "") return { content: "", lineOffset: 1, truncated: !1 };
  let needleLF = Buffer.from(needle, "utf8"),
    s = 0;
  for (let x = 0; x < needleLF.length; x++) if (needleLF[x] === ae) s++;
  let needleCRLF,
    h = needleLF.length + s - 1,
    max = Math.max(ee, h),
    buf = Buffer.allocUnsafe(max + h),
    y = 0,
    b = 0,
    P = 0;
  while (y < rnt) {
    let { bytesRead: bytesRead } = await handle.read(buf, P, max, y);
    if (bytesRead === 0) break;
    let v = P + bytesRead;
    if (y === 0 && detectEncodingFromBom(buf.subarray(0, v)) !== "utf8")
      return { content: "", lineOffset: 1, truncated: !1 };
    let matchAt = indexOfWithin(buf, needleLF, v),
      matchLen = needleLF.length;
    if (matchAt === -1 && s > 0)
      ((needleCRLF ??= Buffer.from(
        needle.replaceAll(
          `
`,
          `\r
`,
        ),
        "utf8",
      )),
        (matchAt = indexOfWithin(buf, needleCRLF, v)),
        (matchLen = needleCRLF.length));
    if (matchAt !== -1) {
      let M = y - P + matchAt;
      return await sliceContext(
        handle,
        buf,
        M,
        matchLen,
        contextLines,
        b + countLineBreaksInRange(buf, 0, matchAt),
      );
    }
    y += bytesRead;
    let nextTail = Math.min(h, v);
    ((b += countLineBreaksInRange(buf, 0, v - nextTail)), (P = nextTail), buf.copyWithin(0, v - P, v));
  }
  return { content: "", lineOffset: 1, truncated: y >= rnt };
}
//@ chunk-6zvepy0r.js:19567-19838 fingerprint = readCapped (0.874)
async function readCapped(handle) {
  let buf = Buffer.allocUnsafe(ee),
    total = 0;
  for (;;) {
    if (total === buf.length) {
      let grown = Buffer.allocUnsafe(Math.min(buf.length * 2, rnt + ee));
      (buf.copy(grown, 0, 0, total), (buf = grown));
    }
    let { bytesRead: bytesRead } = await handle.read(buf, total, buf.length - total, total);
    if (bytesRead === 0) break;
    if (((total += bytesRead), total > rnt)) return null;
  }
  return decodeTextBuffer(buf.subarray(0, total));
}
//@ chunk-6zvepy0r.js:19838-19909 file-local
function indexOfWithin(buf, needle, end) {
  let at = buf.indexOf(needle);
  return at === -1 || at + needle.length > end ? -1 : at;
}
//@ chunk-6zvepy0r.js:19909-19982 layout
function countLineBreaksInRange(e, n, r) {
  let i = 0;
  for (let s = n; s < r; s++) if (e[s] === ae) i++;
  return i;
}
//@ chunk-6zvepy0r.js:19982-20017 layout
function isUtf8ContinuationByte(e) {
  return (e & 192) === 128;
}
//@ chunk-6zvepy0r.js:20017-20068 layout
function utf8SequenceLength(e) {
  return e >= 240 ? 4 : e >= 224 ? 3 : e >= 192 ? 2 : 1;
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
  let backChunk = Math.min(matchStart, ee),
    { bytesRead: backRead } = await handle.read(scratch, 0, backChunk, matchStart - backChunk),
    w = matchStart,
    y = 0;
  for (let R = backRead - 1; R >= 0 && y <= contextLines; R--) {
    if (scratch[R] === ae) {
      if ((y++, y > contextLines)) break;
    }
    w--;
  }
  let b = matchStart - backRead;
  for (let R = 0; R < 3 && w < matchStart && isUtf8ContinuationByte(scratch[w - b]); R++) w++;
  let P = matchStart - w,
    x = linesBeforeMatch - countLineBreaksInRange(scratch, backRead - P, backRead) + 1,
    v = matchStart + matchLen,
    { bytesRead: fwdRead } = await handle.read(scratch, 0, ee, v),
    O = v;
  y = 0;
  for (let R = 0; R < fwdRead; R++)
    if ((O++, scratch[R] === ae)) {
      if ((y++, y >= contextLines + 1)) break;
    }
  for (let R = 0; R <= 3 && O - 1 - R >= v; R++) {
    let N = scratch[O - 1 - R - v];
    if (isUtf8ContinuationByte(N)) continue;
    if (N >= 192 && utf8SequenceLength(N) > R + 1) O -= R + 1;
    break;
  }
  if (O > v && scratch[O - 1 - v] === st) O--;
  let D = O - w,
    out = D <= scratch.length ? scratch : Buffer.allocUnsafe(D),
    { bytesRead: outRead } = await handle.read(out, 0, D, w);
  return { content: normalizeCRLF(out, outRead), lineOffset: x, truncated: !1 };
}

export { scanForContext, readCapped };
