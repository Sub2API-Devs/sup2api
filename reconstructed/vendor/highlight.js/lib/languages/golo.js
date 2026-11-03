/**
 * highlight.js/lib/languages/golo.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:177748-178386 cjs-fingerprint
var va = x(function (fE, Oa) {
  function bd(e) {
    return {
      name: "Golo",
      keywords: {
        keyword: [
          "println",
          "readln",
          "print",
          "import",
          "module",
          "function",
          "local",
          "return",
          "let",
          "var",
          "while",
          "for",
          "foreach",
          "times",
          "in",
          "case",
          "when",
          "match",
          "with",
          "break",
          "continue",
          "augment",
          "augmentation",
          "each",
          "find",
          "filter",
          "reduce",
          "if",
          "then",
          "else",
          "otherwise",
          "try",
          "catch",
          "finally",
          "raise",
          "throw",
          "orIfNull",
          "DynamicObject|10",
          "DynamicVariable",
          "struct",
          "Observable",
          "map",
          "set",
          "vector",
          "list",
          "array",
        ],
        literal: ["true", "false", "null"],
      },
      contains: [
        e.HASH_COMMENT_MODE,
        e.QUOTE_STRING_MODE,
        e.C_NUMBER_MODE,
        { className: "meta", begin: "@[A-Za-z]+" },
      ],
    };
  }
  Oa.exports = bd;
});

export { va };
