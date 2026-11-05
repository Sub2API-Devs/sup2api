/**
 * highlight.js/lib/languages/clean.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:64611-65209 cjs-fingerprint
var require_clean = __commonJS(function (cjsExports, cjsModule) {
  function clean(hljs) {
    return {
      name: "Clean",
      aliases: ["icl", "dcl"],
      keywords: {
        keyword: [
          "if",
          "let",
          "in",
          "with",
          "where",
          "case",
          "of",
          "class",
          "instance",
          "otherwise",
          "implementation",
          "definition",
          "system",
          "module",
          "from",
          "import",
          "qualified",
          "as",
          "special",
          "code",
          "inline",
          "foreign",
          "export",
          "ccall",
          "stdcall",
          "generic",
          "derive",
          "infix",
          "infixl",
          "infixr",
        ],
        built_in: "Int Real Char Bool",
        literal: "True False",
      },
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          begin: "->|<-[|:]?|#!?|>>=|\\{\\||\\|\\}|:==|=:|<>",
        },
      ],
    };
  }
  cjsModule.exports = clean;
});
export { require_clean };
