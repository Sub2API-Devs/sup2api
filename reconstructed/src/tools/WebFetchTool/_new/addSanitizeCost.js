/**
 * tools/WebFetchTool/_new/addSanitizeCost.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4j20twbf.js (5)
 * attribution: sole-consumer-new 5
 */
import { isWithinSanitizeBudget } from "../utils.js";
import { b, z, d } from "../sanitizeListing.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isAsciiOnly, partiallySanitizeUnicode } from "../../../utils/sanitization.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";

//@ chunk-4j20twbf.js:1330-1391 sole-consumer-new
function f(e, n) {
  if (!isWithinSanitizeBudget(n)) return !1;
  return ((n.size += b), mergeClients(e, n, !0));
}
//@ chunk-4j20twbf.js:1391-1608 sole-consumer-new = mergeClients (1)
function mergeClients(e, n, t = !1, i = !1) {
  if (((n.size += z), typeof e === "string")) accountTextForSanitize(e, n, i);
  else if (Array.isArray(e)) {
    for (let r of e) if (!mergeClients(r, n)) return !1;
  } else if (isPlainObject(e)) {
    for (let key in e)
      if ((accountTextForSanitize(key, n), !mergeClients(e[key], n, !1, t && key === "name"))) return !1;
  }
  return isWithinSanitizeBudget(n);
}
//@ chunk-4j20twbf.js:1608-1679 sole-consumer-new
function accountTextForSanitize(e, n, t = !1) {
  if (((n.size += e.length), !isWithinSanitizeBudget(n) || isAsciiOnly(e))) return;
  addSanitizeCost(e, n, t);
}
//@ chunk-4j20twbf.js:1679-1907 sole-consumer-new
function addSanitizeCost(e, n, t) {
  if (t) {
    n.sixteenthsToSanitize += 16 * e.length;
    return;
  }
  n.sixteenthsToSanitize += e.length;
  for (let i = 0; i < e.length && isWithinSanitizeBudget(n); i++) {
    let code = e.charCodeAt(i);
    if (code > 127 && (n.nonAsciiUnits++ < d || getSanitizeCostTable()[code] === 1))
      n.sixteenthsToSanitize += 15;
  }
}
//@ chunk-4j20twbf.js:1907-2089 sole-consumer-new
var getSanitizeCostTable = onceExport(() => {
  let e = /[\p{M}\u1100-\u11ff\ua960-\ua97f\ud7b0-\udfff]/u;
  return Uint8Array.from({ length: 65536 }, (n, t) => {
    let fromCharCode = String.fromCharCode(t);
    return e.test(fromCharCode) || partiallySanitizeUnicode(fromCharCode) !== fromCharCode ? 1 : 0;
  });
});

export { f };
