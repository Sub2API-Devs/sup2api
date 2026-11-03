/**
 * highlight.js/lib/languages/clean.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:64611-65209 cjs-fingerprint
var Xt = x(function (Du, Yt) {
  function ul(e) {
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
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        e.C_NUMBER_MODE,
        { begin: "->|<-[|:]?|#!?|>>=|\\{\\||\\|\\}|:==|=:|<>" },
      ],
    };
  }
  Yt.exports = ul;
});

export { Xt };
