/**
 * highlight.js/lib/languages/dts.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:124117-125540 cjs-fingerprint
var require_dts = __commonJS(function (cjsExports, cjsModule) {
  function dts(hljs) {
    let STRINGS = {
      className: "string",
      variants: [
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          begin: '((u8?|U)|L)?"',
        }),
        {
          begin: '(u8?|U)?R"',
          end: '"',
          contains: [hljs.BACKSLASH_ESCAPE],
        },
        {
          begin: "'\\\\?.",
          end: "'",
          illegal: ".",
        },
      ],
    };
    let NUMBERS = {
      className: "number",
      variants: [
        {
          begin: "\\b(\\d+(\\.\\d*)?|\\.\\d+)(u|U|l|L|ul|UL|f|F)",
        },
        {
          begin: hljs.C_NUMBER_RE,
        },
      ],
      relevance: 0,
    };
    let PREPROCESSOR = {
      className: "meta",
      begin: "#",
      end: "$",
      keywords: {
        keyword: "if else elif endif define undef ifdef ifndef",
      },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0,
        },
        {
          beginKeywords: "include",
          end: "$",
          keywords: {
            keyword: "include",
          },
          contains: [
            hljs.inherit(STRINGS, {
              className: "string",
            }),
            {
              className: "string",
              begin: "<",
              end: ">",
              illegal: "\\n",
            },
          ],
        },
        STRINGS,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
      ],
    };
    let REFERENCE = {
      className: "variable",
      begin: /&[a-z\d_]*\b/,
    };
    let KEYWORD = {
      className: "keyword",
      begin: "/[a-z][a-z\\d-]*/",
    };
    let LABEL = {
      className: "symbol",
      begin: "^\\s*[a-zA-Z_][a-zA-Z\\d_]*:",
    };
    let CELL_PROPERTY = {
      className: "params",
      relevance: 0,
      begin: "<",
      end: ">",
      contains: [NUMBERS, REFERENCE],
    };
    let NODE = {
      className: "title.class",
      begin: /[a-zA-Z_][a-zA-Z\d_@-]*(?=\s\{)/,
      relevance: 0.2,
    };
    let ROOT_NODE = {
      className: "title.class",
      begin: /^\/(?=\s*\{)/,
      relevance: 10,
    };
    let ATTR_NO_VALUE = {
      match: /[a-z][a-z-,]+(?=;)/,
      relevance: 0,
      scope: "attr",
    };
    let ATTR = {
      relevance: 0,
      match: [/[a-z][a-z-,]+/, /\s*/, /=/],
      scope: {
        1: "attr",
        3: "operator",
      },
    };
    let PUNC = {
      scope: "punctuation",
      relevance: 0,
      match: /\};|[;{}]/,
    };
    return {
      name: "Device Tree",
      contains: [
        ROOT_NODE,
        REFERENCE,
        KEYWORD,
        LABEL,
        NODE,
        ATTR,
        ATTR_NO_VALUE,
        CELL_PROPERTY,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        STRINGS,
        PREPROCESSOR,
        PUNC,
        {
          begin: hljs.IDENT_RE + "::",
          keywords: "",
        },
      ],
    };
  }
  cjsModule.exports = dts;
});
export { require_dts };
