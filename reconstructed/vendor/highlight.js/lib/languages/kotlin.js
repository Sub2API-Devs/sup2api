/**
 * highlight.js/lib/languages/kotlin.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:219540-222890 cjs-fingerprint
var gr = x(function (BE, Er) {
  var ue = "[0-9](_*[0-9])*",
    ye = `\\.(${ue})`,
    he = "[0-9a-fA-F](_*[0-9a-fA-F])*",
    qd = {
      className: "number",
      variants: [
        { begin: `(\\b(${ue})((${ye})|\\.)?|(${ye}))[eE][+-]?(${ue})[fFdD]?\\b` },
        { begin: `\\b(${ue})((${ye})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
        { begin: `(${ye})[fFdD]?\\b` },
        { begin: `\\b(${ue})[fFdD]\\b` },
        { begin: `\\b0[xX]((${he})\\.?|(${he})?\\.(${he}))[pP][+-]?(${ue})[fFdD]?\\b` },
        { begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b" },
        { begin: `\\b0[xX](${he})[lL]?\\b` },
        { begin: "\\b0(_*[0-7])*[lL]?\\b" },
        { begin: "\\b0[bB][01](_*[01])*[lL]?\\b" },
      ],
      relevance: 0,
    };
  function Hd(e) {
    let t = {
        keyword:
          "abstract as val var vararg get set class object open private protected public noinline crossinline dynamic final enum if else do while for when throw try catch finally import package is in fun override companion reified inline lateinit init interface annotation data sealed internal infix operator out by constructor super tailrec where const inner suspend typealias external expect actual",
        built_in: "Byte Short Char Int Long Boolean Float Double Void Unit Nothing",
        literal: "true false null",
      },
      n = {
        className: "keyword",
        begin: /\b(break|continue|return|this)\b/,
        starts: { contains: [{ className: "symbol", begin: /@\w+/ }] },
      },
      a = { className: "symbol", begin: e.UNDERSCORE_IDENT_RE + "@" },
      s = { className: "subst", begin: /\$\{/, end: /\}/, contains: [e.C_NUMBER_MODE] },
      o = { className: "variable", begin: "\\$" + e.UNDERSCORE_IDENT_RE },
      r = {
        className: "string",
        variants: [
          { begin: '"""', end: '"""(?=[^"])', contains: [o, s] },
          { begin: "'", end: "'", illegal: /\n/, contains: [e.BACKSLASH_ESCAPE] },
          { begin: '"', end: '"', illegal: /\n/, contains: [e.BACKSLASH_ESCAPE, o, s] },
        ],
      };
    s.contains.push(r);
    let i = {
        className: "meta",
        begin:
          "@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*" +
          e.UNDERSCORE_IDENT_RE +
          ")?",
      },
      c = {
        className: "meta",
        begin: "@" + e.UNDERSCORE_IDENT_RE,
        contains: [{ begin: /\(/, end: /\)/, contains: [e.inherit(r, { className: "string" }), "self"] }],
      },
      l = qd,
      COMMENT = e.COMMENT("/\\*", "\\*/", { contains: [e.C_BLOCK_COMMENT_MODE] }),
      m = {
        variants: [
          { className: "type", begin: e.UNDERSCORE_IDENT_RE },
          { begin: /\(/, end: /\)/, contains: [] },
        ],
      },
      p = m;
    return (
      (p.variants[1].contains = [m]),
      (m.variants[1].contains = [p]),
      {
        name: "Kotlin",
        aliases: ["kt", "kts"],
        keywords: t,
        contains: [
          e.COMMENT("/\\*\\*", "\\*/", {
            relevance: 0,
            contains: [{ className: "doctag", begin: "@[A-Za-z]+" }],
          }),
          e.C_LINE_COMMENT_MODE,
          COMMENT,
          n,
          a,
          i,
          c,
          {
            className: "function",
            beginKeywords: "fun",
            end: "[(]|$",
            returnBegin: !0,
            excludeEnd: !0,
            keywords: t,
            relevance: 5,
            contains: [
              {
                begin: e.UNDERSCORE_IDENT_RE + "\\s*\\(",
                returnBegin: !0,
                relevance: 0,
                contains: [e.UNDERSCORE_TITLE_MODE],
              },
              { className: "type", begin: /</, end: />/, keywords: "reified", relevance: 0 },
              {
                className: "params",
                begin: /\(/,
                end: /\)/,
                endsParent: !0,
                keywords: t,
                relevance: 0,
                contains: [
                  {
                    begin: /:/,
                    end: /[=,\/]/,
                    endsWithParent: !0,
                    contains: [m, e.C_LINE_COMMENT_MODE, COMMENT],
                    relevance: 0,
                  },
                  e.C_LINE_COMMENT_MODE,
                  COMMENT,
                  i,
                  c,
                  r,
                  e.C_NUMBER_MODE,
                ],
              },
              COMMENT,
            ],
          },
          {
            begin: [/class|interface|trait/, /\s+/, e.UNDERSCORE_IDENT_RE],
            beginScope: { 3: "title.class" },
            keywords: "class interface trait",
            end: /[:\{(]|$/,
            excludeEnd: !0,
            illegal: "extends implements",
            contains: [
              { beginKeywords: "public protected internal private constructor" },
              e.UNDERSCORE_TITLE_MODE,
              { className: "type", begin: /</, end: />/, excludeBegin: !0, excludeEnd: !0, relevance: 0 },
              { className: "type", begin: /[,:]\s*/, end: /[<\(,){\s]|$/, excludeBegin: !0, returnEnd: !0 },
              i,
              c,
            ],
          },
          r,
          {
            className: "meta",
            begin: "^#!/usr/bin/env",
            end: "$",
            illegal: `
`,
          },
          l,
        ],
      }
    );
  }
  Er.exports = Hd;
});

export { gr };
