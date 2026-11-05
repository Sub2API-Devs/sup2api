/**
 * utils/bash/shellQuote.ts
 *
 * shell-quote 风格的回退参数提取（tryParseShellCommand）；另混入 lodash isSymbol 等被误归代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/shellQuote.ts
 * pieces: chunk-4z1ntdgk.js (1), chunk-pjaz7mpk.js (2)
 * attribution: fingerprint 2, affinity 1
 */
import { import_isObjectLike } from "../../../vendor/lodash-es/toString.js";
import { baseGetTagExport } from "../../../vendor/lodash-es/_baseGetTag.js";

//@ chunk-pjaz7mpk.js:314-338 affinity
var SYMBOL_TAG = "[object Symbol]";
//@ chunk-pjaz7mpk.js:338-396 fingerprint (2.1.88 match: tryQuoteShellArgs, 0.743)
function isSymbol(args) {
  return typeof args == "symbol" || (import_isObjectLike(args) && baseGetTagExport(args) == SYMBOL_TAG);
}
//@ chunk-4z1ntdgk.js:51969-52032 fingerprint (2.1.88 match: quote, 1)
function quote(args) {
  return !args.quoted && (args.text === "[[" || args.text === "]]");
}
export { quote, isSymbol };
