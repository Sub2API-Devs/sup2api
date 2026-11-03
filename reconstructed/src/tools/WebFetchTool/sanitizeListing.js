/**
 * tools/WebFetchTool/sanitizeListing.ts
 *
 * 2.1.316 新增：目录清单清洗与截断说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4j20twbf.js (5)
 * attribution: placement 5
 */
import { z2 } from "../../services/mcp/mcpCallConstants.js";
import { f } from "./_new/addSanitizeCost.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { isWithinSanitizeBudget } from "./utils.js";

//@ chunk-4j20twbf.js:342-400 placement
var LISTING_SANITIZE_LIMITS = { size: z2, textToSanitize: 1048576 },
  z = 16,
  b = 256,
  d = 65536;
//@ chunk-4j20twbf.js:400-509 placement
function createSanitizeBudget(e, n) {
  return { size: 0, maxSize: e, sixteenthsToSanitize: 0, maxSixteenthsToSanitize: 16 * n, nonAsciiUnits: 0 };
}
//@ chunk-4j20twbf.js:509-582 placement
function createListingSanitizer(
  e = LISTING_SANITIZE_LIMITS.size,
  n = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let t = createSanitizeBudget(e, n);
  return (i) => f(i, t);
}
/**
 * 创建流式目录清单清洗器：按大小上限只保留前约 16MB，超出时记录跳过的条目。
 */
//@ chunk-4j20twbf.js:582-822 placement
function createStreamingListingSanitizer(
  e = LISTING_SANITIZE_LIMITS.size,
  n = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let t = createSanitizeBudget(e, n),
    i = createSanitizeBudget(e, n),
    r = !1;
  return (m) => {
    let { size: size, sixteenthsToSanitize: sixteenthsToSanitize } = t;
    if (r || !f(m, t)) return;
    let l = recursivelySanitizeUnicode(m);
    if (t.sixteenthsToSanitize === sixteenthsToSanitize)
      ((i.size += t.size - size), (r = !isWithinSanitizeBudget(i)));
    else r = !f(l, i);
    return r ? void 0 : l;
  };
}
//@ chunk-4j20twbf.js:822-1240 placement
function listingTruncatedNote(e, n, t) {
  return `Skipped the last ${n} of ${t} ${e}: the listing is too large. Only about the first 16 MB of a listing is used (less if it has many small values), and only about 1 million characters that are costly to normalize: combining marks, full-width forms, emoji and the like anywhere, and a tool's or prompt's name that is not all ASCII. The server must list fewer or shorter ${e} to get them back.`;
}

export { createStreamingListingSanitizer, listingTruncatedNote, createListingSanitizer, b, z, d };
