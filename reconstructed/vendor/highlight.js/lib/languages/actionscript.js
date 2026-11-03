/**
 * highlight.js/lib/languages/actionscript.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:1742-3199 cjs-fingerprint
var at = x(function (cu, nt) {
  function zc(e) {
    let regex = e.regex,
      n = /[a-zA-Z_$][a-zA-Z0-9_$]*/,
      combined = regex.concat(n, regex.concat("(\\.", n, ")*")),
      s = /([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)/,
      o = { className: "rest_arg", begin: /[.]{3}/, end: n, relevance: 10 };
    return {
      name: "ActionScript",
      aliases: ["as"],
      keywords: {
        keyword: [
          "as",
          "break",
          "case",
          "catch",
          "class",
          "const",
          "continue",
          "default",
          "delete",
          "do",
          "dynamic",
          "each",
          "else",
          "extends",
          "final",
          "finally",
          "for",
          "function",
          "get",
          "if",
          "implements",
          "import",
          "in",
          "include",
          "instanceof",
          "interface",
          "internal",
          "is",
          "namespace",
          "native",
          "new",
          "override",
          "package",
          "private",
          "protected",
          "public",
          "return",
          "set",
          "static",
          "super",
          "switch",
          "this",
          "throw",
          "try",
          "typeof",
          "use",
          "var",
          "void",
          "while",
          "with",
        ],
        literal: ["true", "false", "null", "undefined"],
      },
      contains: [
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        e.C_NUMBER_MODE,
        { match: [/\bpackage/, /\s+/, combined], className: { 1: "keyword", 3: "title.class" } },
        {
          match: [/\b(?:class|interface|extends|implements)/, /\s+/, n],
          className: { 1: "keyword", 3: "title.class" },
        },
        {
          className: "meta",
          beginKeywords: "import include",
          end: /;/,
          keywords: { keyword: "import include" },
        },
        {
          beginKeywords: "function",
          end: /[{;]/,
          excludeEnd: !0,
          illegal: /\S/,
          contains: [
            e.inherit(e.TITLE_MODE, { className: "title.function" }),
            {
              className: "params",
              begin: /\(/,
              end: /\)/,
              contains: [
                e.APOS_STRING_MODE,
                e.QUOTE_STRING_MODE,
                e.C_LINE_COMMENT_MODE,
                e.C_BLOCK_COMMENT_MODE,
                o,
              ],
            },
            { begin: regex.concat(/:\s*/, s) },
          ],
        },
        e.METHOD_GUARD,
      ],
      illegal: /#/,
    };
  }
  nt.exports = zc;
});

export { at };
