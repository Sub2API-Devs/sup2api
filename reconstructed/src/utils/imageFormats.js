/**
 * utils/imageFormats.ts
 *
 * 图片/文档格式嗅探与 WebP 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p8kytbnw.js (20)
 * attribution: placement 20
 */
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";

//@ chunk-p8kytbnw.js:191-276 placement
/**
 * MIME 类型到文件扩展名的映射。
 */
var MIME_TO_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
//@ chunk-p8kytbnw.js:688-845 placement
function sniffDocumentType(n) {
  if (n.subarray(0, 4).toString("latin1").toLowerCase() === "%pdf") return "pdf";
  if (n[0] === 80 && n[1] === 75 && n[2] === 3 && n[3] === 4) return "zip";
  return null;
}
//@ chunk-p8kytbnw.js:845-1486 placement
function detectHtmlDocument(n) {
  let chunk = n.subarray(0, 32);
  let replaced = chunk.toString("latin1").replace(/[^\x20-\x7e]/g, ".");
  let lower = replaced.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<html"))
    return `HTML document (starts with "${replaced.slice(0, 24)}")`;
  if (lower.startsWith("<?xml") || lower.startsWith("<svg"))
    return `XML/SVG document (starts with "${replaced.slice(0, 24)}")`;
  if (lower.startsWith("{") || lower.startsWith("["))
    return `JSON/text (starts with "${replaced.slice(0, 24)}")`;
  let o = sniffDocumentType(chunk);
  if (o === "pdf") return "PDF document";
  if (o === "zip") return "ZIP archive (Office documents such as .pptx/.docx/.xlsx are ZIPs)";
  return `unrecognized bytes (hex: ${chunk.subarray(0, 8).toString("hex").replace(/(..)/g, "$1 ").trim()})`;
}
//@ chunk-p8kytbnw.js:1617-2382 placement
function parseWebpHeader(n) {
  if (n.length < 10) return;
  if (n[0] === 137 && n[1] === 80 && n[2] === 78 && n[3] === 71 && n.length >= 24)
    return {
      width: n.readUInt32BE(16),
      height: n.readUInt32BE(20),
    };
  if (n[0] === 71 && n[1] === 73 && n[2] === 70)
    return {
      width: n.readUInt16LE(6),
      height: n.readUInt16LE(8),
    };
  let jpegSofOffset = findJpegSofOffset(n);
  if (jpegSofOffset !== undefined)
    return {
      height: n.readUInt16BE(jpegSofOffset + 5),
      width: n.readUInt16BE(jpegSofOffset + 7),
    };
  if (n[0] === 255 && n[1] === 216) return;
  if (
    n[0] === 82 &&
    n[1] === 73 &&
    n[2] === 70 &&
    n[3] === 70 &&
    n.length >= 30 &&
    n[8] === 87 &&
    n[9] === 69 &&
    n[10] === 66 &&
    n[11] === 80
  ) {
    let str = n.toString("ascii", 12, 16);
    if (str === "VP8 ")
      return {
        width: n.readUInt16LE(26) & 16383,
        height: n.readUInt16LE(28) & 16383,
      };
    if (str === "VP8L") {
      let uInt32LE = n.readUInt32LE(21);
      return {
        width: (uInt32LE & 16383) + 1,
        height: ((uInt32LE >> 14) & 16383) + 1,
      };
    }
    if (str === "VP8X")
      return {
        width: n.readUIntLE(24, 3) + 1,
        height: n.readUIntLE(27, 3) + 1,
      };
  }
  return;
}
//@ chunk-p8kytbnw.js:2382-2707 placement
/**
 * 在 JPEG 数据中查找第一个 SOF 帧头的偏移（跳过填充与无长度标记）。
 */
function findJpegSofOffset(n) {
  if (n.length < 4 || n[0] !== 255 || n[1] !== 216) return;
  let e = 2;
  while (e + 9 < n.length) {
    if (n[e] !== 255) {
      e++;
      continue;
    }
    let t = n[e + 1];
    if (t === 255) {
      e++;
      continue;
    }
    if (t !== undefined && t >= 192 && t <= 207 && t !== 196 && t !== 200 && t !== 204) return e;
    if (t === undefined || (t >= 208 && t <= 217) || t === 1) {
      e += 2;
      continue;
    }
    let uInt16BE = n.readUInt16BE(e + 2);
    if (uInt16BE < 2) return;
    e += 2 + uInt16BE;
  }
  return;
}
//@ chunk-p8kytbnw.js:2707-2766 placement
/**
 * 取 JPEG SOF 段的分量数（用于判断是否支持透明度等）。
 */
function jpegSofComponentCount(n) {
  let jpegSofOffset = findJpegSofOffset(n);
  return jpegSofOffset === undefined ? undefined : n[jpegSofOffset + 9];
}
//@ chunk-p8kytbnw.js:2766-2817 placement
var JPEG_BASE_SCAN_LIMIT = 1100000;
var JPEG_SCAN_PER_BYTE = 64;
var buffer = Buffer.from([255, 218]);
var JPEG_MARKER_PER_BYTE = 8192;
//@ chunk-p8kytbnw.js:2817-3322 placement
/**
 * 统计 JPEG 的扫描段数，超过上限或发现异常/不支持的标记时返回上限加一（用于识别解码代价过高的渐进式图片）。
 */
function countJpegScans(bytes, limit) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return 0;
  let markerCap = limit + bytes.length / JPEG_MARKER_PER_BYTE;
  let markerCount = 0;
  for (let index = bytes.indexOf(buffer); index !== -1; index = bytes.indexOf(buffer, index + 2))
    if (++markerCount > markerCap) return limit + 1;
  let segmentCap = JPEG_BASE_SCAN_LIMIT + bytes.length / JPEG_SCAN_PER_BYTE;
  let scans = 0;
  let offset = 2;
  for (let j = 0; scans <= limit; j++) {
    if (j > segmentCap) return limit + 1;
    if (bytes[offset] !== 255) offset = bytes.indexOf(255, offset);
    if (offset === -1 || offset + 3 >= bytes.length) break;
    let a = bytes[offset + 1] ?? 0;
    if (a === 255) {
      offset++;
      continue;
    }
    if (a === 217) break;
    if (a <= 1 || (a >= 208 && a <= 216)) {
      offset += 2;
      continue;
    }
    let uInt16BE = bytes.readUInt16BE(offset + 2);
    if (a < 192 || uInt16BE < 2) return limit + 1;
    if (a >= 201 && a <= 207 && a !== 204) return limit + 1;
    if (a === 218) scans++;
    offset += 2 + uInt16BE;
  }
  return scans;
}
//@ chunk-p8kytbnw.js:3322-3519 placement
var PNG_IHDR = 1229472850;
var PNG_PLTE = 1347179589;
var PNG_TRNS = 1951551059;
var PNG_IDAT = 1229209940;
var PNG_IEND = 1229278788;
var PNG_EXIF = 1700284774;
var CRITICAL_PNG_CHUNKS = new Set([PNG_IHDR, PNG_PLTE, PNG_IDAT, PNG_IEND]);
var KEPT_ANCILLARY_PNG_CHUNKS = new Set([
  PNG_TRNS,
  1732332865,
  1665684045,
  1934772034,
  1933723988,
  1665745744,
  1766015824,
]);
var MAX_KEPT_CHUNK_BYTES = 4096;
var MAX_PNG_CHUNKS = 1e5;
//@ chunk-p8kytbnw.js:3519-3988 placement
/**
 * 去掉 PNG 的元数据块：只保留关键块与少量小的辅助块，块数过多时返回 null。
 */
function stripPngMetadata(n) {
  if (Ph(n) !== "image/png") return n;
  let e = new Set();
  let t = [[0, 8]];
  let r = 8;
  for (let j = 0; r + 12 <= n.length; j++) {
    if (j === MAX_PNG_CHUNKS) return null;
    let uInt32BE = n.readUInt32BE(r);
    let uInt32BE_2 = n.readUInt32BE(r + 4);
    let a = r + 12 + uInt32BE;
    if (a > n.length) break;
    let d =
      KEPT_ANCILLARY_PNG_CHUNKS.has(uInt32BE_2) && uInt32BE <= MAX_KEPT_CHUNK_BYTES && !e.has(uInt32BE_2);
    if (d) e.add(uInt32BE_2);
    if (CRITICAL_PNG_CHUNKS.has(uInt32BE_2) || d) {
      let last = t.at(-1);
      if (last !== undefined && last[1] === r) last[1] = a;
      else t.push([r, a]);
    }
    r = a;
    if (uInt32BE_2 === PNG_IEND) break;
  }
  let o = t[0];
  if (t.length === 1 && o !== undefined && o[1] === n.length) return n;
  return Buffer.concat(t.map(([s, i]) => n.subarray(s, i)));
}
//@ chunk-p8kytbnw.js:3988-4283 placement
/**
 * 判断 PNG 是否可能含透明：非标准文件或带 alpha 的颜色类型返回 true，否则看 IDAT 之前是否有 tRNS。
 */
function pngMayHaveTransparency(n) {
  if (Ph(n) !== "image/png" || n.length < 26 || n.readUInt32BE(8) !== 13 || n.readUInt32BE(12) !== PNG_IHDR)
    return true;
  let e = n[25];
  if (e !== 0 && e !== 2 && e !== 3) return true;
  let t = 8;
  for (let i = 0; i < 1000 && t + 8 <= n.length; i++) {
    let uInt32BE = n.readUInt32BE(t + 4);
    if (uInt32BE === PNG_TRNS) return true;
    if (uInt32BE === PNG_IDAT) return false;
    t += 12 + n.readUInt32BE(t);
  }
  return true;
}
//@ chunk-p8kytbnw.js:4283-4538 placement
/**
 * 判断 PNG 的 eXIf 块中是否带方向标签。
 */
function pngHasExifOrientation(n) {
  if (Ph(n) !== "image/png") return false;
  let e = 8;
  while (e + 8 <= n.length) {
    let uInt32BE = n.readUInt32BE(e);
    if (n.readUInt32BE(e + 4) === PNG_EXIF) {
      let chunk = n.subarray(e + 8, e + 8 + uInt32BE);
      if (chunk.includes("\x01\x12", 0, "latin1") || chunk.includes("\x12\x01", 0, "latin1")) return true;
    }
    e += 12 + uInt32BE;
  }
  return false;
}
//@ chunk-p8kytbnw.js:4538-4563 placement
var VP8X_ALPHA_FLAG = 2;
var VP8X_ANIMATION_FLAG = 16;
var VP8X_ALPHA_WRITTEN = 32;
var MAX_WEBP_CHUNKS = 1000;
//@ chunk-p8kytbnw.js:4563-4774 placement
function parseRiffChunks(n, e) {
  let t = [];
  let r = e;
  while (r + 8 <= n.length && t.length < MAX_WEBP_CHUNKS) {
    let uInt32LE = n.readUInt32LE(r + 4);
    let s = r + 8 + uInt32LE;
    if (s > n.length) return null;
    t.push({
      fourCC: n.toString("latin1", r, r + 4),
      payload: n.subarray(r + 8, s),
    });
    r = s + (uInt32LE & 1);
  }
  return t;
}
//@ chunk-p8kytbnw.js:4774-4922 placement
function buildRiffChunk(n, payload) {
  let t = Buffer.alloc(8);
  t.write(n, 0, "ascii");
  t.writeUInt32LE(payload.length, 4);
  let r = Buffer.alloc(payload.length & 1);
  return Buffer.concat([t, payload, r]);
}
//@ chunk-p8kytbnw.js:4922-5092 placement
function buildWebpContainer(n) {
  let buffer = Buffer.concat([Buffer.from("WEBP", "ascii"), ...n]);
  let t = Buffer.alloc(8);
  t.write("RIFF", 0, "ascii");
  t.writeUInt32LE(buffer.length, 4);
  return Buffer.concat([t, buffer]);
}
//@ chunk-p8kytbnw.js:5092-5256 placement
/**
 * 判断 WebP 是否为带 VP8X 扩展头且设置了动画标志的文件。
 */
function isAnimatedWebp(n) {
  return (
    n.length >= 30 &&
    n.toString("latin1", 0, 4) === "RIFF" &&
    n.toString("latin1", 8, 12) === "WEBP" &&
    n.toString("latin1", 12, 16) === "VP8X" &&
    ((n[20] ?? 0) & VP8X_ALPHA_FLAG) !== 0
  );
}
//@ chunk-p8kytbnw.js:5256-5405 placement
/**
 * 判断 WebP 是否为无损（VP8L）编码。
 */
function isLosslessWebp(n) {
  if (Ph(n) !== "image/webp") return false;
  return (
    parseRiffChunks(n, 12)?.find((t) => t.fourCC === "VP8L" || t.fourCC === "VP8 " || t.fourCC === "ANMF")
      ?.fourCC === "VP8L"
  );
}
//@ chunk-p8kytbnw.js:5405-5546 placement
/**
 * 判断 WebP 是否带 alpha 通道（VP8X 的 alpha 标志或 VP8L 头中的 alpha 位），块解析失败时视为是。
 */
function webpHasAlpha(n) {
  let riffChunks = parseRiffChunks(n, 12);
  return (
    riffChunks === null ||
    riffChunks.some(
      ({ fourCC, payload }) =>
        (fourCC === "VP8X" && ((payload[0] ?? 0) & VP8X_ANIMATION_FLAG) !== 0) ||
        (fourCC === "VP8L" && ((payload[4] ?? 0) & 16) !== 0),
    )
  );
}
//@ chunk-p8kytbnw.js:5546-6435 placement
function inspectWebpChunks(n) {
  if (!isAnimatedWebp(n)) return null;
  let min = Math.min(n.length, 8 + n.readUInt32LE(4));
  let riffChunks = parseRiffChunks(n.subarray(0, min), 12);
  let r = riffChunks?.[0];
  let found = riffChunks?.find((riffChunk) => riffChunk.fourCC === "ANMF");
  if (!r || r.payload.length < 10 || !found || found.payload.length < 16) return null;
  let s = r.payload.readUIntLE(4, 3) + 1;
  let i = r.payload.readUIntLE(7, 3) + 1;
  let payload = found.payload;
  if (
    payload.readUIntLE(0, 3) !== 0 ||
    payload.readUIntLE(3, 3) !== 0 ||
    payload.readUIntLE(6, 3) + 1 !== s ||
    payload.readUIntLE(9, 3) + 1 !== i
  )
    return null;
  let riffChunks_2 = parseRiffChunks(found.payload, 16);
  let found_2 = riffChunks_2?.find((riffChunk) => riffChunk.fourCC === "VP8 " || riffChunk.fourCC === "VP8L");
  if (!found_2) return null;
  let webpContainer = buildWebpContainer([buildRiffChunk(found_2.fourCC, found_2.payload)]);
  let webpHeader = parseWebpHeader(webpContainer);
  if (webpHeader?.width !== s || webpHeader.height !== i) return null;
  let found_3 = riffChunks?.find((riffChunk) => riffChunk.fourCC === "ICCP");
  let h =
    found_2.fourCC === "VP8 " ? riffChunks_2?.find((riffChunk) => riffChunk.fourCC === "ALPH") : undefined;
  if (!found_3 && !h) return webpContainer;
  let p = Buffer.alloc(10);
  p[0] = (found_3 ? VP8X_ALPHA_WRITTEN : 0) | (h ? VP8X_ANIMATION_FLAG : 0);
  p.writeUIntLE(s - 1, 4, 3);
  p.writeUIntLE(i - 1, 7, 3);
  return buildWebpContainer([
    buildRiffChunk("VP8X", p),
    ...(found_3 ? [buildRiffChunk("ICCP", found_3.payload)] : []),
    ...(h ? [buildRiffChunk("ALPH", h.payload)] : []),
    buildRiffChunk(found_2.fourCC, found_2.payload),
  ]);
}
export {
  MIME_TO_EXTENSION,
  parseWebpHeader,
  pngMayHaveTransparency,
  isAnimatedWebp,
  detectHtmlDocument,
  inspectWebpChunks,
  countJpegScans,
  stripPngMetadata,
  jpegSofComponentCount,
  isLosslessWebp,
  webpHasAlpha,
  pngHasExifOrientation,
  sniffDocumentType,
};
