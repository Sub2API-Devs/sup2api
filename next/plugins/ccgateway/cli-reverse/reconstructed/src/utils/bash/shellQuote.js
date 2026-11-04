/**
 * utils/bash/shellQuote.ts
 *
 * shell-quote 风格的回退参数提取（tryParseShellCommand）；另混入 lodash isSymbol 等被误归代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/shellQuote.ts
 * pieces: chunk-byv2e1t5.js (2), chunk-mthxbav8.js (1)
 * attribution: affinity 1, fingerprint 2
 */
import { import_isObjectLike } from "../../../vendor/lodash-es/toString.js";
import { baseGetTagExport } from "../../../vendor/lodash-es/_baseGetTag.js";

//@ chunk-byv2e1t5.js:314-338 affinity
var SYMBOL_TAG = "[object Symbol]";
//@ chunk-byv2e1t5.js:338-396 fingerprint = tryQuoteShellArgs (0.737)
function isSymbol(args) {
  return typeof args == "symbol" || (import_isObjectLike(args) && baseGetTagExport(args) == SYMBOL_TAG);
}
//@ chunk-mthxbav8.js:87504-87620 fingerprint = quote (0.636)
/**
 * 取 ~ 之后的操作数：同一词里有后缀则用后缀，否则用下一个词的文本，并标记是否按字面处理（下一个词带引号）。旧版名 quote 误配。
 */
function tildeOperandAt(words, literalText, wordIndex) {
  return literalText !== ""
    ? {
        value: literalText,
        tildeLiteral: true,
      }
    : {
        value: words[wordIndex + 1]?.text ?? "",
        tildeLiteral: words[wordIndex + 1]?.quoted ?? false,
      };
}
export { isSymbol, tildeOperandAt };
