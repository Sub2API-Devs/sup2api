/**
 * utils/mediaLimits.ts
 *
 * 2.1.316 新增：媒体与请求体积上限（base64/原始字节、图片边长、PDF 页数与整篇上限、按通道取限值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (6)
 * attribution: placement 6
 */
//@ chunk-t0gq9gyw.js:2230-2284 placement
/**
 * 媒体相关上限：base64 字节、PDF 分块尺寸、图片边长与模型副本阈值。
 */
var MAX_MEDIA_BASE64_BYTES = 10485760;
var PDF_TILE_WIDTH = 2000;
var PDF_TILE_HEIGHT = 2000;
var MAX_IMAGE_SIDE_PX = 3000;
var MODEL_COPY_IMAGE_BYTES = 512000;
//@ chunk-t0gq9gyw.js:2284-2438 placement
var DIRECT_MEDIA_LIMITS = {
  imageMaxRawBytes: 307200,
  wholePdfMaxRawBytes: 0,
  pdfMaxPagesPerRead: 3,
};
var RELAY_MEDIA_LIMITS = {
  imageMaxRawBytes: 512000,
  wholePdfMaxRawBytes: 2500000,
  pdfMaxPagesPerRead: 6,
};
//@ chunk-t0gq9gyw.js:2438-2565 placement
/**
 * 按发送路径（session/relay 或 bridge/direct）取媒体大小限制。
 */
function mediaLimitsForRoute(transport) {
  switch (transport) {
    case "session":
    case "relay":
      return RELAY_MEDIA_LIMITS;
    case "bridge":
    case "direct":
      return DIRECT_MEDIA_LIMITS;
    default: {
      let transport_2 = transport;
      return DIRECT_MEDIA_LIMITS;
    }
  }
}
//@ chunk-t0gq9gyw.js:2565-2575 placement
var IMAGE_TILE_SIZE_PX = 28;
//@ chunk-t0gq9gyw.js:2575-2655 placement
/**
 * 图片切块数量。
 */
function imageTileCount(width, height) {
  if (width <= 0 || height <= 0) return 0;
  return Math.ceil(width / IMAGE_TILE_SIZE_PX) * Math.ceil(height / IMAGE_TILE_SIZE_PX);
}
//@ chunk-t0gq9gyw.js:2655-2904 placement
/**
 * 图片尺寸与大小上限。
 */
var IMAGE_LIMITS = {
  maxWidth: 2000,
  maxHeight: 2000,
  maxBase64Size: 5242880,
  targetRawSize: 3932160,
};
var MAX_REQUEST_BYTES = 33554432;
var MAX_PDF_BYTES = 20971520;
var MAX_PDF_PAGES = 100;
var MAX_PERSIST_BYTES = 104857600;
var MAX_PDF_PAGES_PER_READ = 20;
var MAX_PDF_PAGES_PER_TURN = 10;
var MAX_MEDIA_ITEMS = 100;
var MAX_MEDIA_ITEMS_LARGE_CONTEXT = 600;
var MEDIA_BYTES_PER_ITEM_SLACK = 20;
var MEDIA_ITEM_COUNT_FALLBACKS = [510, 255, 127];
var MEDIA_TOTAL_BYTES_DEFAULT = 78643200;
var MEDIA_TOTAL_BYTES_ANTHROPIC = MAX_REQUEST_BYTES - 8388608;
var DOCUMENT_TOTAL_BYTES_DEFAULT = 25165824;
var MEDIA_BYTE_CAP_MIN = 10485760;
var MAX_OUTPUT_TOKENS_CAP = 64000;
export {
  MAX_MEDIA_ITEMS_LARGE_CONTEXT,
  MAX_PDF_PAGES_PER_TURN,
  MAX_PDF_PAGES_PER_READ,
  IMAGE_LIMITS,
  MAX_OUTPUT_TOKENS_CAP,
  MEDIA_BYTE_CAP_MIN,
  MEDIA_TOTAL_BYTES_ANTHROPIC,
  MEDIA_TOTAL_BYTES_DEFAULT,
  DOCUMENT_TOTAL_BYTES_DEFAULT,
  MAX_MEDIA_ITEMS,
  MEDIA_BYTES_PER_ITEM_SLACK,
  MEDIA_ITEM_COUNT_FALLBACKS,
  MODEL_COPY_IMAGE_BYTES,
  MAX_IMAGE_SIDE_PX,
  mediaLimitsForRoute,
  imageTileCount,
  MAX_PDF_PAGES,
  MAX_PDF_BYTES,
  MAX_PERSIST_BYTES,
  MAX_REQUEST_BYTES,
  PDF_TILE_WIDTH,
  PDF_TILE_HEIGHT,
  MAX_MEDIA_BASE64_BYTES,
};
