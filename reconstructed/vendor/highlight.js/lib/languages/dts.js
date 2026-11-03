/**
 * highlight.js/lib/languages/dts.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:124117-125540 cjs-fingerprint
var Fn = x(function (ju, Gn) {
  function Zl(e) {
    let t = {
        className: "string",
        variants: [
          e.inherit(e.QUOTE_STRING_MODE, { begin: '((u8?|U)|L)?"' }),
          { begin: '(u8?|U)?R"', end: '"', contains: [e.BACKSLASH_ESCAPE] },
          { begin: "'\\\\?.", end: "'", illegal: "." },
        ],
      },
      n = {
        className: "number",
        variants: [{ begin: "\\b(\\d+(\\.\\d*)?|\\.\\d+)(u|U|l|L|ul|UL|f|F)" }, { begin: e.C_NUMBER_RE }],
        relevance: 0,
      },
      a = {
        className: "meta",
        begin: "#",
        end: "$",
        keywords: { keyword: "if else elif endif define undef ifdef ifndef" },
        contains: [
          { begin: /\\\n/, relevance: 0 },
          {
            beginKeywords: "include",
            end: "$",
            keywords: { keyword: "include" },
            contains: [
              e.inherit(t, { className: "string" }),
              { className: "string", begin: "<", end: ">", illegal: "\\n" },
            ],
          },
          t,
          e.C_LINE_COMMENT_MODE,
          e.C_BLOCK_COMMENT_MODE,
        ],
      },
      s = { className: "variable", begin: /&[a-z\d_]*\b/ },
      o = { className: "keyword", begin: "/[a-z][a-z\\d-]*/" },
      r = { className: "symbol", begin: "^\\s*[a-zA-Z_][a-zA-Z\\d_]*:" },
      i = { className: "params", relevance: 0, begin: "<", end: ">", contains: [n, s] },
      c = { className: "title.class", begin: /[a-zA-Z_][a-zA-Z\d_@-]*(?=\s\{)/, relevance: 0.2 },
      l = { className: "title.class", begin: /^\/(?=\s*\{)/, relevance: 10 },
      d = { match: /[a-z][a-z-,]+(?=;)/, relevance: 0, scope: "attr" },
      m = { relevance: 0, match: [/[a-z][a-z-,]+/, /\s*/, /=/], scope: { 1: "attr", 3: "operator" } },
      p = { scope: "punctuation", relevance: 0, match: /\};|[;{}]/ };
    return {
      name: "Device Tree",
      contains: [
        l,
        s,
        o,
        r,
        c,
        m,
        d,
        i,
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        n,
        t,
        a,
        p,
        { begin: e.IDENT_RE + "::", keywords: "" },
      ],
    };
  }
  Gn.exports = Zl;
});

export { Fn };
