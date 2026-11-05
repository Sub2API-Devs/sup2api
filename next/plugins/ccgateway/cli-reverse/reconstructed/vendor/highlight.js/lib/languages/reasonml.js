/**
 * highlight.js/lib/languages/reasonml.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:391276-392734 cjs-fingerprint
var require_reasonml = __commonJS(function (cjsExports, cjsModule) {
  function reasonml(hljs) {
    return {
      name: "ReasonML",
      aliases: ["re"],
      keywords: {
        $pattern: /[a-z_]\w*!?/,
        keyword: [
          "and",
          "as",
          "asr",
          "assert",
          "begin",
          "class",
          "constraint",
          "do",
          "done",
          "downto",
          "else",
          "end",
          "esfun",
          "exception",
          "external",
          "for",
          "fun",
          "function",
          "functor",
          "if",
          "in",
          "include",
          "inherit",
          "initializer",
          "land",
          "lazy",
          "let",
          "lor",
          "lsl",
          "lsr",
          "lxor",
          "mod",
          "module",
          "mutable",
          "new",
          "nonrec",
          "object",
          "of",
          "open",
          "or",
          "pri",
          "pub",
          "rec",
          "sig",
          "struct",
          "switch",
          "then",
          "to",
          "try",
          "type",
          "val",
          "virtual",
          "when",
          "while",
          "with",
        ],
        built_in: [
          "array",
          "bool",
          "bytes",
          "char",
          "exn|5",
          "float",
          "int",
          "int32",
          "int64",
          "list",
          "lazy_t|5",
          "nativeint|5",
          "ref",
          "string",
          "unit",
        ],
        literal: ["true", "false"],
      },
      illegal: /(:-|:=|\$\{|\+=)/,
      contains: [
        {
          scope: "literal",
          match: /\[(\|\|)?\]|\(\)/,
          relevance: 0,
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.COMMENT(/\/\*/, /\*\//, {
          illegal: /^(#,\/\/)/,
        }),
        {
          scope: "symbol",
          match: /\'[A-Za-z_](?!\')[\w\']*/,
        },
        {
          scope: "type",
          match: /`[A-Z][\w\']*/,
        },
        {
          scope: "type",
          match: /\b[A-Z][\w\']*/,
          relevance: 0,
        },
        {
          match: /[a-z_]\w*\'[\w\']*/,
          relevance: 0,
        },
        {
          scope: "operator",
          match: /\s+(\|\||\+[\+\.]?|\*[\*\/\.]?|\/[\.]?|\.\.\.|\|>|&&|===?)\s+/,
          relevance: 0,
        },
        hljs.inherit(hljs.APOS_STRING_MODE, {
          scope: "string",
          relevance: 0,
        }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          illegal: null,
        }),
        {
          scope: "number",
          variants: [
            {
              match: /\b0[xX][a-fA-F0-9_]+[Lln]?/,
            },
            {
              match: /\b0[oO][0-7_]+[Lln]?/,
            },
            {
              match: /\b0[bB][01_]+[Lln]?/,
            },
            {
              match: /\b[0-9][0-9_]*([Lln]|(\.[0-9_]*)?([eE][-+]?[0-9_]+)?)/,
            },
          ],
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = reasonml;
});
export { require_reasonml };
