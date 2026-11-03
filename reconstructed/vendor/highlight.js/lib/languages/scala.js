/**
 * highlight.js/lib/languages/scala.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:414424-416491 cjs-fingerprint
var Ps = x(function (Wg, ks) {
  function dm(e) {
    let regex = e.regex,
      n = { className: "meta", begin: "@[A-Za-z]+" },
      a = { className: "subst", variants: [{ begin: "\\$[A-Za-z0-9_]+" }, { begin: /\$\{/, end: /\}/ }] },
      s = {
        className: "string",
        variants: [
          { begin: '"""', end: '"""' },
          { begin: '"', end: '"', illegal: "\\n", contains: [e.BACKSLASH_ESCAPE] },
          { begin: '[a-z]+"', end: '"', illegal: "\\n", contains: [e.BACKSLASH_ESCAPE, a] },
          { className: "string", begin: '[a-z]+"""', end: '"""', contains: [a], relevance: 10 },
        ],
      },
      o = { className: "type", begin: "\\b[A-Z][A-Za-z0-9_]*", relevance: 0 },
      r = {
        className: "title",
        begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
        relevance: 0,
      },
      i = {
        className: "class",
        beginKeywords: "class object trait type",
        end: /[:={\[\n;]/,
        excludeEnd: !0,
        contains: [
          e.C_LINE_COMMENT_MODE,
          e.C_BLOCK_COMMENT_MODE,
          { beginKeywords: "extends with", relevance: 10 },
          {
            begin: /\[/,
            end: /\]/,
            excludeBegin: !0,
            excludeEnd: !0,
            relevance: 0,
            contains: [o, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE],
          },
          {
            className: "params",
            begin: /\(/,
            end: /\)/,
            excludeBegin: !0,
            excludeEnd: !0,
            relevance: 0,
            contains: [o, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE],
          },
          r,
        ],
      },
      c = { className: "function", beginKeywords: "def", end: regex.lookahead(/[:={\[(\n;]/), contains: [r] },
      l = { begin: [/^\s*/, "extension", /\s+(?=[[(])/], beginScope: { 2: "keyword" } },
      d = { begin: [/^\s*/, /end/, /\s+/, /(extension\b)?/], beginScope: { 2: "keyword", 4: "keyword" } },
      m = [{ match: /\.inline\b/ }, { begin: /\binline(?=\s)/, keywords: "inline" }],
      p = { begin: [/\(\s*/, /using/, /\s+(?!\))/], beginScope: { 2: "keyword" } };
    return {
      name: "Scala",
      keywords: {
        literal: "true false null",
        keyword:
          "type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent",
      },
      contains: [
        {
          begin: ["//>", /\s+/, /using/, /\s+/, /\S+/],
          beginScope: { 1: "comment", 3: "keyword", 5: "type" },
          end: /$/,
          contains: [{ className: "string", begin: /\S+/ }],
        },
        e.C_LINE_COMMENT_MODE,
        e.C_BLOCK_COMMENT_MODE,
        s,
        o,
        c,
        i,
        e.C_NUMBER_MODE,
        l,
        d,
        ...m,
        p,
        n,
      ],
    };
  }
  ks.exports = dm;
});

export { Ps };
