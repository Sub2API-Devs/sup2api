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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function createSanitizeBudget(maxSize, textToSanitize) {
  return {
    size: 0,
    maxSize,
    sixteenthsToSanitize: 0,
    maxSixteenthsToSanitize: 16 * textToSanitize,
    nonAsciiUnits: 0,
  };
}
//@ chunk-4j20twbf.js:509-582 placement
function createListingSanitizer(
  maxSize = LISTING_SANITIZE_LIMITS.size,
  textToSanitize = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let sanitizeBudget = createSanitizeBudget(maxSize, textToSanitize);
  return (client) => addSanitizeCostToClient(client, sanitizeBudget);
}
//@ chunk-4j20twbf.js:582-822 placement
/**
 * 创建流式目录清单清洗器：按大小上限只保留前约 16MB，超出时记录跳过的条目。
 */
function createStreamingListingSanitizer(
  maxSize = LISTING_SANITIZE_LIMITS.size,
  textToSanitize = LISTING_SANITIZE_LIMITS.textToSanitize,
) {
  let sanitizeBudget = createSanitizeBudget(maxSize, textToSanitize);
  let sanitizeBudget_2 = createSanitizeBudget(maxSize, textToSanitize);
  let exhausted = false;
  return (client) => {
    let { size, sixteenthsToSanitize } = sanitizeBudget;
    if (exhausted || !addSanitizeCostToClient(client, sanitizeBudget)) return;
    let sanitized = recursivelySanitizeUnicode(client);
    if (sanitizeBudget.sixteenthsToSanitize === sixteenthsToSanitize) {
      sanitizeBudget_2.size += sanitizeBudget.size - size;
      exhausted = !isWithinSanitizeBudget(sanitizeBudget_2);
    } else exhausted = !addSanitizeCostToClient(sanitized, sanitizeBudget_2);
    return exhausted ? undefined : sanitized;
  };
}
//@ chunk-4j20twbf.js:822-1240 placement
function listingTruncatedNote(noun, skippedCount, totalCount) {
  return `Skipped the last ${skippedCount} of ${totalCount} ${noun}: the listing is too large. Only about the first 16 MB of a listing is used (less if it has many small values), and only about 1 million characters that are costly to normalize: combining marks, full-width forms, emoji and the like anywhere, and a tool's or prompt's name that is not all ASCII. The server must list fewer or shorter ${noun} to get them back.`;
}
//@ chunk-4j20twbf.js:1330-1391 placement
/**
 * 清洗预算足够时累加本次开销并合并客户端。
 */
function addSanitizeCostToClient(client, budget) {
  if (!isWithinSanitizeBudget(budget)) return false;
  budget.size += LISTING_SANITIZE_CHUNK_CHARS;
  return mergeClients(client, budget, true);
}
//@ chunk-4j20twbf.js:1391-1608 placement (2.1.88 match: mergeClients, 1)
function mergeClients(value, budget, forceCost = false, isNameField = false) {
  budget.size += LISTING_SANITIZE_MAX_TAGS;
  if (typeof value === "string") accountTextForSanitize(value, budget, isNameField);
  else if (Array.isArray(value)) {
    for (let child of value) if (!mergeClients(child, budget)) return false;
  } else if (isPlainObject(value)) {
    for (let key in value) {
      accountTextForSanitize(key, budget);
      if (!mergeClients(value[key], budget, false, forceCost && key === "name")) return false;
    }
  }
  return isWithinSanitizeBudget(budget);
}
//@ chunk-4j20twbf.js:1608-1679 placement
function accountTextForSanitize(text, budget, isName = false) {
  budget.size += text.length;
  if (!isWithinSanitizeBudget(budget) || isAsciiOnly(text)) return;
  addSanitizeCost(text, budget, isName);
}
//@ chunk-4j20twbf.js:1679-1907 placement
function addSanitizeCost(text, budget, isName) {
  if (isName) {
    budget.sixteenthsToSanitize += 16 * text.length;
    return;
  }
  budget.sixteenthsToSanitize += text.length;
  for (let charIndex = 0; charIndex < text.length && isWithinSanitizeBudget(budget); charIndex++) {
    let code = text.charCodeAt(charIndex);
    if (
      code > 127 &&
      (budget.nonAsciiUnits++ < LISTING_SANITIZE_TEXT_CAP || getSanitizeCostTable()[code] === 1)
    )
      budget.sixteenthsToSanitize += 15;
  }
}
//@ chunk-4j20twbf.js:1907-2089 placement
var getSanitizeCostTable; // deferred: uses partiallySanitizeUnicode (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4j20twbf.js:1907", () => {
  getSanitizeCostTable = onceExport(() => {
    let costlyRe = /[\p{M}\u1100-\u11ff\ua960-\ua97f\ud7b0-\udfff]/u;
    return Uint8Array.from(
      {
        length: 65536,
      },
      (charCode, code) => {
        let char = String.fromCharCode(code);
        return costlyRe.test(char) || partiallySanitizeUnicode(char) !== char ? 1 : 0;
      },
    );
  });
});
export { createStreamingListingSanitizer, listingTruncatedNote, createListingSanitizer };
