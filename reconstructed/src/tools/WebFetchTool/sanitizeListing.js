/**
 * tools/WebFetchTool/sanitizeListing.ts
 *
 * 2.1.316 新增：目录清单清洗与截断说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4j20twbf.js (10)
 * attribution: placement 10
 */
import { MAX_STRUCTURED_RESULT_BYTES } from "../../services/mcp/mcpCallConstants.js";
import {
  recursivelySanitizeUnicode,
  isAsciiOnly,
  partiallySanitizeUnicode,
} from "../../utils/sanitization.js";
import { isWithinSanitizeBudget } from "./utils.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";

//@ chunk-4j20twbf.js:342-400 placement
/**
 * 清洗列表时允许的最大标签数（16）。
 */
var LISTING_SANITIZE_LIMITS = {
  size: MAX_STRUCTURED_RESULT_BYTES,
  textToSanitize: 1048576,
};
var LISTING_SANITIZE_MAX_TAGS = 16;
var LISTING_SANITIZE_CHUNK_CHARS = 256;
var LISTING_SANITIZE_TEXT_CAP = 65536;
//@ chunk-4j20twbf.js:400-509 placement
function createSanitizeBudget(maxSize, n) {
  return {
    size: 0,
    maxSize,
    sixteenthsToSanitize: 0,
    maxSixteenthsToSanitize: 16 * n,
    nonAsciiUnits: 0,
  };
}
//@ chunk-4j20twbf.js:509-582 placement
function createListingSanitizer(
  maxSize = LISTING_SANITIZE_LIMITS.size,
  n = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let sanitizeBudget = createSanitizeBudget(maxSize, n);
  return (i) => addSanitizeCostToClient(i, sanitizeBudget);
}
//@ chunk-4j20twbf.js:582-822 placement
/**
 * 创建流式目录清单清洗器：按大小上限只保留前约 16MB，超出时记录跳过的条目。
 */
function createStreamingListingSanitizer(
  maxSize = LISTING_SANITIZE_LIMITS.size,
  n = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let sanitizeBudget = createSanitizeBudget(maxSize, n);
  let sanitizeBudget_2 = createSanitizeBudget(maxSize, n);
  let r = false;
  return (m) => {
    let { size, sixteenthsToSanitize } = sanitizeBudget;
    if (r || !addSanitizeCostToClient(m, sanitizeBudget)) return;
    let l = recursivelySanitizeUnicode(m);
    if (sanitizeBudget.sixteenthsToSanitize === sixteenthsToSanitize) {
      sanitizeBudget_2.size += sanitizeBudget.size - size;
      r = !isWithinSanitizeBudget(sanitizeBudget_2);
    } else r = !addSanitizeCostToClient(l, sanitizeBudget_2);
    return r ? undefined : l;
  };
}
//@ chunk-4j20twbf.js:822-1240 placement
function listingTruncatedNote(e, n, t) {
  return `Skipped the last ${n} of ${t} ${e}: the listing is too large. Only about the first 16 MB of a listing is used (less if it has many small values), and only about 1 million characters that are costly to normalize: combining marks, full-width forms, emoji and the like anywhere, and a tool's or prompt's name that is not all ASCII. The server must list fewer or shorter ${e} to get them back.`;
}
//@ chunk-4j20twbf.js:1330-1391 placement
/**
 * 清洗预算足够时累加本次开销并合并客户端。
 */
function addSanitizeCostToClient(e, sanitizeBudget) {
  if (!isWithinSanitizeBudget(sanitizeBudget)) return false;
  sanitizeBudget.size += LISTING_SANITIZE_CHUNK_CHARS;
  return mergeClients(e, sanitizeBudget, true);
}
//@ chunk-4j20twbf.js:1391-1608 placement = mergeClients (1)
function mergeClients(e, n, t = false, i = false) {
  n.size += LISTING_SANITIZE_MAX_TAGS;
  if (typeof e === "string") accountTextForSanitize(e, n, i);
  else if (Array.isArray(e)) {
    for (let r of e) if (!mergeClients(r, n)) return false;
  } else if (isPlainObject(e)) {
    for (let key in e) {
      accountTextForSanitize(key, n);
      if (!mergeClients(e[key], n, false, t && key === "name")) return false;
    }
  }
  return isWithinSanitizeBudget(n);
}
//@ chunk-4j20twbf.js:1608-1679 placement
function accountTextForSanitize(e, n, t = false) {
  n.size += e.length;
  if (!isWithinSanitizeBudget(n) || isAsciiOnly(e)) return;
  addSanitizeCost(e, n, t);
}
//@ chunk-4j20twbf.js:1679-1907 placement
function addSanitizeCost(e, n, t) {
  if (t) {
    n.sixteenthsToSanitize += 16 * e.length;
    return;
  }
  n.sixteenthsToSanitize += e.length;
  for (let i = 0; i < e.length && isWithinSanitizeBudget(n); i++) {
    let code = e.charCodeAt(i);
    if (code > 127 && (n.nonAsciiUnits++ < LISTING_SANITIZE_TEXT_CAP || getSanitizeCostTable()[code] === 1))
      n.sixteenthsToSanitize += 15;
  }
}
//@ chunk-4j20twbf.js:1907-2089 placement
var getSanitizeCostTable = onceExport(() => {
  let e = /[\p{M}\u1100-\u11ff\ua960-\ua97f\ud7b0-\udfff]/u;
  return Uint8Array.from(
    {
      length: 65536,
    },
    (n, t) => {
      let i = String.fromCharCode(t);
      return e.test(i) || partiallySanitizeUnicode(i) !== i ? 1 : 0;
    },
  );
});
export { createStreamingListingSanitizer, listingTruncatedNote, createListingSanitizer };
