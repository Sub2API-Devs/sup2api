/**
 * utils/imageFormats.ts
 *
 * 图片/文档格式嗅探与 WebP 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jf14gxs3.js (21)
 * attribution: placement 20, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-jf14gxs3.js:191-276 placement
/**
 * MIME 类型到文件扩展名的映射。
 */
var MIME_TO_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
//@ chunk-jf14gxs3.js:688-845 placement
function sniffDocumentType(head) {
  if (head.subarray(0, 4).toString("latin1").toLowerCase() === "%pdf") return "pdf";
  if (head[0] === 80 && head[1] === 75 && head[2] === 3 && head[3] === 4) return "zip";
  return null;
}
//@ chunk-jf14gxs3.js:845-1486 placement
function detectHtmlDocument(head) {
  let head_2 = head.subarray(0, 32);
  let replaced = head_2.toString("latin1").replace(/[^\x20-\x7e]/g, ".");
  let lower = replaced.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<html"))
    return `HTML document (starts with "${replaced.slice(0, 24)}")`;
  if (lower.startsWith("<?xml") || lower.startsWith("<svg"))
    return `XML/SVG document (starts with "${replaced.slice(0, 24)}")`;
  if (lower.startsWith("{") || lower.startsWith("["))
    return `JSON/text (starts with "${replaced.slice(0, 24)}")`;
  let documentType = sniffDocumentType(head_2);
  if (documentType === "pdf") return "PDF document";
  if (documentType === "zip") return "ZIP archive (Office documents such as .pptx/.docx/.xlsx are ZIPs)";
  return `unrecognized bytes (hex: ${head_2.subarray(0, 8).toString("hex").replace(/(..)/g, "$1 ").trim()})`;
}
//@ chunk-jf14gxs3.js:1617-2382 placement
function parseWebpHeader(bytes) {
  if (bytes.length < 10) return;
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes.length >= 24)
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70)
    return {
      width: bytes.readUInt16LE(6),
      height: bytes.readUInt16LE(8),
    };
  let jpegSofOffset = findJpegSofOffset(bytes);
  if (jpegSofOffset !== undefined)
    return {
      height: bytes.readUInt16BE(jpegSofOffset + 5),
      width: bytes.readUInt16BE(jpegSofOffset + 7),
    };
  if (bytes[0] === 255 && bytes[1] === 216) return;
  if (
    bytes[0] === 82 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 70 &&
    bytes.length >= 30 &&
    bytes[8] === 87 &&
    bytes[9] === 69 &&
    bytes[10] === 66 &&
    bytes[11] === 80
  ) {
    let str = bytes.toString("ascii", 12, 16);
    if (str === "VP8 ")
      return {
        width: bytes.readUInt16LE(26) & 16383,
        height: bytes.readUInt16LE(28) & 16383,
      };
    if (str === "VP8L") {
      let uInt32LE = bytes.readUInt32LE(21);
      return {
        width: (uInt32LE & 16383) + 1,
        height: ((uInt32LE >> 14) & 16383) + 1,
      };
    }
    if (str === "VP8X")
      return {
        width: bytes.readUIntLE(24, 3) + 1,
        height: bytes.readUIntLE(27, 3) + 1,
      };
  }
  return;
}
//@ chunk-jf14gxs3.js:2460-2785 placement
/**
 * 在 JPEG 数据中查找第一个 SOF 帧头的偏移（跳过填充与无长度标记）。
 */
function findJpegSofOffset(bytes) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 255) {
      offset++;
      continue;
    }
    let marker = bytes[offset + 1];
    if (marker === 255) {
      offset++;
      continue;
    }
    if (
      marker !== undefined &&
      marker >= 192 &&
      marker <= 207 &&
      marker !== 196 &&
      marker !== 200 &&
      marker !== 204
    )
      return offset;
    if (marker === undefined || (marker >= 208 && marker <= 217) || marker === 1) {
      offset += 2;
      continue;
    }
    let uInt16BE = bytes.readUInt16BE(offset + 2);
    if (uInt16BE < 2) return;
    offset += 2 + uInt16BE;
  }
  return;
}
//@ chunk-jf14gxs3.js:2785-2844 placement
/**
 * 取 JPEG SOF 段的分量数（用于判断是否支持透明度等）。
 */
function jpegSofComponentCount(bytes) {
  let jpegSofOffset = findJpegSofOffset(bytes);
  return jpegSofOffset === undefined ? undefined : bytes[jpegSofOffset + 9];
}
//@ chunk-jf14gxs3.js:2844-2953 layout
function buffer(bytes) {
  let jpegSofOffset = findJpegSofOffset(bytes);
  if (jpegSofOffset === undefined) return false;
  let nextByte = bytes[jpegSofOffset + 1];
  return (nextByte === 192 || nextByte === 193 || nextByte === 194) && bytes[jpegSofOffset + 4] === 8;
}
//@ chunk-jf14gxs3.js:2953-3004 placement
var JPEG_BASE_SCAN_LIMIT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var JPEG_SCAN_PER_BYTE;
var buffer_2;
var JPEG_MARKER_PER_BYTE;
deferInit("chunk-jf14gxs3.js:2953", () => {
  JPEG_BASE_SCAN_LIMIT = 1100000;
  JPEG_SCAN_PER_BYTE = 64;
  buffer_2 = Buffer.from([255, 218]);
  JPEG_MARKER_PER_BYTE = 8192;
});
//@ chunk-jf14gxs3.js:3004-3509 placement
/**
 * 统计 JPEG 的扫描段数，超过上限或发现异常/不支持的标记时返回上限加一（用于识别解码代价过高的渐进式图片）。
 */
function countJpegScans(bytes, limit) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return 0;
  let markerCap = limit + bytes.length / JPEG_MARKER_PER_BYTE;
  let markerCount = 0;
  for (let index = bytes.indexOf(buffer_2); index !== -1; index = bytes.indexOf(buffer_2, index + 2))
    if (++markerCount > markerCap) return limit + 1;
  let segmentCap = JPEG_BASE_SCAN_LIMIT + bytes.length / JPEG_SCAN_PER_BYTE;
  let scans = 0;
  let offset = 2;
  for (let j = 0; scans <= limit; j++) {
    if (j > segmentCap) return limit + 1;
    if (bytes[offset] !== 255) offset = bytes.indexOf(255, offset);
    if (offset === -1 || offset + 3 >= bytes.length) break;
    let marker = bytes[offset + 1] ?? 0;
    if (marker === 255) {
      offset++;
      continue;
    }
    if (marker === 217) break;
    if (marker <= 1 || (marker >= 208 && marker <= 216)) {
      offset += 2;
      continue;
    }
    let uInt16BE = bytes.readUInt16BE(offset + 2);
    if (marker < 192 || uInt16BE < 2) return limit + 1;
    if (marker >= 201 && marker <= 207 && marker !== 204) return limit + 1;
    if (marker === 218) scans++;
    offset += 2 + uInt16BE;
  }
  return scans;
}
//@ chunk-jf14gxs3.js:3509-3706 placement
var PNG_IHDR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PNG_PLTE;
var PNG_TRNS;
var PNG_IDAT;
var PNG_IEND;
var PNG_EXIF;
var CRITICAL_PNG_CHUNKS;
var KEPT_ANCILLARY_PNG_CHUNKS;
var MAX_KEPT_CHUNK_BYTES;
var MAX_PNG_CHUNKS;
deferInit("chunk-jf14gxs3.js:3509", () => {
  PNG_IHDR = 1229472850;
  PNG_PLTE = 1347179589;
  PNG_TRNS = 1951551059;
  PNG_IDAT = 1229209940;
  PNG_IEND = 1229278788;
  PNG_EXIF = 1700284774;
  CRITICAL_PNG_CHUNKS = new Set([PNG_IHDR, PNG_PLTE, PNG_IDAT, PNG_IEND]);
  KEPT_ANCILLARY_PNG_CHUNKS = new Set([
    PNG_TRNS,
    1732332865,
    1665684045,
    1934772034,
    1933723988,
    1665745744,
    1766015824,
  ]);
  MAX_KEPT_CHUNK_BYTES = 4096;
  MAX_PNG_CHUNKS = 1e5;
});
//@ chunk-jf14gxs3.js:3706-4175 placement
/**
 * 去掉 PNG 的元数据块：只保留关键块与少量小的辅助块，块数过多时返回 null。
 */
function stripPngMetadata(bytes) {
  if (sniffImageMediaType(bytes) !== "image/png") return bytes;
  let keptTypes = new Set();
  let keptRanges = [[0, 8]];
  let offset = 8;
  for (let j = 0; offset + 12 <= bytes.length; j++) {
    if (j === MAX_PNG_CHUNKS) return null;
    let uInt32BE = bytes.readUInt32BE(offset);
    let uInt32BE_2 = bytes.readUInt32BE(offset + 4);
    let chunkEnd = offset + 12 + uInt32BE;
    if (chunkEnd > bytes.length) break;
    let keep =
      KEPT_ANCILLARY_PNG_CHUNKS.has(uInt32BE_2) &&
      uInt32BE <= MAX_KEPT_CHUNK_BYTES &&
      !keptTypes.has(uInt32BE_2);
    if (keep) keptTypes.add(uInt32BE_2);
    if (CRITICAL_PNG_CHUNKS.has(uInt32BE_2) || keep) {
      let last = keptRanges.at(-1);
      if (last !== undefined && last[1] === offset) last[1] = chunkEnd;
      else keptRanges.push([offset, chunkEnd]);
    }
    offset = chunkEnd;
    if (uInt32BE_2 === PNG_IEND) break;
  }
  let firstRange = keptRanges[0];
  if (keptRanges.length === 1 && firstRange !== undefined && firstRange[1] === bytes.length) return bytes;
  return Buffer.concat(keptRanges.map(([start, end]) => bytes.subarray(start, end)));
}
//@ chunk-jf14gxs3.js:4175-4470 placement
/**
 * 判断 PNG 是否可能含透明：非标准文件或带 alpha 的颜色类型返回 true，否则看 IDAT 之前是否有 tRNS。
 */
function pngMayHaveTransparency(bytes) {
  if (
    sniffImageMediaType(bytes) !== "image/png" ||
    bytes.length < 26 ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.readUInt32BE(12) !== PNG_IHDR
  )
    return true;
  let colorType = bytes[25];
  if (colorType !== 0 && colorType !== 2 && colorType !== 3) return true;
  let offset = 8;
  for (let i = 0; i < 1000 && offset + 8 <= bytes.length; i++) {
    let uInt32BE = bytes.readUInt32BE(offset + 4);
    if (uInt32BE === PNG_TRNS) return true;
    if (uInt32BE === PNG_IDAT) return false;
    offset += 12 + bytes.readUInt32BE(offset);
  }
  return true;
}
//@ chunk-jf14gxs3.js:4470-4725 placement
/**
 * 判断 PNG 的 eXIf 块中是否带方向标签。
 */
function pngHasExifOrientation(bytes) {
  if (sniffImageMediaType(bytes) !== "image/png") return false;
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    let uInt32BE = bytes.readUInt32BE(offset);
    if (bytes.readUInt32BE(offset + 4) === PNG_EXIF) {
      let chunk = bytes.subarray(offset + 8, offset + 8 + uInt32BE);
      if (chunk.includes("\x01\x12", 0, "latin1") || chunk.includes("\x12\x01", 0, "latin1")) return true;
    }
    offset += 12 + uInt32BE;
  }
  return false;
}
//@ chunk-jf14gxs3.js:4725-4750 placement
var VP8X_ALPHA_FLAG = 2;
var VP8X_ANIMATION_FLAG = 16;
var VP8X_ALPHA_WRITTEN = 32;
var MAX_WEBP_CHUNKS = 1000;
//@ chunk-jf14gxs3.js:4750-4961 placement
function parseRiffChunks(bytes, startOffset) {
  let chunks = [];
  let offset = startOffset;
  while (offset + 8 <= bytes.length && chunks.length < MAX_WEBP_CHUNKS) {
    let uInt32LE = bytes.readUInt32LE(offset + 4);
    let chunkEnd = offset + 8 + uInt32LE;
    if (chunkEnd > bytes.length) return null;
    chunks.push({
      fourCC: bytes.toString("latin1", offset, offset + 4),
      payload: bytes.subarray(offset + 8, chunkEnd),
    });
    offset = chunkEnd + (uInt32LE & 1);
  }
  return chunks;
}
//@ chunk-jf14gxs3.js:4961-5109 placement
function buildRiffChunk(fourCC, payload) {
  let header = Buffer.alloc(8);
  header.write(fourCC, 0, "ascii");
  header.writeUInt32LE(payload.length, 4);
  let padding = Buffer.alloc(payload.length & 1);
  return Buffer.concat([header, payload, padding]);
}
//@ chunk-jf14gxs3.js:5109-5279 placement
function buildWebpContainer(chunks) {
  let buffer = Buffer.concat([Buffer.from("WEBP", "ascii"), ...chunks]);
  let header = Buffer.alloc(8);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(buffer.length, 4);
  return Buffer.concat([header, buffer]);
}
//@ chunk-jf14gxs3.js:5279-5443 placement
/**
 * 判断 WebP 是否为带 VP8X 扩展头且设置了动画标志的文件。
 */
function isAnimatedWebp(bytes) {
  return (
    bytes.length >= 30 &&
    bytes.toString("latin1", 0, 4) === "RIFF" &&
    bytes.toString("latin1", 8, 12) === "WEBP" &&
    bytes.toString("latin1", 12, 16) === "VP8X" &&
    ((bytes[20] ?? 0) & VP8X_ALPHA_FLAG) !== 0
  );
}
//@ chunk-jf14gxs3.js:5443-5592 placement
/**
 * 判断 WebP 是否为无损（VP8L）编码。
 */
function isLosslessWebp(bytes) {
  if (sniffImageMediaType(bytes) !== "image/webp") return false;
  return (
    parseRiffChunks(bytes, 12)?.find(
      (riffChunk) =>
        riffChunk.fourCC === "VP8L" || riffChunk.fourCC === "VP8 " || riffChunk.fourCC === "ANMF",
    )?.fourCC === "VP8L"
  );
}
//@ chunk-jf14gxs3.js:5592-5733 placement
/**
 * 判断 WebP 是否带 alpha 通道（VP8X 的 alpha 标志或 VP8L 头中的 alpha 位），块解析失败时视为是。
 */
function webpHasAlpha(bytes) {
  let riffChunks = parseRiffChunks(bytes, 12);
  return (
    riffChunks === null ||
    riffChunks.some(
      ({ fourCC, payload }) =>
        (fourCC === "VP8X" && ((payload[0] ?? 0) & VP8X_ANIMATION_FLAG) !== 0) ||
        (fourCC === "VP8L" && ((payload[4] ?? 0) & 16) !== 0),
    )
  );
}
//@ chunk-jf14gxs3.js:5733-6622 placement
function inspectWebpChunks(bytes) {
  if (!isAnimatedWebp(bytes)) return null;
  let min = Math.min(bytes.length, 8 + bytes.readUInt32LE(4));
  let riffChunks = parseRiffChunks(bytes.subarray(0, min), 12);
  let vp8xChunk = riffChunks?.[0];
  let found = riffChunks?.find((riffChunk) => riffChunk.fourCC === "ANMF");
  if (!vp8xChunk || vp8xChunk.payload.length < 10 || !found || found.payload.length < 16) return null;
  let canvasWidth = vp8xChunk.payload.readUIntLE(4, 3) + 1;
  let canvasHeight = vp8xChunk.payload.readUIntLE(7, 3) + 1;
  let payload = found.payload;
  if (
    payload.readUIntLE(0, 3) !== 0 ||
    payload.readUIntLE(3, 3) !== 0 ||
    payload.readUIntLE(6, 3) + 1 !== canvasWidth ||
    payload.readUIntLE(9, 3) + 1 !== canvasHeight
  )
    return null;
  let riffChunks_2 = parseRiffChunks(found.payload, 16);
  let found_2 = riffChunks_2?.find((riffChunk) => riffChunk.fourCC === "VP8 " || riffChunk.fourCC === "VP8L");
  if (!found_2) return null;
  let webpContainer = buildWebpContainer([buildRiffChunk(found_2.fourCC, found_2.payload)]);
  let webpHeader = parseWebpHeader(webpContainer);
  if (webpHeader?.width !== canvasWidth || webpHeader.height !== canvasHeight) return null;
  let found_3 = riffChunks?.find((riffChunk) => riffChunk.fourCC === "ICCP");
  let alphaChunk =
    found_2.fourCC === "VP8 " ? riffChunks_2?.find((riffChunk) => riffChunk.fourCC === "ALPH") : undefined;
  if (!found_3 && !alphaChunk) return webpContainer;
  let vp8xPayload = Buffer.alloc(10);
  vp8xPayload[0] = (found_3 ? VP8X_ALPHA_WRITTEN : 0) | (alphaChunk ? VP8X_ANIMATION_FLAG : 0);
  vp8xPayload.writeUIntLE(canvasWidth - 1, 4, 3);
  vp8xPayload.writeUIntLE(canvasHeight - 1, 7, 3);
  return buildWebpContainer([
    buildRiffChunk("VP8X", vp8xPayload),
    ...(found_3 ? [buildRiffChunk("ICCP", found_3.payload)] : []),
    ...(alphaChunk ? [buildRiffChunk("ALPH", alphaChunk.payload)] : []),
    buildRiffChunk(found_2.fourCC, found_2.payload),
  ]);
}
export {
  parseWebpHeader,
  isAnimatedWebp,
  detectHtmlDocument,
  pngMayHaveTransparency,
  MIME_TO_EXTENSION,
  sniffDocumentType,
  inspectWebpChunks,
  countJpegScans,
  stripPngMetadata,
  jpegSofComponentCount,
  isLosslessWebp,
  webpHasAlpha,
  pngHasExifOrientation,
  buffer,
};
