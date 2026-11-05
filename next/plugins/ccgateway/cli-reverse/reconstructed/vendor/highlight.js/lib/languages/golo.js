/**
 * highlight.js/lib/languages/golo.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:177748-178386 cjs-fingerprint
var require_golo = __commonJS(function (cjsExports, cjsModule) {
  function golo(hljs) {
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
        hljs.HASH_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: "meta",
          begin: "@[A-Za-z]+",
        },
      ],
    };
  }
  cjsModule.exports = golo;
});
export { require_golo };
